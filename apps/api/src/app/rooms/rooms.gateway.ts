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
    const participant: Participant = {
      id: client.id,
      name,
      role: 'player',
    };
    const updated = this.rooms.addParticipant(roomId, participant);
    this.logEvent({ event: 'room_join', room_id: roomId, name, socket_id: client.id });

    // Broadcast state to all in room (including the joiner)
    this.server.to(this.roomKey(roomId)).emit('room:state', updated);
  }

  handleDisconnect(client: Socket) {
    const roomId = this.socketRoom.get(client.id);
    if (!roomId) return;
    this.socketRoom.delete(client.id);
    const room = this.rooms.removeParticipant(roomId, client.id);
    if (!room) return;
    this.logEvent({ event: 'room_leave', room_id: roomId, socket_id: client.id });
    this.server.to(this.roomKey(roomId)).emit('room:state', room);
  }
}
