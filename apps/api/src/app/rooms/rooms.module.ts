import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { TtlSweeperService } from './ttl-sweeper.service';

@Module({
  providers: [RoomsService, TtlSweeperService],
  controllers: [RoomsController],
  exports: [RoomsService],
})
export class RoomsModule {}

