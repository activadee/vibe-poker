import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { TtlSweeperService } from './ttl-sweeper.service';
import { RoomsGateway } from './rooms.gateway';
import { PerfService } from '../perf/perf.service';

@Module({
  providers: [RoomsService, TtlSweeperService, RoomsGateway, PerfService],
  controllers: [RoomsController],
  exports: [RoomsService, PerfService],
})
export class RoomsModule {}
