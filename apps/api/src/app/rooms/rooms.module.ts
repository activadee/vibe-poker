import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { TtlSweeperService } from './ttl-sweeper.service';
import { RoomsGateway } from './rooms.gateway';
import { PerfService } from '../perf/perf.service';
import { LoggingService } from '../logging/logging.service';
import { ROOMS_REPOSITORY } from './repository/tokens';
import { InMemoryRoomsRepository } from './repository/in-memory.repository';
import { RedisModule, REDIS_CLIENT } from '@scrum-poker/redis';

@Module({
  imports: [RedisModule.forRoot()],
  providers: [
    {
      provide: ROOMS_REPOSITORY,
      inject: [REDIS_CLIENT],
      useFactory: (redis: unknown) => {
        const backend = (process.env.ROOMS_BACKEND || 'memory').toLowerCase();
        if (backend === 'redis') {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { RedisRoomsRepository } = require('./repository/redis.repository');
          if (!redis) {
            const isTest = process.env.NODE_ENV === 'test';
            if (isTest) return new InMemoryRoomsRepository();
            throw new Error(
              'REDIS_CLIENT unavailable while ROOMS_BACKEND=redis. ' +
                'Set REDIS_URL (and optionally REDIS_USERNAME/REDIS_PASSWORD) or switch ROOMS_BACKEND=memory.'
            );
          }
          return new RedisRoomsRepository(redis as any);
        }
        return new InMemoryRoomsRepository();
      },
    },
    RoomsService,
    TtlSweeperService,
    RoomsGateway,
    PerfService,
    LoggingService,
  ],
  controllers: [RoomsController],
  exports: [RoomsService, PerfService, LoggingService],
})
export class RoomsModule {}
