import { BadRequestException, Body, Controller, Post, Req } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomRequest, CreateRoomResponse } from '@scrum-poker/shared-types';
import type { Request } from 'express';
import * as crypto from 'node:crypto';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Post()
  create(@Body() body: CreateRoomRequest, @Req() req: Request): CreateRoomResponse {
    const hostName = body?.hostName?.trim();
    if (!hostName) {
      throw new BadRequestException('hostName is required');
    }
    type ReqWithSession = Request & { session?: { uid?: string } };
    const r = req as ReqWithSession;
    if (r.session && !r.session.uid) {
      r.session.uid = crypto.randomUUID();
    }
    const ownerSid = r.session?.uid ?? crypto.randomUUID();
    const room = this.rooms.create(hostName, ownerSid);
    return { id: room.id, expiresAt: room.expiresAt };
  }
}
