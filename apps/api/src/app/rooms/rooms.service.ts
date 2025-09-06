import { Injectable, Logger } from '@nestjs/common';
import { Room } from '@scrum-poker/shared-types';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);
  private readonly rooms = new Map<string, Room>();
  private readonly ttlMs = DAY_MS;

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
    this.logger.log(
      JSON.stringify({ event: 'room_create', room_id: id, host: hostName })
    );
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
        this.logger.log(
          JSON.stringify({ event: 'room_expired', room_id: id })
        );
      }
    }
    return removed;
  }

  private generateId(): string {
    // human-readable: AAAA-1234
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O to avoid confusion
    const digits = '0123456789';
    const maxAttempts = 1000;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let id = '';
      for (let i = 0; i < 4; i++) id += letters[Math.floor(Math.random() * letters.length)];
      id += '-';
      for (let i = 0; i < 4; i++) id += digits[Math.floor(Math.random() * digits.length)];
      if (!this.rooms.has(id)) return id;
    }
    // Extremely unlikely collision storm
    const fallback = Math.random().toString(36).slice(2, 10).toUpperCase();
    return fallback;
  }

  addParticipant(roomId: string, participant: Room['participants'][number]): Room {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');
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
      this.logger.log(
        JSON.stringify({ event: 'participant_removed', room_id: roomId, participant_id: participantId })
      );
    }
    return room;
  }
}
