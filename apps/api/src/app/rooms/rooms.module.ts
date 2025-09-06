import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { TtlSweeperService } from './ttl-sweeper.service';
import { RoomsGateway } from './rooms.gateway';

@Module({
  providers: [RoomsService, TtlSweeperService, RoomsGateway],
  controllers: [RoomsController],
  exports: [RoomsService],
})
export class RoomsModule {}
