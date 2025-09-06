import { Test } from '@nestjs/testing';
import { RoomsGateway } from './rooms.gateway';
import { RoomsService } from './rooms.service';
import type { Room } from '@scrum-poker/shared-types';

describe('RoomsGateway', () => {
  let gateway: RoomsGateway;
  let rooms: jest.Mocked<RoomsService>;

  const makeRoom = (id = 'ABCD-1234'): Room => ({
    id,
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    participants: [],
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        RoomsGateway,
        {
          provide: RoomsService,
          useValue: {
            get: jest.fn(),
            addParticipant: jest.fn(),
            removeParticipant: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = moduleRef.get(RoomsGateway);
    rooms = moduleRef.get(RoomsService) as jest.Mocked<RoomsService>;

    // Inject a mock Socket.IO server into the gateway
    const toEmit = jest.fn();
    const to = jest.fn(() => ({ emit: toEmit }));
    // @ts-expect-error assigning test double
    gateway.server = { to };
  });

  it('handleJoin adds participant and broadcasts state', () => {
    const room = makeRoom('ROOM1');
    rooms.get.mockReturnValue(room);
    const updated: Room = { ...room, participants: [{ id: 's1', name: 'Alice', role: 'player' as const }] };
    rooms.addParticipant.mockReturnValue(updated);

    const client: any = { id: 's1', join: jest.fn(), emit: jest.fn() };

    gateway.handleJoin({ roomId: 'ROOM1', name: 'Alice' }, client);

    expect(client.join).toHaveBeenCalledWith('room:ROOM1');
    expect(rooms.addParticipant).toHaveBeenCalledWith('ROOM1', {
      id: 's1',
      name: 'Alice',
      role: 'player',
    });
    const toMock = (gateway as any).server.to as jest.Mock;
    const toEmit = toMock.mock.results[0].value.emit as jest.Mock;
    expect(toMock).toHaveBeenCalledWith('room:ROOM1');
    expect(toEmit).toHaveBeenCalledWith('room:state', updated);
  });

  it('handleJoin emits error when room missing', () => {
    rooms.get.mockReturnValue(undefined as any);
    const client: any = { id: 's2', join: jest.fn(), emit: jest.fn() };

    gateway.handleJoin({ roomId: 'MISSING', name: 'Bob' }, client);

    expect(client.emit).toHaveBeenCalledWith(
      'room:error',
      expect.objectContaining({ code: 'invalid_room' })
    );
    expect(client.join).not.toHaveBeenCalled();
    expect(rooms.addParticipant).not.toHaveBeenCalled();
  });

  it('handleJoin emits error when payload invalid', () => {
    const client: any = { id: 's3', join: jest.fn(), emit: jest.fn() };
    gateway.handleJoin({ roomId: '', name: '' } as any, client);
    expect(client.emit).toHaveBeenCalledWith(
      'room:error',
      expect.objectContaining({ code: 'invalid_payload' })
    );
  });

  it('handleDisconnect removes participant and broadcasts', () => {
    // First join to map socket to room
    const room = makeRoom('ROOMX');
    rooms.get.mockReturnValue(room);
    const afterJoin: Room = { ...room, participants: [{ id: 'sock', name: 'Eve', role: 'player' as const }] };
    rooms.addParticipant.mockReturnValue(afterJoin);

    const client: any = { id: 'sock', join: jest.fn(), emit: jest.fn() };
    gateway.handleJoin({ roomId: 'ROOMX', name: 'Eve' }, client);

    // Now disconnect
    const afterRemove = { ...room, participants: [] };
    rooms.removeParticipant.mockReturnValue(afterRemove);

    gateway.handleDisconnect(client);

    expect(rooms.removeParticipant).toHaveBeenCalledWith('ROOMX', 'sock');
    const toMock = (gateway as any).server.to as jest.Mock;
    const toEmit = toMock.mock.results[toMock.mock.results.length - 1].value.emit as jest.Mock;
    expect(toMock).toHaveBeenCalledWith('room:ROOMX');
    expect(toEmit).toHaveBeenCalledWith('room:state', afterRemove);
  });

  it('handleDisconnect does nothing if no room mapping', () => {
    const client: any = { id: 'unknown', join: jest.fn(), emit: jest.fn() };
    gateway.handleDisconnect(client);
    expect(rooms.removeParticipant).not.toHaveBeenCalled();
    const toMock = (gateway as any).server.to as jest.Mock;
    expect(toMock).not.toHaveBeenCalled();
  });

  it('host disconnect inserts placeholder to preserve host on reload', () => {
    const room = makeRoom('ROOMH');
    room.participants = [
      { id: 'host-sock', name: 'Hannah', role: 'host' },
    ];
    rooms.get.mockReturnValue(room);
    rooms.removeParticipant.mockImplementation((_roomId: string, pid: string) => {
      room.participants = room.participants.filter((p) => p.id !== pid);
      return room;
    });
    rooms.addParticipant.mockImplementation((_roomId: string, p: any) => {
      // mimic service behavior of replacing host entries
      room.participants = room.participants.filter((x) => x.role !== 'host');
      room.participants.push(p);
      return room;
    });

    const client: any = { id: 'host-sock', join: jest.fn(), emit: jest.fn() };
    // Map socket to room and disconnect
    (gateway as any).socketRoom.set('host-sock', 'ROOMH');
    gateway.handleDisconnect(client);

    expect(rooms.removeParticipant).toHaveBeenCalledWith('ROOMH', 'host-sock');
    expect(rooms.addParticipant).toHaveBeenCalledWith('ROOMH', { id: 'host', name: 'Hannah', role: 'host' });
  });

  it('observer cannot cast vote', () => {
    const room = makeRoom('ROOM1');
    room.participants = [
      { id: 'obs', name: 'Olivia', role: 'observer' },
    ];
    rooms.get.mockReturnValue(room);
    const client: any = { id: 'obs', join: jest.fn(), emit: jest.fn() };
    // Map socket to room without going through join (role would be player otherwise)
    (gateway as any).socketRoom.set('obs', 'ROOM1');

    gateway.handleVoteCast({ value: '5' } as any, client);

    // Should emit forbidden error and not broadcast state
    expect(client.emit).toHaveBeenCalledWith(
      'room:error',
      expect.objectContaining({ code: 'forbidden' })
    );
    const toMock = (gateway as any).server.to as jest.Mock;
    expect(toMock).not.toHaveBeenCalledWith('room:ROOM1');
  });

  it('non-host cannot reveal', () => {
    const room = makeRoom('ROOMX');
    room.participants = [
      { id: 'p1', name: 'Paula', role: 'player' },
    ];
    rooms.get.mockReturnValue(room);
    const client: any = { id: 'p1', join: jest.fn(), emit: jest.fn() };
    (gateway as any).socketRoom.set('p1', 'ROOMX');

    gateway.handleVoteReveal({} as any, client);

    expect(client.emit).toHaveBeenCalledWith(
      'room:error',
      expect.objectContaining({ code: 'forbidden' })
    );
    const toMock = (gateway as any).server.to as jest.Mock;
    expect(toMock).not.toHaveBeenCalledWith('room:ROOMX');
  });
});
