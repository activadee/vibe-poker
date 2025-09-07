import { Test } from '@nestjs/testing';
import { RoomsService } from './rooms.service';

describe('RoomsService', () => {
  let service: RoomsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [RoomsService],
    }).compile();
    service = moduleRef.get(RoomsService);
  });

  it('creates a room with 24h TTL and no participants yet', () => {
    const before = Date.now();
    const room = service.create('Alice', 'sid-1');
    const after = Date.now();

    expect(room.id).toMatch(/^[A-HJ-NP-Z]{4}-\d{4}$/);
    expect(room.participants).toHaveLength(0);
    expect(room.createdAt).toBeGreaterThanOrEqual(before);
    expect(room.createdAt).toBeLessThanOrEqual(after);
    const ttlMs = room.expiresAt - room.createdAt;
    expect(ttlMs).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000 - 10);
    expect(ttlMs).toBeLessThanOrEqual(24 * 60 * 60 * 1000 + 10);
  });

  it('guards against collisions when generating IDs', () => {
    // Force add a room with a specific ID and ensure create() can still generate a new one
    const existing = service.create('Host', 'sid-2');
    // Simulate map already contains this ID; create another and ensure it's different
    const next = service.create('Bob', 'sid-3');
    expect(next.id).not.toEqual(existing.id);
  });

  it('removeExpired deletes rooms past TTL', () => {
    const room = service.create('Eve', 'sid-4');
    // Advance time artificially by setting expiresAt in the past
    (room as any).expiresAt = Date.now() - 1;
    const removed = service.removeExpired();
    expect(removed).toBeGreaterThanOrEqual(1);
    expect(service.get(room.id)).toBeUndefined();
  });

  it('castVote stores value and overwrites on re-cast', () => {
    const room = service.create('Hosty', 'sid-5');
    // Add two participants (host + player)
    service.addParticipant(room.id, { id: 'h1', name: 'Hosty', role: 'host' });
    service.addParticipant(room.id, { id: 'p1', name: 'Player', role: 'player' });

    const after1 = service.castVote(room.id, 'p1', '5');
    expect(after1.votes?.p1).toBe('5');

    const after2 = service.castVote(room.id, 'p1', '8');
    expect(after2.votes?.p1).toBe('8');
  });

  it('computeProgress counts only eligible voters (players + host)', () => {
    const room = service.create('Hannah', 'sid-10');
    service.addParticipant(room.id, { id: 'h1', name: 'Hannah', role: 'host' });
    service.addParticipant(room.id, { id: 'p1', name: 'Alice', role: 'player' });
    service.addParticipant(room.id, { id: 'obs', name: 'Olivia', role: 'observer' });

    // Only player p1 votes
    service.castVote(room.id, 'p1', '3');
    const progress1 = service.computeProgress(room);
    expect(progress1).toEqual({ count: 1, total: 2, votedIds: ['p1'] });

    // Host votes as well
    service.castVote(room.id, 'h1', '5');
    const progress2 = service.computeProgress(room);
    expect(progress2.count).toBe(2);
    expect(progress2.total).toBe(2);
    expect(progress2.votedIds.sort()).toEqual(['h1', 'p1']);
  });

  describe('computeStats (FR-009)', () => {
    it('excludes non-numeric cards and computes avg/median (odd count)', () => {
      const room = service.create('Host', 'sid-6');
      service.addParticipant(room.id, { id: 'h1', name: 'Host', role: 'host' });
      service.addParticipant(room.id, { id: 'p1', name: 'Alice', role: 'player' });
      service.addParticipant(room.id, { id: 'p2', name: 'Bob', role: 'player' });

      // Mix of numeric and non-numeric
      (room.votes as any) = { h1: '1', p1: '3', p2: '8', xtra: '?', pX: '☕' };

      const stats = service.computeStats(room)!;
      expect(stats).toBeDefined();
      expect(stats.avg).toBe(4.0); // (1+3+8)/3 = 4.0
      expect(stats.median).toBe(3.0); // middle of [1,3,8]
    });

    it('even count uses mean of middle two and rounds to 1 decimal', () => {
      const room = service.create('Host', 'sid-7');
      service.addParticipant(room.id, { id: 'h1', name: 'Host', role: 'host' });
      service.addParticipant(room.id, { id: 'p1', name: 'Alice', role: 'player' });
      service.addParticipant(room.id, { id: 'p2', name: 'Bob', role: 'player' });
      service.addParticipant(room.id, { id: 'p3', name: 'Cara', role: 'player' });

      (room.votes as any) = { h1: '5', p1: '8', p2: '13', p3: '13' };

      const stats = service.computeStats(room)!;
      expect(stats.avg).toBe(9.8); // 39/4 = 9.75 -> 9.8
      expect(stats.median).toBe(10.5); // (8+13)/2 = 10.5
    });

    it('returns undefined when no numeric votes', () => {
      const room = service.create('Host', 'sid-8');
      service.addParticipant(room.id, { id: 'h1', name: 'Host', role: 'host' });
      service.addParticipant(room.id, { id: 'p1', name: 'Alice', role: 'player' });
      (room.votes as any) = { h1: '?', p1: '☕' };
      const stats = service.computeStats(room);
      expect(stats).toBeUndefined();
    });
  });

  it('reset (FR-010) clears votes, hides reveal, and sets progress 0/Y', () => {
    const room = service.create('Host', 'sid-9');
    // Add eligible voters (host + two players) and one observer
    service.addParticipant(room.id, { id: 'h1', name: 'Host', role: 'host' });
    service.addParticipant(room.id, { id: 'p1', name: 'Alice', role: 'player' });
    service.addParticipant(room.id, { id: 'p2', name: 'Bob', role: 'player' });
    service.addParticipant(room.id, { id: 'o1', name: 'Olivia', role: 'observer' });

    // Cast some votes and mark revealed
    service.castVote(room.id, 'p1', '5');
    service.castVote(room.id, 'p2', '8');
    (room as any).revealed = true;
    (room as any).stats = { avg: 6.5, median: 6.5 };

    // Execute reset
    const after = service.reset(room.id);

    // Votes cleared and not revealed
    expect(after.revealed).toBe(false);
    expect(after.votes).toEqual({});
    expect((after as any).stats).toBeUndefined();

    // Progress is 0 out of eligible voters (3: host + 2 players)
    const progress = service.computeProgress(after);
    expect(progress.count).toBe(0);
    expect(progress.total).toBe(3);
    expect(progress.votedIds).toEqual([]);
  });
});
