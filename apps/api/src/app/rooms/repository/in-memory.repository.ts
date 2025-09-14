import { randomUUID } from 'node:crypto';
import type { DeckId, Participant, Room, Story } from '@scrum-poker/shared-types';
import type { RoomsRepository } from './rooms.repository';

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude I/O
const DIGITS = '0123456789';
const ID_LETTER_COUNT = 4;
const ID_DIGIT_COUNT = 4;
const MAX_ID_ATTEMPTS = 1000;

export class InMemoryRoomsRepository implements RoomsRepository {
  readonly backend = 'memory' as const;
  private readonly rooms = new Map<string, Room>();
  private readonly ownerByRoom = new Map<string, string>();

  private generateId(): string {
    const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)];
    for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt++) {
      let id = '';
      for (let i = 0; i < ID_LETTER_COUNT; i++) id += pick(LETTERS);
      id += '-';
      for (let i = 0; i < ID_DIGIT_COUNT; i++) id += pick(DIGITS);
      if (!this.rooms.has(id)) return id;
    }
    return randomUUID().slice(0, 8).toUpperCase();
  }

  async create(_hostName: string, ownerSid: string, ttlMs: number): Promise<Room> {
    const id = this.generateId();
    const now = Date.now();
    const room: Room = { id, createdAt: now, expiresAt: now + ttlMs, participants: [] };
    this.rooms.set(id, room);
    this.ownerByRoom.set(id, ownerSid);
    return room;
  }

  async get(roomId: string): Promise<Room | undefined> {
    return this.rooms.get(roomId);
  }

  async getOwner(roomId: string): Promise<string | undefined> {
    return this.ownerByRoom.get(roomId);
  }

  async exists(roomId: string): Promise<boolean> {
    return this.rooms.has(roomId);
  }

  async remove(roomId: string): Promise<boolean> {
    this.ownerByRoom.delete(roomId);
    return this.rooms.delete(roomId);
  }

  async allIds(): Promise<string[]> {
    return Array.from(this.rooms.keys());
  }

  async removeExpired(now = Date.now()): Promise<number> {
    let removed = 0;
    for (const [id, room] of this.rooms.entries()) {
      if (room.expiresAt <= now) {
        this.rooms.delete(id);
        this.ownerByRoom.delete(id);
        removed++;
      }
    }
    return removed;
  }

  private ensure(roomId: string): Room {
    const r = this.rooms.get(roomId);
    if (!r) throw new Error('Room not found');
    return r;
  }

  async addParticipant(roomId: string, participant: Participant): Promise<Room> {
    const room = this.ensure(roomId);
    if (participant.role === 'host') {
      room.participants = room.participants.filter((p) => p.role !== 'host');
    }
    const idx = room.participants.findIndex((p) => p.id === participant.id);
    if (idx >= 0) room.participants.splice(idx, 1, participant);
    else room.participants.push(participant);
    return room;
  }

  async removeParticipant(roomId: string, participantId: string): Promise<Room | undefined> {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    room.participants = room.participants.filter((p) => p.id !== participantId);
    return room;
  }

  async castVote(roomId: string, participantId: string, value: string): Promise<Room> {
    const room = this.ensure(roomId);
    const v = (value ?? '').toString();
    if (!v) throw new Error('Invalid vote');
    const votes = room.votes ?? (room.votes = {});
    votes[participantId] = v;
    return room;
  }

  async reset(roomId: string): Promise<Room> {
    const room = this.ensure(roomId);
    room.revealed = false;
    room.votes = {};
    delete room.stats;
    return room;
  }

  async setRevealed(roomId: string, revealed: boolean): Promise<Room> {
    const room = this.ensure(roomId);
    room.revealed = revealed;
    return room;
  }

  async setStory(roomId: string, story: Story | undefined): Promise<Room> {
    const room = this.ensure(roomId);
    if (story) room.story = { id: story.id, title: story.title, ...(story.notes?.trim() ? { notes: story.notes } : {}) };
    else delete room.story;
    return room;
  }

  async setDeck(roomId: string, deckId: DeckId): Promise<Room> {
    const room = this.ensure(roomId);
    room.deckId = deckId;
    return room;
  }
}
