import { Inject, Injectable, Logger } from '@nestjs/common';
import { redactSecrets } from '../security/redact';
import { Room } from '@scrum-poker/shared-types';
import type { VoteProgressEvent, VoteStats } from '@scrum-poker/shared-types';
import type { RoomsRepository } from './repository/rooms.repository';
import { ROOMS_REPOSITORY } from './repository/tokens';

const DAY_MS = 24 * 60 * 60 * 1000;
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O to avoid confusion
const DIGITS = '0123456789';
const ID_LETTER_COUNT = 4;
const ID_DIGIT_COUNT = 4;
const MAX_ID_ATTEMPTS = 1000;

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);
  private readonly ttlMs = DAY_MS;

  constructor(@Inject(ROOMS_REPOSITORY) private readonly repo: RoomsRepository) {}

  private logEvent(event: Record<string, unknown>) {
    this.logger.log(JSON.stringify(redactSecrets(event)));
  }

  async create(hostName: string, ownerSid: string): Promise<Room> {
    if (!hostName || typeof hostName !== 'string') {
      throw new Error('Invalid host name');
    }
    if (!ownerSid || typeof ownerSid !== 'string') {
      throw new Error('Invalid owner session');
    }
    const room = await this.repo.create(hostName, ownerSid, this.ttlMs);
    this.logEvent({ event: 'room_create', room_id: room.id, host: hostName });
    return room;
  }

  async get(roomId: string): Promise<Room | undefined> {
    return this.repo.get(roomId);
  }

  async exists(roomId: string): Promise<boolean> {
    return this.repo.exists(roomId);
  }

  async allIds(): Promise<string[]> {
    return this.repo.allIds();
  }

  async remove(roomId: string): Promise<boolean> {
    return this.repo.remove(roomId);
  }

  async removeExpired(now = Date.now()): Promise<number> {
    if (this.repo.backend === 'redis') return 0; // Redis TTL handles expiry
    const fn = this.repo.removeExpired?.bind(this.repo);
    if (!fn) return 0;
    const removed = await fn(now);
    if (removed > 0) this.logEvent({ event: 'room_expired_bulk', count: removed });
    return removed;
  }

  /**
   * Store a vote value for a participant. Re-casting overwrites previous value.
   * Returns the updated room.
   */
  async castVote(roomId: string, participantId: string, value: string): Promise<Room> {
    if (!participantId) throw new Error('Invalid participant');
    return this.repo.castVote(roomId, participantId, value);
  }

  /**
   * FR-010: Reset the current voting round.
   * - Clears all stored votes
   * - Marks the room as not revealed
   * - Removes any previously computed statistics
   * Returns the updated room.
   */
  async reset(roomId: string): Promise<Room> {
    return this.repo.reset(roomId);
  }

  async setRevealed(roomId: string, revealed: boolean): Promise<Room> {
    return this.repo.setRevealed(roomId, revealed);
  }

  async setStory(roomId: string, story: Room['story'] | undefined) {
    return this.repo.setStory(roomId, story);
  }

  async setDeck(roomId: string, deckId: NonNullable<Room['deckId']>) {
    return this.repo.setDeck(roomId, deckId);
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

  /**
   * FR-009: Compute average (1 decimal) and median (1 decimal)
   * using only numeric card values and eligible voters (players + host).
   * Returns undefined if there are no numeric votes.
   */
  computeStats(room: Room): VoteStats | undefined {
    const eligibleIds = new Set(
      (room.participants ?? [])
        .filter((p) => p.role === 'player' || p.role === 'host')
        .map((p) => p.id)
    );
    const votes = room.votes ?? {};
    const nums: number[] = [];
    for (const [pid, raw] of Object.entries(votes)) {
      if (!eligibleIds.has(pid)) continue;
      const v = (raw ?? '').toString().trim();
      // Accept numeric strings like 1, 2, 3, 5, 8, 13, 20, 40, 100, also decimals e.g., 0.5
      if (!/^\d+(?:\.\d+)?$/.test(v)) continue;
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      nums.push(n);
    }
    if (nums.length === 0) return undefined;
    nums.sort((a, b) => a - b);
    const round1 = (x: number) => Math.round(x * 10) / 10;
    const sum = nums.reduce((acc, n) => acc + n, 0);
    const avg = round1(sum / nums.length);
    let median: number;
    const mid = Math.floor(nums.length / 2);
    if (nums.length % 2 === 1) {
      median = nums[mid];
    } else {
      median = (nums[mid - 1] + nums[mid]) / 2;
    }
    median = round1(median);
    return { avg, median };
  }

  async addParticipant(roomId: string, participant: Room['participants'][number]): Promise<Room> {
    return this.repo.addParticipant(roomId, participant);
  }

  async removeParticipant(roomId: string, participantId: string): Promise<Room | undefined> {
    const before = await this.repo.get(roomId);
    const room = await this.repo.removeParticipant(roomId, participantId);
    if (before && room && (before.participants.length !== room.participants.length)) {
      this.logEvent({ event: 'participant_removed', room_id: roomId, participant_id: participantId });
    }
    return room;
  }

  async getOwner(roomId: string): Promise<string | undefined> {
    return this.repo.getOwner(roomId);
  }
}
