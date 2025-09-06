import { Test } from '@nestjs/testing';
import { RoomsGateway } from './rooms.gateway';
import { RoomsService } from './rooms.service';
import type { Room } from '@scrum-poker/shared-types';

describe('RoomsGateway', () => {
  let gateway: RoomsGateway;
  let rooms: jest.Mocked<RoomsService>;
  let toEmit: jest.Mock;

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
            castVote: jest.fn(),
            computeProgress: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = moduleRef.get(RoomsGateway);
    rooms = moduleRef.get(RoomsService) as jest.Mocked<RoomsService>;

    // Inject a mock Socket.IO server into the gateway
    toEmit = jest.fn();
    const to = jest.fn(() => ({ emit: toEmit }));
    // @ts-expect-error assigning test double
    gateway.server = { to };
  });

  it('handleJoin adds participant and broadcasts state', () => {
    const room = makeRoom('ROOM1');
    rooms.get.mockReturnValue(room);
    const updated: Room = { ...room, participants: [{ id: 's1', name: 'Alice', role: 'player' as const }] };
    rooms.addParticipant.mockReturnValue(updated);
    rooms.computeProgress.mockImplementation((r: Room) => {
      const eligible = (r.participants ?? []).filter((p) => p.role === 'player' || p.role === 'host');
      const votedIds = Object.keys(r.votes ?? {}).filter((id) => eligible.some((p) => p.id === id));
      return { count: votedIds.length, total: eligible.length, votedIds };
    });

    const client: any = { id: 's1', join: jest.fn(), emit: jest.fn() };

    gateway.handleJoin({ roomId: 'ROOM1', name: 'Alice' }, client);

    expect(client.join).toHaveBeenCalledWith('room:ROOM1');
    expect(rooms.addParticipant).toHaveBeenCalledWith('ROOM1', {
      id: 's1',
      name: 'Alice',
      role: 'player',
    });
    const toMock = (gateway as any).server.to as jest.Mock;
    expect(toMock).toHaveBeenCalledWith('room:ROOM1');
    expect(toEmit).toHaveBeenCalledWith('room:state', updated);
    // Also emits vote progress with 0 of 1
    expect(toEmit).toHaveBeenCalledWith('vote:progress', { count: 0, total: 1, votedIds: [] });
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

  it('broadcasts vote progress on cast without leaking room:state', () => {
    const room = makeRoom('ROOM1');
    room.participants = [
      { id: 'p1', name: 'Alice', role: 'player' },
      { id: 'obs', name: 'Olivia', role: 'observer' },
    ];
    rooms.get.mockReturnValue(room);
    rooms.castVote.mockImplementation((roomId: string, pid: string, v: string) => {
      if (room.id !== roomId) throw new Error('wrong room');
      room.votes = room.votes ?? {};
      room.votes[pid] = v;
      return room;
    });
    rooms.computeProgress.mockImplementation((r: Room) => {
      const eligible = (r.participants ?? []).filter((p) => p.role === 'player' || p.role === 'host');
      const votedIds = Object.keys(r.votes ?? {}).filter((id) => eligible.some((p) => p.id === id));
      return { count: votedIds.length, total: eligible.length, votedIds };
    });

    // Map socket to room
    (gateway as any).socketRoom.set('p1', 'ROOM1');
    const client: any = { id: 'p1', join: jest.fn(), emit: jest.fn() };

    gateway.handleVoteCast({ value: '5' } as any, client);

    // Should broadcast only progress with 1/1 (only players counted)
    expect(toEmit).toHaveBeenCalledWith('vote:progress', {
      count: 1,
      total: 1,
      votedIds: ['p1'],
    });
    // No room:state emitted on cast
    expect(toEmit.mock.calls.some((c: any[]) => c[0] === 'room:state')).toBe(false);
  });

  it('room:state omits votes before reveal and includes after reveal', () => {
    const room = makeRoom('ROOMZ');
    room.participants = [
      { id: 'h1', name: 'Hannah', role: 'host' },
      { id: 'p1', name: 'Alice', role: 'player' },
    ];
    room.votes = { p1: '5', h1: '8' } as any;
    room.revealed = false;
    rooms.get.mockReturnValue(room);

    // Map socket to room as host
    (gateway as any).socketRoom.set('h1', 'ROOMZ');
    const host: any = { id: 'h1', join: jest.fn(), emit: jest.fn() };

    // Trigger a state broadcast via story:set (host-only)
    gateway.handleStorySet({ story: 'XYZ' } as any, host);
    const stateBefore = toEmit.mock.calls.find((c: any[]) => c[0] === 'room:state')?.[1];
    expect(stateBefore).toBeDefined();
    expect('votes' in stateBefore).toBe(false);

    // Now reveal and expect votes to be present
    gateway.handleVoteReveal({} as any, host);
    const stateAfter = toEmit.mock.calls.filter((c: any[]) => c[0] === 'room:state').pop()?.[1];
    expect(stateAfter).toBeDefined();
    expect(stateAfter.votes).toEqual(room.votes);
  });
});
