import type { DeckId, Participant, Room, Story } from '@scrum-poker/shared-types';
import type { RoomsRepository } from './rooms.repository';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '0123456789';
const ID_LETTER_COUNT = 4;
const ID_DIGIT_COUNT = 4;
const MAX_ID_ATTEMPTS = 1000;

export class RedisRoomsRepository implements RoomsRepository {
  readonly backend = 'redis' as const;
  private readonly redis: Redis;
  private readonly prefix: string;

  constructor(redis: Redis, keyPrefix = 'room') {
    this.redis = redis;
    this.prefix = keyPrefix;
  }

  private key(id: string) {
    return `${this.prefix}:${id}`;
  }
  private ownerKey(id: string) {
    return `${this.prefix}:${id}:owner`;
  }

  private generateId = async (): Promise<string> => {
    const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)];
    for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt++) {
      let id = '';
      for (let i = 0; i < ID_LETTER_COUNT; i++) id += pick(LETTERS);
      id += '-';
      for (let i = 0; i < ID_DIGIT_COUNT; i++) id += pick(DIGITS);
      const exists = await this.redis.exists(this.key(id));
      if (!exists) return id;
    }
    return randomUUID().slice(0, 8).toUpperCase();
  };

  async create(_hostName: string, ownerSid: string, ttlMs: number): Promise<Room> {
    const id = await this.generateId();
    const now = Date.now();
    const room: Room = { id, createdAt: now, expiresAt: now + ttlMs, participants: [] };
    const key = this.key(id);
    const ownerKey = this.ownerKey(id);
    // Persist room JSON and set TTL on both keys
    await this.redis.set(key, JSON.stringify(room));
    await this.redis.set(ownerKey, ownerSid);
    const expAtMs = room.expiresAt;
    await this.redis.pexpireat(key, expAtMs);
    await this.redis.pexpireat(ownerKey, expAtMs);
    return room;
  }

  async get(roomId: string): Promise<Room | undefined> {
    const raw = await this.redis.get(this.key(roomId));
    if (!raw) return undefined;
    try {
      const r = JSON.parse(raw) as Room;
      // Normalize missing structures
      r.participants = Array.isArray(r.participants) ? r.participants : [];
      if (r.votes && typeof r.votes !== 'object') delete (r as Partial<Room>).votes;
      return r;
    } catch {
      return undefined;
    }
  }

  async getOwner(roomId: string): Promise<string | undefined> {
    const v = await this.redis.get(this.ownerKey(roomId));
    return v ?? undefined;
  }

  async exists(roomId: string): Promise<boolean> {
    return (await this.redis.exists(this.key(roomId))) === 1;
  }

  async remove(roomId: string): Promise<boolean> {
    const n = await this.redis.del(this.key(roomId), this.ownerKey(roomId));
    return n > 0;
  }

  async allIds(): Promise<string[]> {
    // Use KEYS for simplicity (rooms are ephemeral and low cardinality)
    const keys = await this.redis.keys(`${this.prefix}:*`);
    // Filter only primary room keys (exclude :owner)
    const ids = keys
      .filter((k) => (k.match(/:/g) ?? []).length === 1)
      .map((k) => k.split(':')[1]);
    return ids;
  }

  private async write(room: Room): Promise<void> {
    const key = this.key(room.id);
    await this.redis.set(key, JSON.stringify(room));
    // Preserve TTL by mirroring expiry
    await this.redis.pexpireat(key, room.expiresAt);
  }

  private async ensure(roomId: string): Promise<Room> {
    const r = await this.get(roomId);
    if (!r) throw new Error('Room not found');
    return r;
  }

  async addParticipant(roomId: string, participant: Participant): Promise<Room> {
    const room = await this.ensure(roomId);
    if (participant.role === 'host') {
      room.participants = room.participants.filter((p) => p.role !== 'host');
    }
    const idx = room.participants.findIndex((p) => p.id === participant.id);
    if (idx >= 0) room.participants.splice(idx, 1, participant);
    else room.participants.push(participant);
    await this.write(room);
    return room;
  }

  async removeParticipant(roomId: string, participantId: string): Promise<Room | undefined> {
    const room = await this.get(roomId);
    if (!room) return undefined;
    room.participants = room.participants.filter((p) => p.id !== participantId);
    await this.write(room);
    return room;
  }

  async castVote(roomId: string, participantId: string, value: string): Promise<Room> {
    const room = await this.ensure(roomId);
    const v = (value ?? '').toString();
    if (!v) throw new Error('Invalid vote');
    const votes = room.votes ?? (room.votes = {});
    votes[participantId] = v;
    await this.write(room);
    return room;
  }

  async reset(roomId: string): Promise<Room> {
    const room = await this.ensure(roomId);
    room.revealed = false;
    room.votes = {};
    delete room.stats;
    await this.write(room);
    return room;
  }

  async setRevealed(roomId: string, revealed: boolean): Promise<Room> {
    const room = await this.ensure(roomId);
    room.revealed = revealed;
    await this.write(room);
    return room;
  }

  async setStory(roomId: string, story: Story | undefined): Promise<Room> {
    const room = await this.ensure(roomId);
    if (story) room.story = { id: story.id, title: story.title, ...(story.notes?.trim() ? { notes: story.notes } : {}) };
    else delete room.story;
    await this.write(room);
    return room;
  }

  async setDeck(roomId: string, deckId: DeckId): Promise<Room> {
    const room = await this.ensure(roomId);
    room.deckId = deckId;
    await this.write(room);
    return room;
  }
}
