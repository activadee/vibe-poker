/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
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
            remove: jest.fn(),
            castVote: jest.fn(),
            reset: jest.fn(),
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

  it('handleJoin honors requested observer role (not counted in progress)', () => {
    const room = makeRoom('ROOMOBS');
    rooms.get.mockReturnValue(room);
    const updated: Room = { ...room, participants: [{ id: 'o1', name: 'Olivia', role: 'observer' as const }] };
    rooms.addParticipant.mockReturnValue(updated);
    rooms.computeProgress.mockImplementation((r: Room) => {
      const eligible = (r.participants ?? []).filter((p) => p.role === 'player' || p.role === 'host');
      const votedIds = Object.keys(r.votes ?? {}).filter((id) => eligible.some((p) => p.id === id));
      return { count: votedIds.length, total: eligible.length, votedIds };
    });

    const client: any = { id: 'o1', join: jest.fn(), emit: jest.fn() };
    gateway.handleJoin({ roomId: 'ROOMOBS', name: 'Olivia', role: 'observer' } as any, client);

    expect(rooms.addParticipant).toHaveBeenCalledWith('ROOMOBS', { id: 'o1', name: 'Olivia', role: 'observer' });
    // Progress excludes observers
    expect(toEmit).toHaveBeenCalledWith('vote:progress', { count: 0, total: 0, votedIds: [] });
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

  it('handleJoin emits expired error when room TTL passed', () => {
    const expiredRoom = makeRoom('OLD1');
    expiredRoom.expiresAt = Date.now() - 1000;
    rooms.get.mockReturnValue(expiredRoom);
    const client: any = { id: 's9', join: jest.fn(), emit: jest.fn() };

    gateway.handleJoin({ roomId: 'OLD1', name: 'Zoe' }, client);

    expect(rooms.remove).toHaveBeenCalledWith('OLD1');
    expect(client.emit).toHaveBeenCalledWith(
      'room:error',
      expect.objectContaining({ code: 'expired' })
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

  it('room:state omits votes/stats before reveal and includes votes + stats after reveal', () => {
    const room = makeRoom('ROOMZ');
    room.participants = [
      { id: 'h1', name: 'Hannah', role: 'host' },
      { id: 'p1', name: 'Alice', role: 'player' },
    ];
    room.votes = { p1: '5', h1: '8' } as any;
    room.revealed = false;
    rooms.get.mockReturnValue(room);
    rooms.computeProgress.mockReturnValue({ count: 0, total: 2, votedIds: [] });
    rooms.castVote.mockImplementation(() => room);
    rooms.addParticipant.mockImplementation((_id: string, _p: any) => room);
    rooms.computeStats = jest.fn().mockImplementation((r: Room) => {
      const nums = Object.values(r.votes ?? {})
        .map((v) => Number(v))
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => a - b);
      const round1 = (x: number) => Math.round(x * 10) / 10;
      const mid = Math.floor(nums.length / 2);
      const median = nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
      const avg = nums.reduce((a, n) => a + n, 0) / (nums.length || 1);
      return { avg: round1(avg), median: round1(median) };
    }) as any;

    // Map socket to room as host
    (gateway as any).socketRoom.set('h1', 'ROOMZ');
    const host: any = { id: 'h1', join: jest.fn(), emit: jest.fn() };

    // Trigger a state broadcast via story:set (host-only)
    gateway.handleStorySet({ story: { id: 'S-x', title: 'XYZ' } } as any, host);
    const stateBefore = toEmit.mock.calls.find((c: any[]) => c[0] === 'room:state')?.[1];
    expect(stateBefore).toBeDefined();
    expect('votes' in stateBefore).toBe(false);
    expect('stats' in stateBefore).toBe(false);

    // Now reveal and expect votes to be present
    gateway.handleVoteReveal({} as any, host);
    const stateAfter = toEmit.mock.calls.filter((c: any[]) => c[0] === 'room:state').pop()?.[1];
    expect(stateAfter).toBeDefined();
    expect(stateAfter.votes).toEqual(room.votes);
    expect(stateAfter.stats).toEqual({ avg: 6.5, median: 6.5 });
  });

  it('host can reset votes: broadcasts hidden state and 0/Y progress', () => {
    const room = makeRoom('ROOMR');
    room.participants = [
      { id: 'h1', name: 'Hannah', role: 'host' },
      { id: 'p1', name: 'Alice', role: 'player' },
    ];
    room.votes = { p1: '5', h1: '8' } as any;
    room.revealed = true;

    rooms.get.mockReturnValue(room);
    rooms.reset.mockImplementation((roomId: string) => {
      if (roomId !== 'ROOMR') throw new Error('wrong room');
      room.revealed = false;
      room.votes = {} as any;
      // stats removed implicitly
      delete (room as any).stats;
      return room;
    });
    rooms.computeProgress.mockImplementation((r: Room) => {
      const eligible = (r.participants ?? []).filter((p) => p.role === 'player' || p.role === 'host');
      const votedIds = Object.keys(r.votes ?? {}).filter((id) => eligible.some((p) => p.id === id));
      return { count: votedIds.length, total: eligible.length, votedIds };
    });

    // Map socket to room as host
    (gateway as any).socketRoom.set('h1', 'ROOMR');
    const host: any = { id: 'h1', join: jest.fn(), emit: jest.fn() };

    gateway.handleVoteReset({} as any, host);

    // Expect state broadcast with hidden votes and revealed=false
    const state = toEmit.mock.calls.find((c: any[]) => c[0] === 'room:state')?.[1];
    expect(state).toBeDefined();
    expect('votes' in state).toBe(false);
    expect('stats' in state).toBe(false);
    expect(state.revealed).toBe(false);
    // And progress reset to 0/2
    expect(toEmit).toHaveBeenCalledWith('vote:progress', { count: 0, total: 2, votedIds: [] });
  });

  it('non-host cannot reset', () => {
    const room = makeRoom('ROOMR2');
    room.participants = [
      { id: 'p1', name: 'Paula', role: 'player' },
    ];
    rooms.get.mockReturnValue(room);
    (gateway as any).socketRoom.set('p1', 'ROOMR2');
    const client: any = { id: 'p1', join: jest.fn(), emit: jest.fn() };

    gateway.handleVoteReset({} as any, client);

    expect(client.emit).toHaveBeenCalledWith(
      'room:error',
      expect.objectContaining({ code: 'forbidden' })
    );
    // Should not broadcast to room
    const toMock = (gateway as any).server.to as jest.Mock;
    expect(toMock).not.toHaveBeenCalledWith('room:ROOMR2');
  });

  it('non-host cannot set story', () => {
    const room = makeRoom('ROOMS');
    room.participants = [
      { id: 'p1', name: 'Paula', role: 'player' },
    ];
    rooms.get.mockReturnValue(room);
    (gateway as any).socketRoom.set('p1', 'ROOMS');
    const client: any = { id: 'p1', join: jest.fn(), emit: jest.fn() };

    gateway.handleStorySet({ story: { id: 'S-1', title: 'A' } } as any, client);

    expect(client.emit).toHaveBeenCalledWith(
      'room:error',
      expect.objectContaining({ code: 'forbidden' })
    );
    const toMock = (gateway as any).server.to as jest.Mock;
    expect(toMock).not.toHaveBeenCalledWith('room:ROOMS');
  });

  it('story:set validates payload and broadcasts on success', () => {
    const room = makeRoom('ROOMS2');
    room.participants = [
      { id: 'h1', name: 'Hannah', role: 'host' },
    ];
    rooms.get.mockReturnValue(room);
    (gateway as any).socketRoom.set('h1', 'ROOMS2');
    const host: any = { id: 'h1', join: jest.fn(), emit: jest.fn() };

    // invalid: empty title
    gateway.handleStorySet({ story: { id: 'S-1', title: '' } } as any, host);
    expect(host.emit).toHaveBeenCalledWith(
      'room:error',
      expect.objectContaining({ code: 'invalid_payload' })
    );

    // valid
    gateway.handleStorySet({ story: { id: 'S-1', title: 'Feature A', notes: 'Some notes' } } as any, host);
    const toMock = (gateway as any).server.to as jest.Mock;
    expect(toMock).toHaveBeenCalledWith('room:ROOMS2');
    const state = toEmit.mock.calls.find((c: any[]) => c[0] === 'room:state')?.[1];
    expect(state.story).toEqual({ id: 'S-1', title: 'Feature A', notes: 'Some notes' });
  });

  it('rate limits per-socket on vote:cast (excess dropped)', () => {
    const room = makeRoom('ROOMRL1');
    room.participants = [
      { id: 'p1', name: 'Alice', role: 'player' },
    ];
    rooms.get.mockReturnValue(room);
    rooms.castVote.mockImplementation((roomId: string, pid: string, v: string) => {
      room.votes = room.votes ?? {};
      room.votes[pid] = v;
      return room;
    });
    rooms.computeProgress.mockImplementation((r: Room) => {
      const eligible = (r.participants ?? []).filter((p) => p.role === 'player' || p.role === 'host');
      const votedIds = Object.keys(r.votes ?? {}).filter((id) => eligible.some((p) => p.id === id));
      return { count: votedIds.length, total: eligible.length, votedIds };
    });

    // Map socket and set IP
    (gateway as any).socketRoom.set('p1', 'ROOMRL1');
    const client: any = { id: 'p1', join: jest.fn(), emit: jest.fn(), handshake: { address: '1.1.1.1' } };

    // Default limiter allows 5 ops/sec per socket; send 6 quickly
    for (let i = 0; i < 6; i++) {
      gateway.handleVoteCast({ value: '5' } as any, client);
    }

    // Only first 5 should reach service
    expect(rooms.castVote).toHaveBeenCalledTimes(5);
    // Should emit a rate_limited error for the last one
    expect(client.emit.mock.calls.some((c: any[]) => c[0] === 'room:error' && c[1]?.code === 'rate_limited')).toBe(true);
  });

  it('rate limits per-IP across sockets on vote:cast', () => {
    const room = makeRoom('ROOMRL2');
    room.participants = [
      { id: 'a', name: 'A', role: 'player' },
      { id: 'b', name: 'B', role: 'player' },
    ];
    rooms.get.mockReturnValue(room);
    rooms.castVote.mockImplementation((roomId: string, pid: string, v: string) => {
      room.votes = room.votes ?? {};
      room.votes[pid] = v;
      return room;
    });
    rooms.computeProgress.mockImplementation((r: Room) => {
      const eligible = (r.participants ?? []).filter((p) => p.role === 'player' || p.role === 'host');
      const votedIds = Object.keys(r.votes ?? {}).filter((id) => eligible.some((p) => p.id === id));
      return { count: votedIds.length, total: eligible.length, votedIds };
    });

    // Two clients behind same IP
    (gateway as any).socketRoom.set('a', 'ROOMRL2');
    (gateway as any).socketRoom.set('b', 'ROOMRL2');
    const A: any = { id: 'a', join: jest.fn(), emit: jest.fn(), handshake: { address: '2.2.2.2' } };
    const B: any = { id: 'b', join: jest.fn(), emit: jest.fn(), handshake: { address: '2.2.2.2' } };

    // Per-IP limit default is 8/sec. Do 5 from A, 3 from B (ok so far), then one more from B -> should rate limit
    for (let i = 0; i < 5; i++) gateway.handleVoteCast({ value: '1' } as any, A);
    for (let i = 0; i < 3; i++) gateway.handleVoteCast({ value: '1' } as any, B);
    gateway.handleVoteCast({ value: '1' } as any, B); // 9th -> exceeds IP bucket

    // Service should have been hit 8 times in total
    expect(rooms.castVote).toHaveBeenCalledTimes(8);
    expect(B.emit.mock.calls.some((c: any[]) => c[0] === 'room:error' && c[1]?.code === 'rate_limited')).toBe(true);
  });

  it('drops oversized payloads with invalid_payload', () => {
    const room = makeRoom('ROOMBIG');
    room.participants = [
      { id: 'h1', name: 'Hannah', role: 'host' },
    ];
    rooms.get.mockReturnValue(room);
    (gateway as any).socketRoom.set('h1', 'ROOMBIG');
    const host: any = { id: 'h1', join: jest.fn(), emit: jest.fn(), handshake: { address: '3.3.3.3' } };

    const bigNotes = 'x'.repeat(3000); // > 2KB
    gateway.handleStorySet({ story: { id: 'S-big', title: 'T', notes: bigNotes } } as any, host);

    expect(host.emit).toHaveBeenCalledWith(
      'room:error',
      expect.objectContaining({ code: 'invalid_payload' })
    );
    // No broadcast should have occurred for room:state
    const toMock = (gateway as any).server.to as jest.Mock;
    expect(toMock).not.toHaveBeenCalledWith('room:ROOMBIG');
  });

  describe('FR-017 deck:set', () => {
    it('host can set deck, clears votes, unreveals, and broadcasts progress reset', () => {
      const room = makeRoom('ROOMD');
      room.participants = [
        { id: 'h1', name: 'Hannah', role: 'host' },
        { id: 'p1', name: 'Alice', role: 'player' },
      ];
      room.votes = { p1: '5', h1: '8' } as any;
      // Previously revealed with computed stats present
      (room as any).revealed = true;
      (room as any).stats = { avg: 6.5, median: 6.5 } as any;
      rooms.get.mockReturnValue(room);
      rooms.reset.mockImplementation((rid: string) => {
        if (rid !== 'ROOMD') throw new Error('wrong room');
        room.revealed = false;
        room.votes = {} as any;
        delete (room as any).stats;
        return room;
      });
      rooms.computeProgress.mockImplementation((r: Room) => {
        const eligible = (r.participants ?? []).filter((p) => p.role === 'player' || p.role === 'host');
        const votedIds = Object.keys(r.votes ?? {}).filter((id) => eligible.some((p) => p.id === id));
        return { count: votedIds.length, total: eligible.length, votedIds };
      });

      // Map host socket
      (gateway as any).socketRoom.set('h1', 'ROOMD');
      const host: any = { id: 'h1', join: jest.fn(), emit: jest.fn() };

      gateway.handleDeckSet({ deckId: 'tshirt' } as any, host);

      // Deck updated on room object and votes cleared
      expect(room.deckId).toBe('tshirt');
      expect(room.votes).toEqual({});
      expect(room.revealed).toBe(false);
      expect((room as any).stats).toBeUndefined();

      // Broadcasts state + progress with 0 of 2
      const toMock = (gateway as any).server.to as jest.Mock;
      expect(toMock).toHaveBeenCalledWith('room:ROOMD');
      // room:state is emitted with hidden votes and revealed=false
      const state = toEmit.mock.calls.find((c: any[]) => c[0] === 'room:state')?.[1];
      expect(state).toBeDefined();
      expect(state.revealed).toBe(false);
      expect('votes' in state).toBe(false);
      expect('stats' in state).toBe(false);
      expect(toEmit).toHaveBeenCalledWith('vote:progress', { count: 0, total: 2, votedIds: [] });
    });

    it('non-host cannot set deck', () => {
      const room = makeRoom('ROOMD2');
      room.participants = [
        { id: 'p1', name: 'Paula', role: 'player' },
      ];
      rooms.get.mockReturnValue(room);
      (gateway as any).socketRoom.set('p1', 'ROOMD2');
      const client: any = { id: 'p1', join: jest.fn(), emit: jest.fn() };

      gateway.handleDeckSet({ deckId: 'tshirt' } as any, client);

      expect(client.emit).toHaveBeenCalledWith(
        'room:error',
        expect.objectContaining({ code: 'forbidden' })
      );
      const toMock = (gateway as any).server.to as jest.Mock;
      expect(toMock).not.toHaveBeenCalledWith('room:ROOMD2');
    });

    it('rejects invalid payload (empty deckId)', () => {
      const room = makeRoom('ROOMD3');
      room.participants = [
        { id: 'h1', name: 'Hannah', role: 'host' },
      ];
      rooms.get.mockReturnValue(room);
      (gateway as any).socketRoom.set('h1', 'ROOMD3');
      const host: any = { id: 'h1', join: jest.fn(), emit: jest.fn() };

      gateway.handleDeckSet({ deckId: '' } as any, host);

      expect(host.emit).toHaveBeenCalledWith(
        'room:error',
        expect.objectContaining({ code: 'invalid_payload' })
      );
    });
  });
});
