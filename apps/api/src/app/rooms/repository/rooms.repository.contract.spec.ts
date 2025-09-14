import Redis from 'ioredis-mock';
import type { RoomsRepository } from './rooms.repository';
import { InMemoryRoomsRepository } from './in-memory.repository';
import { RedisRoomsRepository } from './redis.repository';

async function runContract(name: string, makeRepo: () => RoomsRepository) {
  describe(`RoomsRepository contract — ${name}`, () => {
    let repo: RoomsRepository;
    const TTL = 24 * 60 * 60 * 1000; // 24h

    beforeEach(() => {
      repo = makeRepo();
    });

    it('create → get → exists → allIds roundtrip', async () => {
      const room = await repo.create('Host', 'sid-1', TTL);
      expect(room.id).toMatch(/^[A-HJ-NP-Z]{4}-\d{4}$/);
      const got = await repo.get(room.id);
      expect(got?.id).toBe(room.id);
      expect(await repo.exists(room.id)).toBe(true);
      const ids = await repo.allIds();
      expect(ids).toContain(room.id);
    });

    it('persists owner and participants/votes/reset/deck/story', async () => {
      const room = await repo.create('Host', 'sid-2', TTL);
      expect(await repo.getOwner(room.id)).toBe('sid-2');

      // participants
      await repo.addParticipant(room.id, { id: 'h1', name: 'Host', role: 'host' });
      await repo.addParticipant(room.id, { id: 'p1', name: 'Alice', role: 'player' });
      let cur = await repo.get(room.id);
      expect(cur?.participants.map((p) => p.id).sort()).toEqual(['h1', 'p1']);

      // cast vote and overwrite
      await repo.castVote(room.id, 'p1', '5');
      cur = await repo.get(room.id);
      expect(cur?.votes?.p1).toBe('5');
      await repo.castVote(room.id, 'p1', '8');
      cur = await repo.get(room.id);
      expect(cur?.votes?.p1).toBe('8');

      // set story and deck
      await repo.setStory(room.id, { id: 'S-1', title: 'Implement thing' });
      await repo.setDeck(room.id, 'fibonacci');
      cur = await repo.get(room.id);
      expect(cur?.story?.title).toBe('Implement thing');
      expect(cur?.deckId).toBe('fibonacci');

      // reset
      await repo.reset(room.id);
      cur = await repo.get(room.id);
      expect(cur?.revealed).toBe(false);
      expect(cur?.votes).toEqual({});

      // remove participant
      await repo.removeParticipant(room.id, 'p1');
      cur = await repo.get(room.id);
      expect(cur?.participants.map((p) => p.id)).toEqual(['h1']);
    });

    it('remove deletes the room', async () => {
      const room = await repo.create('Host', 'sid-3', TTL);
      expect(await repo.exists(room.id)).toBe(true);
      const ok = await repo.remove(room.id);
      expect(ok).toBe(true);
      expect(await repo.get(room.id)).toBeUndefined();
    });
  });
}

runContract('in-memory', () => new InMemoryRoomsRepository());
runContract('redis-mock', () => new RedisRoomsRepository(new (Redis as unknown as typeof Redis)()));

