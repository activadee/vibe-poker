import { Test } from '@nestjs/testing';
import { RoomsGateway } from './rooms.gateway';
import { RoomsService } from './rooms.service';
import { PerfService } from '../perf/perf.service';
import { LoggingService } from '../logging/logging.service';
import type { Room } from '@scrum-poker/shared-types';

describe('RoomsGateway logging', () => {
  let gateway: RoomsGateway;
  let logging: { event: jest.Mock };
  let rooms: jest.Mocked<RoomsService>;
  let toEmit: jest.Mock;

  const makeRoom = (id = 'ROOM1'): Room => ({ id, createdAt: Date.now(), expiresAt: Date.now() + 1000, participants: [] });

  beforeEach(async () => {
    logging = { event: jest.fn() } as any;

    const moduleRef = await Test.createTestingModule({
      providers: [
        RoomsGateway,
        { provide: LoggingService, useValue: logging },
        {
          provide: PerfService,
          useValue: {
            start: () => () => 1.23,
            inc: (_name: string, _delta?: number) => undefined,
          },
        },
        {
          provide: RoomsService,
          useValue: {
            get: jest.fn(),
            getOwner: jest.fn(),
            addParticipant: jest.fn(),
            removeParticipant: jest.fn(),
            castVote: jest.fn(),
            reset: jest.fn(),
            computeProgress: jest.fn(),
            computeStats: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = moduleRef.get(RoomsGateway);
    rooms = moduleRef.get(RoomsService) as jest.Mocked<RoomsService>;

    toEmit = jest.fn();
    const to = jest.fn(() => ({ emit: toEmit }));
    // @ts-expect-error test double
    gateway.server = { to };
  });

  it('logs room_join with correlation and latency', async () => {
    const room = makeRoom('ROOM1');
    rooms.get.mockResolvedValue(room);
    rooms.addParticipant.mockResolvedValue({ ...room, participants: [{ id: 's1', name: 'Alice', role: 'player' as const }] });
    rooms.computeProgress.mockReturnValue({ count: 0, total: 1, votedIds: [] });

    const client: any = { id: 's1', join: jest.fn(), emit: jest.fn(), request: { session: { uid: 'owner-1' } }, handshake: { headers: { 'x-correlation-id': 'CID-WS-1' } } };
    await gateway.handleJoin({ roomId: 'ROOM1', name: 'Alice' } as any, client);

    const call = logging.event.mock.calls.find((c) => c[0] === 'room_join');
    expect(call).toBeDefined();
    expect(call?.[1]).toEqual(expect.objectContaining({ room_id: 'ROOM1', socket_id: 's1' }));
    expect(call?.[2]).toEqual(expect.objectContaining({ correlationId: 'CID-WS-1' }));
    expect(call?.[2].latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('logs vote_reveal with correlation and latency', async () => {
    const room = makeRoom('ROOMX');
    room.participants = [{ id: 'h1', name: 'Hannah', role: 'host' }];
    rooms.get.mockResolvedValue(room);
    rooms.setRevealed = jest.fn().mockResolvedValue({ ...room, revealed: true }) as any;
    rooms.computeProgress.mockReturnValue({ count: 0, total: 1, votedIds: [] });

    // Map host socket
    (gateway as any).socketRoom.set('h1', 'ROOMX');
    const host: any = { id: 'h1', join: jest.fn(), emit: jest.fn(), handshake: { headers: {} }, request: { session: {} } };

    await gateway.handleVoteReveal({} as any, host);

    const call = logging.event.mock.calls.find((c) => c[0] === 'vote_reveal');
    expect(call).toBeDefined();
    expect(call?.[1]).toEqual(expect.objectContaining({ room_id: 'ROOMX', socket_id: 'h1' }));
    expect(call?.[2].latencyMs).toBeGreaterThanOrEqual(0);
  });
});
