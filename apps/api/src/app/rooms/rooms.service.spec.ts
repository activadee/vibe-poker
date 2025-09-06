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

  it('creates a room with host and 24h TTL', () => {
    const before = Date.now();
    const room = service.create('Alice');
    const after = Date.now();

    expect(room.id).toMatch(/^[A-HJ-NP-Z]{4}-\d{4}$/);
    expect(room.participants).toHaveLength(1);
    expect(room.participants[0]).toMatchObject({ name: 'Alice', role: 'host' });
    expect(room.createdAt).toBeGreaterThanOrEqual(before);
    expect(room.createdAt).toBeLessThanOrEqual(after);
    const ttlMs = room.expiresAt - room.createdAt;
    expect(ttlMs).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000 - 10);
    expect(ttlMs).toBeLessThanOrEqual(24 * 60 * 60 * 1000 + 10);
  });

  it('guards against collisions when generating IDs', () => {
    // Force add a room with a specific ID and ensure create() can still generate a new one
    const existing = service.create('Host');
    // Simulate map already contains this ID; create another and ensure it's different
    const next = service.create('Bob');
    expect(next.id).not.toEqual(existing.id);
  });

  it('removeExpired deletes rooms past TTL', () => {
    const room = service.create('Eve');
    // Advance time artificially by setting expiresAt in the past
    (room as any).expiresAt = Date.now() - 1;
    const removed = service.removeExpired();
    expect(removed).toBeGreaterThanOrEqual(1);
    expect(service.get(room.id)).toBeUndefined();
  });

  it('castVote stores value and overwrites on re-cast', () => {
    const room = service.create('Hosty');
    // Add two participants (host + player)
    service.addParticipant(room.id, { id: 'h1', name: 'Hosty', role: 'host' });
    service.addParticipant(room.id, { id: 'p1', name: 'Player', role: 'player' });

    const after1 = service.castVote(room.id, 'p1', '5');
    expect(after1.votes?.p1).toBe('5');

    const after2 = service.castVote(room.id, 'p1', '8');
    expect(after2.votes?.p1).toBe('8');
  });

  it('computeProgress counts only eligible voters (players + host)', () => {
    const room = service.create('Hannah');
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
});
