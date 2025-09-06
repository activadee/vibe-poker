import { Injectable, Logger } from '@nestjs/common';
import { Room } from '@scrum-poker/shared-types';
import type { VoteProgressEvent } from '@scrum-poker/shared-types';

const DAY_MS = 24 * 60 * 60 * 1000;
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O to avoid confusion
const DIGITS = '0123456789';
const ID_LETTER_COUNT = 4;
const ID_DIGIT_COUNT = 4;
const MAX_ID_ATTEMPTS = 1000;

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);
  private readonly rooms = new Map<string, Room>();
  private readonly ttlMs = DAY_MS;

  private logEvent(event: Record<string, unknown>) {
    this.logger.log(JSON.stringify(event));
  }

  create(hostName: string): Room {
    if (!hostName || typeof hostName !== 'string') {
      throw new Error('Invalid host name');
    }
    const id = this.generateId();
    const now = Date.now();
    const room: Room = {
      id,
      createdAt: now,
      expiresAt: now + this.ttlMs,
      participants: [
        {
          id: 'host',
          name: hostName,
          role: 'host',
        },
      ],
    };
    this.rooms.set(id, room);
    this.logEvent({ event: 'room_create', room_id: id, host: hostName });
    return room;
  }

  get(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  exists(roomId: string): boolean {
    return this.rooms.has(roomId);
  }

  allIds(): string[] {
    return Array.from(this.rooms.keys());
  }

  remove(roomId: string): boolean {
    return this.rooms.delete(roomId);
  }

  removeExpired(now = Date.now()): number {
    let removed = 0;
    for (const [id, room] of this.rooms.entries()) {
      if (room.expiresAt <= now) {
        this.rooms.delete(id);
        removed++;
        this.logEvent({ event: 'room_expired', room_id: id });
      }
    }
    return removed;
  }

  /**
   * Store a vote value for a participant. Re-casting overwrites previous value.
   * Returns the updated room.
   */
  castVote(roomId: string, participantId: string, value: string): Room {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');
    if (!participantId) throw new Error('Invalid participant');
    const v = (value ?? '').toString();
    if (!v) throw new Error('Invalid vote');
    const votes = room.votes ?? (room.votes = {});
    votes[participantId] = v;
    return room;
  }

  /**
   * Calculate vote progress for a room without exposing values.
   * Only players and host are counted as eligible voters.
   */
  computeProgress(room: Room): VoteProgressEvent {
    const eligible = (room.participants ?? []).filter(
      (p) => p.role === 'player' || p.role === 'host'
    );
    const total = eligible.length;
    const votes = room.votes ?? {};
    const votedIds = Object.keys(votes).filter((id) =>
      eligible.some((p) => p.id === id)
    );
    return { count: votedIds.length, total, votedIds };
  }

  private generateId(): string {
    // human-readable: AAAA-1234
    const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)];
    for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt++) {
      let id = '';
      for (let i = 0; i < ID_LETTER_COUNT; i++) id += pick(LETTERS);
      id += '-';
      for (let i = 0; i < ID_DIGIT_COUNT; i++) id += pick(DIGITS);
      if (!this.rooms.has(id)) return id;
    }
    // Extremely unlikely collision storm
    const fallback = Math.random().toString(36).slice(2, 10).toUpperCase();
    return fallback;
  }

  addParticipant(roomId: string, participant: Room['participants'][number]): Room {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');
    // If a real client claims host role, replace any placeholder host
    if (participant.role === 'host') {
      room.participants = room.participants.filter((p) => p.role !== 'host');
    }
    // ensure uniqueness by id (socket id)
    const existingIdx = room.participants.findIndex((p) => p.id === participant.id);
    if (existingIdx >= 0) {
      room.participants.splice(existingIdx, 1, participant);
    } else {
      room.participants.push(participant);
    }
    return room;
  }

  removeParticipant(roomId: string, participantId: string): Room | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    const before = room.participants.length;
    room.participants = room.participants.filter((p) => p.id !== participantId);
    if (before !== room.participants.length) {
      this.logEvent({ event: 'participant_removed', room_id: roomId, participant_id: participantId });
    }
    return room;
  }
}
