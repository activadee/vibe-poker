import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { TtlSweeperService } from './ttl-sweeper.service';
import { RoomsGateway } from './rooms.gateway';
import { PerfService } from '../perf/perf.service';
import { LoggingService } from '../logging/logging.service';

@Module({
  providers: [RoomsService, TtlSweeperService, RoomsGateway, PerfService, LoggingService],
  controllers: [RoomsController],
  exports: [RoomsService, PerfService, LoggingService],
})
export class RoomsModule {}
