import { DynamicModule, Module, OnModuleDestroy } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.tokens';

// Small helper to gracefully quit Redis on shutdown
class RedisShutdownService implements OnModuleDestroy {
  constructor(private readonly client: Redis | null) {}
  async onModuleDestroy() {
    try {
      if (this.client) await this.client.quit();
    } catch {
      // ignore
    }
  }
}

@Module({})
export class RedisModule {
  static forRoot(): DynamicModule {
    const clientProvider = {
      provide: REDIS_CLIENT,
      useFactory: (): Redis | null => {
        const backend = (process.env.ROOMS_BACKEND || 'memory').toLowerCase();
        if (backend !== 'redis') return null;
        // Lazy require to avoid hard dependency when not using Redis
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const RedisLib = require('ioredis');
        const url = process.env.REDIS_URL || 'redis://localhost:6379';
        return new RedisLib(url) as unknown as Redis;
      },
    } as const;

    const shutdownProvider = {
      provide: RedisShutdownService,
      useFactory: (client: Redis | null) => new RedisShutdownService(client),
      inject: [REDIS_CLIENT],
    };

    return {
      module: RedisModule,
      providers: [clientProvider, shutdownProvider],
      exports: [clientProvider],
    };
  }
}
