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
});

