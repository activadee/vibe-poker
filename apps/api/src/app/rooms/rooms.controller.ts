import {
  BadRequestException,
  Body,
  Controller,
  Post,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomRequest, CreateRoomResponse } from '@scrum-poker/shared-types';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Post()
  create(@Body() body: CreateRoomRequest): CreateRoomResponse {
    const hostName = body?.hostName?.trim();
    if (!hostName) {
      throw new BadRequestException('hostName is required');
    }
    const room = this.rooms.create(hostName);
    return { id: room.id, expiresAt: room.expiresAt };
  }
}
