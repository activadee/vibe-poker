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

  constructor(private readonly rooms: RoomsService) {}

  private logEvent(event: Record<string, unknown>) {
    this.logger.log(JSON.stringify(event));
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
      const { votes: _omitted, ...rest } = room as any;
      return rest as Room;
    }
    return room;
  }

  private computeProgress(room: Room): VoteProgressEvent {
    const eligible = room.participants.filter((p) => this.isPlayer(p));
    const total = eligible.length;
    const votedIds = Object.keys(room.votes ?? {}).filter((id) =>
      eligible.some((p) => p.id === id)
    );
    return { count: votedIds.length, total, votedIds };
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
    const roomId = payload?.roomId?.trim();
    const name = payload?.name?.trim();

    if (!roomId || !name) {
      const err: RoomErrorEvent = {
        code: 'invalid_payload',
        message: 'roomId and name are required',
      };
      client.emit('room:error', err);
      return;
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      const err: RoomErrorEvent = {
        code: 'invalid_room',
        message: 'This room does not exist or has expired.',
      };
      client.emit('room:error', err);
      return;
    }

    // Join socket.io room
    client.join(this.roomKey(roomId));
    this.socketRoom.set(client.id, roomId);

    // Add participant (allow duplicate names; socket.id is unique)
    // If the room contains a placeholder host entry matching the name, elevate to host
    const shouldBeHost = !!room.participants.find((p) => p.role === 'host' && p.name === name);
    const participant: Participant = {
      id: client.id,
      name,
      role: shouldBeHost ? 'host' : 'player',
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
    // Lazy-init votes map
    const votes = room.votes ?? (room.votes = {});
    votes[client.id] = value;
    this.logEvent({ event: 'vote_cast', room_id: roomId, socket_id: client.id });
    // Broadcast progress only (no values) to all clients
    this.broadcastProgress(roomId, room);
  }

  @SubscribeMessage('vote:reveal')
  handleVoteReveal(
    @MessageBody() _payload: VoteRevealPayload,
    @ConnectedSocket() client: Socket
  ) {
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
    const ctx = this.getContext(client);
    if (!ctx) return;
    const { roomId, room, me } = ctx;
    if (!this.isHost(me)) {
      const err: RoomErrorEvent = { code: 'forbidden', message: 'Only host can reset votes' };
      client.emit('room:error', err);
      this.logEvent({ event: 'auth_forbidden', action: 'vote:reset', room_id: roomId, socket_id: client.id, role: me.role });
      return;
    }
    room.revealed = false;
    room.votes = {};
    this.logEvent({ event: 'vote_reset', room_id: roomId, socket_id: client.id });
    this.server.to(this.roomKey(roomId)).emit('room:state', this.safeRoom(room));
    this.broadcastProgress(roomId, room);
  }

  @SubscribeMessage('story:set')
  handleStorySet(
    @MessageBody() payload: StorySetPayload,
    @ConnectedSocket() client: Socket
  ) {
    const ctx = this.getContext(client);
    if (!ctx) return;
    const { roomId, room, me } = ctx;
    if (!this.isHost(me)) {
      const err: RoomErrorEvent = { code: 'forbidden', message: 'Only host can set story' };
      client.emit('room:error', err);
      this.logEvent({ event: 'auth_forbidden', action: 'story:set', room_id: roomId, socket_id: client.id, role: me.role });
      return;
    }
    const story = (payload?.story ?? '').trim();
    room.story = story;
    this.logEvent({ event: 'story_set', room_id: roomId, socket_id: client.id });
    this.server.to(this.roomKey(roomId)).emit('room:state', this.safeRoom(room));
    this.broadcastProgress(roomId, room);
  }

  @SubscribeMessage('deck:set')
  handleDeckSet(
    @MessageBody() payload: DeckSetPayload,
    @ConnectedSocket() client: Socket
  ) {
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
    // Reset votes when deck changes
    room.votes = {};
    this.logEvent({ event: 'deck_set', room_id: roomId, socket_id: client.id, deck: deckId });
    this.server.to(this.roomKey(roomId)).emit('room:state', this.safeRoom(room));
    this.broadcastProgress(roomId, room);
  }
}
