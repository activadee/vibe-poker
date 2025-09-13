import { BadRequestException, Body, Controller, Post, Req } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomRequest, CreateRoomResponse } from '@scrum-poker/shared-types';
import type { Request } from 'express';
import * as crypto from 'node:crypto';
import { PerfService } from '../perf/perf.service';
import { LoggingService } from '../logging/logging.service';

@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly rooms: RoomsService,
    private readonly perf: PerfService,
    private readonly logging: LoggingService
  ) {}

  @Post()
  create(@Body() body: CreateRoomRequest, @Req() req: Request): CreateRoomResponse {
    const stop = this.perf.start('http.rooms_create');
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
    const latencyMs = stop({ id: room.id });
    const correlationId = ((req.headers as Record<string, unknown> | undefined)?.['x-correlation-id'] as string | undefined) || ownerSid;
    this.logging.event('room_create', { room_id: room.id }, { correlationId, latencyMs });
    return { id: room.id, expiresAt: room.expiresAt };
  }
}
