import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { z } from 'zod';
import type {
  Participant,
  Room,
  RoomJoinPayload,
  RoomErrorEvent,
  VoteCastPayload,
  VoteRevealPayload,
  VoteResetPayload,
  StorySetPayload,
  DeckSetPayload,
  VoteProgressEvent,
} from '@scrum-poker/shared-types';
import type { Story } from '@scrum-poker/shared-types';

@Injectable()
@WebSocketGateway({
  cors: { origin: '*' },
  // Route socket.io under /api so dev proxy forwards ws
  path: '/api/socket.io',
})
export class RoomsGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RoomsGateway.name);
  // track which room a socket joined
  private readonly socketRoom = new Map<string, string>();
  // Simple token bucket based rate limiter (per-socket and per-IP)
  private readonly rateLimiter = createRateLimiter();

  // Zod schemas for payload validation
  private readonly schemas = {
    join: z
      .object({
        roomId: z.string().trim().min(1),
        name: z.string().trim().min(1),
        secret: z.string().optional(),
        role: z.union([z.literal('observer'), z.literal('player')]).optional(),
      })
      .strict(),
    voteCast: z
      .object({
        value: z.string().trim().min(1),
      })
      .strict(),
    voteReveal: z.object({}).strict(),
    voteReset: z.object({}).strict(),
    storySet: z
      .object({
        story: z
          .object({
            id: z.string().trim().min(1).optional(),
            title: z.string().trim().min(1),
            notes: z.string().optional(),
          })
          .strict(),
      })
      .strict(),
    deckSet: z
      .object({
        deckId: z.string().trim().min(1),
      })
      .strict(),
  } as const;

  constructor(private readonly rooms: RoomsService) {}

  private logEvent(event: Record<string, unknown>) {
    this.logger.log(JSON.stringify(event));
  }

  private clientIp(client: Socket): string {
    // socket.io provides peer IP via handshake.address
    // Note: in proxied environments, this may be a private IP unless trust proxy is configured upstream.
    return (client.handshake as any)?.address || 'unknown';
  }

  private tooLarge(payload: unknown): boolean {
    const MAX_BYTES = 2 * 1024; // 2KB limit per message
    try {
      const size = Buffer.byteLength(JSON.stringify(payload ?? {}), 'utf8');
      return size > MAX_BYTES;
    } catch {
      return true;
    }
  }

  private enforceLimits(
    event: 'room:join' | 'vote:cast' | 'vote:reveal' | 'vote:reset',
    client: Socket
  ): boolean {
    const ip = this.clientIp(client);
    if (!this.rateLimiter.allow({ socketId: client.id, ip, event })) {
      const err: RoomErrorEvent = { code: 'rate_limited', message: 'Too many requests. Please slow down.' };
      client.emit('room:error', err);
      this.logEvent({ event: 'rate_limited', action: event, ip, socket_id: client.id });
      return false;
    }
    return true;
  }

  private validate<T>(schema: z.ZodSchema<T>, payload: unknown, client: Socket): payload is T {
    if (this.tooLarge(payload)) {
      const err: RoomErrorEvent = { code: 'invalid_payload', message: 'Payload too large' };
      client.emit('room:error', err);
      return false;
    }
    const res = schema.safeParse(payload ?? {});
    if (!res.success) {
      const err: RoomErrorEvent = { code: 'invalid_payload', message: 'Invalid payload' };
      client.emit('room:error', err);
      return false;
    }
    return true;
  }

  private roomKey(roomId: string): string {
    return `room:${roomId}`;
  }

  private getContext(client: Socket): { roomId: string; room: Room; me: Participant } | undefined {
    const roomId = this.socketRoom.get(client.id);
    if (!roomId) return undefined;
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    const me = room.participants.find((p) => p.id === client.id);
    if (!me) return undefined;
    return { roomId, room, me };
  }

  private isHost(p?: Participant) {
    return p?.role === 'host';
  }

  private isPlayer(p?: Participant) {
    return p?.role === 'player' || p?.role === 'host';
  }

  private safeRoom(room: Room): Room {
    // Hide votes before reveal to avoid leaking values
    if (!room.revealed) {
      const { votes: _omitted, stats: _stats_omitted, ...rest } = room;
      return rest;
    }
    // When revealed, compute and attach stats derived from numeric votes
    const stats = this.rooms.computeStats(room);
    if (stats) {
      room.stats = stats;
    } else {
      delete room.stats;
    }
    return room;
  }

  private computeProgress(room: Room): VoteProgressEvent {
    // Delegate to service for consistency and testability
    return this.rooms.computeProgress(room);
  }

  private broadcastProgress(roomId: string, room: Room) {
    const progress = this.computeProgress(room);
    this.server.to(this.roomKey(roomId)).emit('vote:progress', progress);
  }

  @SubscribeMessage('room:join')
  handleJoin(
    @MessageBody() payload: RoomJoinPayload,
    @ConnectedSocket() client: Socket
  ) {
    if (!this.enforceLimits('room:join', client)) return;
    if (!this.validate(this.schemas.join, payload, client)) return;
    const roomId = payload.roomId.trim();
    const name = payload.name.trim();

    const room = this.rooms.get(roomId);
    if (!room) {
      const err: RoomErrorEvent = {
        code: 'invalid_room',
        message: 'This room does not exist or has expired.',
      };
      client.emit('room:error', err);
      return;
    }

    // FR-015: If room is expired, gracefully delete and inform client with 'expired' error
    if (room.expiresAt <= Date.now()) {
      this.rooms.remove(roomId);
      const err: RoomErrorEvent = {
        code: 'expired',
        message: 'This room has expired. Please create a new room.',
      };
      client.emit('room:error', err);
      return;
    }

    // Join socket.io room
    client.join(this.roomKey(roomId));
    this.socketRoom.set(client.id, roomId);

    // Add participant (allow duplicate names; socket.id is unique)
    // If the room contains a placeholder host entry matching the name, elevate to host
    const requestedRole = payload?.role;
    const shouldBeHost = !!room.participants.find((p) => p.role === 'host' && p.name === name);
    const participant: Participant = {
      id: client.id,
      name,
      role: shouldBeHost ? 'host' : requestedRole === 'observer' ? 'observer' : 'player',
    };
    const updated = this.rooms.addParticipant(roomId, participant);
    this.logEvent({ event: 'room_join', room_id: roomId, name, socket_id: client.id });

    // Broadcast state to all in room (including the joiner)
    this.server.to(this.roomKey(roomId)).emit('room:state', this.safeRoom(updated));
    this.broadcastProgress(roomId, updated);
  }

  handleDisconnect(client: Socket) {
    const ctx = this.getContext(client);
    const roomId = ctx?.roomId ?? this.socketRoom.get(client.id);
    if (!roomId) return;
    this.socketRoom.delete(client.id);
    const wasHost = ctx?.me.role === 'host';
    const hostName = ctx?.me.name ?? '';
    const room = this.rooms.removeParticipant(roomId, client.id);
    if (!room) return;
    // Preserve host role across reloads by keeping a placeholder host by name
    if (wasHost && hostName) {
      this.rooms.addParticipant(roomId, { id: 'host', name: hostName, role: 'host' });
    }
    this.logEvent({ event: 'room_leave', room_id: roomId, socket_id: client.id });
    this.server.to(this.roomKey(roomId)).emit('room:state', this.safeRoom(room));
    this.broadcastProgress(roomId, room);
  }

  @SubscribeMessage('vote:cast')
  handleVoteCast(
    @MessageBody() payload: VoteCastPayload,
    @ConnectedSocket() client: Socket
  ) {
    if (!this.enforceLimits('vote:cast', client)) return;
    if (!this.validate(this.schemas.voteCast, payload, client)) return;
    const ctx = this.getContext(client);
    if (!ctx) return;
    const { roomId, room, me } = ctx;
    if (!this.isPlayer(me)) {
      const err: RoomErrorEvent = { code: 'forbidden', message: 'Observers cannot vote' };
      client.emit('room:error', err);
      this.logEvent({ event: 'auth_forbidden', action: 'vote:cast', room_id: roomId, socket_id: client.id, role: me.role });
      return; // safely ignore
    }
    const value = (payload?.value ?? '').toString();
    if (!value) return; // ignore invalid
    // Persist via service (overwrites if re-cast)
    this.rooms.castVote(roomId, client.id, value);
    this.logEvent({ event: 'vote_cast', room_id: roomId, socket_id: client.id });
    // Broadcast progress only (no values) to all clients
    this.broadcastProgress(roomId, room);
  }

  @SubscribeMessage('vote:reveal')
  handleVoteReveal(
    @MessageBody() _payload: VoteRevealPayload,
    @ConnectedSocket() client: Socket
  ) {
    if (!this.enforceLimits('vote:reveal', client)) return;
    if (!this.validate(this.schemas.voteReveal, _payload ?? {}, client)) return;
    const ctx = this.getContext(client);
    if (!ctx) return;
    const { roomId, room, me } = ctx;
    if (!this.isHost(me)) {
      const err: RoomErrorEvent = { code: 'forbidden', message: 'Only host can reveal votes' };
      client.emit('room:error', err);
      this.logEvent({ event: 'auth_forbidden', action: 'vote:reveal', room_id: roomId, socket_id: client.id, role: me.role });
      return;
    }
    room.revealed = true;
    this.logEvent({ event: 'vote_reveal', room_id: roomId, socket_id: client.id });
    this.server.to(this.roomKey(roomId)).emit('room:state', this.safeRoom(room));
    this.broadcastProgress(roomId, room);
  }

  @SubscribeMessage('vote:reset')
  handleVoteReset(
    @MessageBody() _payload: VoteResetPayload,
    @ConnectedSocket() client: Socket
  ) {
    if (!this.enforceLimits('vote:reset', client)) return;
    if (!this.validate(this.schemas.voteReset, _payload ?? {}, client)) return;
    const ctx = this.getContext(client);
    if (!ctx) return;
    const { roomId, room, me } = ctx;
    if (!this.isHost(me)) {
      const err: RoomErrorEvent = { code: 'forbidden', message: 'Only host can reset votes' };
      client.emit('room:error', err);
      this.logEvent({ event: 'auth_forbidden', action: 'vote:reset', room_id: roomId, socket_id: client.id, role: me.role });
      return;
    }
    this.rooms.reset(roomId);
    this.logEvent({ event: 'vote_reset', room_id: roomId, socket_id: client.id });
    this.server.to(this.roomKey(roomId)).emit('room:state', this.safeRoom(room));
    this.broadcastProgress(roomId, room);
  }

  @SubscribeMessage('story:set')
  handleStorySet(
    @MessageBody() payload: StorySetPayload,
    @ConnectedSocket() client: Socket
  ) {
    // Story and deck updates are host-only but can be spammed; optional rate limits can be added later
    if (!this.validate(this.schemas.storySet, payload, client)) return;
    const ctx = this.getContext(client);
    if (!ctx) return;
    const { roomId, room, me } = ctx;
    if (!this.isHost(me)) {
      const err: RoomErrorEvent = { code: 'forbidden', message: 'Only host can set story' };
      client.emit('room:error', err);
      this.logEvent({ event: 'auth_forbidden', action: 'story:set', room_id: roomId, socket_id: client.id, role: me.role });
      return;
    }
    const sanitize = (s: Partial<Story> | undefined | null): Story | null => {
      if (!s || typeof s !== 'object') return null;
      const title = (s.title ?? '').toString().trim();
      if (!title) return null;
      const genId = () => `S-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const idRaw = (s.id ?? '').toString().trim();
      const id = idRaw || genId();
      const notes = (s.notes ?? '').toString();
      const story: Story = { id, title };
      if (notes.trim()) story.notes = notes;
      return story;
    };
    const next = sanitize((payload as any)?.story);
    if (!next) {
      const err: RoomErrorEvent = { code: 'invalid_payload', message: 'Story title is required' };
      client.emit('room:error', err);
      return;
    }
    room.story = next;
    this.logEvent({ event: 'story_set', room_id: roomId, socket_id: client.id });
    this.server.to(this.roomKey(roomId)).emit('room:state', this.safeRoom(room));
    this.broadcastProgress(roomId, room);
  }

  @SubscribeMessage('deck:set')
  handleDeckSet(
    @MessageBody() payload: DeckSetPayload,
    @ConnectedSocket() client: Socket
  ) {
    if (!this.validate(this.schemas.deckSet, payload, client)) return;
    const ctx = this.getContext(client);
    if (!ctx) return;
    const { roomId, room, me } = ctx;
    if (!this.isHost(me)) {
      const err: RoomErrorEvent = { code: 'forbidden', message: 'Only host can change deck' };
      client.emit('room:error', err);
      this.logEvent({ event: 'auth_forbidden', action: 'deck:set', room_id: roomId, socket_id: client.id, role: me.role });
      return;
    }
    const deckId = payload?.deckId ?? 'fibonacci';
    room.deckId = deckId;
    // Reset round state when deck changes (votes cleared, reveal off, stats removed)
    this.rooms.reset(roomId);
    this.logEvent({ event: 'deck_set', room_id: roomId, socket_id: client.id, deck: deckId });
    this.server.to(this.roomKey(roomId)).emit('room:state', this.safeRoom(room));
    this.broadcastProgress(roomId, room);
  }
}

// ---------- Simple token bucket limiter ----------
type LimitedEvent = 'room:join' | 'vote:cast' | 'vote:reveal' | 'vote:reset';

class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  constructor(private capacity: number, private refillTokens: number, private refillIntervalMs: number) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }
  tryConsume(cost = 1, now = Date.now()): boolean {
    // Refill based on elapsed intervals
    const elapsed = now - this.lastRefill;
    if (elapsed >= this.refillIntervalMs) {
      const intervals = Math.floor(elapsed / this.refillIntervalMs);
      this.tokens = Math.min(this.capacity, this.tokens + intervals * this.refillTokens);
      this.lastRefill += intervals * this.refillIntervalMs;
    }
    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;
    }
    return false;
  }
}

function createRateLimiter() {
  // Reasonable defaults: per-socket 5 ops/sec; per-IP 8 ops/sec for sensitive events
  const SOCKET_LIMIT = 5;
  const IP_LIMIT = 8;
  const refillMs = 1000;
  const perSocket = new Map<string, TokenBucket>();
  const perIp = new Map<string, TokenBucket>();
  const limitedEvents = new Set<LimitedEvent>(['room:join', 'vote:cast', 'vote:reveal', 'vote:reset']);
  return {
    allow({ socketId, ip, event }: { socketId: string; ip: string; event: LimitedEvent }): boolean {
      if (!limitedEvents.has(event)) return true;
      let sb = perSocket.get(socketId);
      if (!sb) {
        sb = new TokenBucket(SOCKET_LIMIT, SOCKET_LIMIT, refillMs);
        perSocket.set(socketId, sb);
      }
      if (!sb.tryConsume(1)) return false;

      let ib = perIp.get(ip);
      if (!ib) {
        ib = new TokenBucket(IP_LIMIT, IP_LIMIT, refillMs);
        perIp.set(ip, ib);
      }
      if (!ib.tryConsume(1)) return false;
      return true;
    },
  };
}
