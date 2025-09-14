import { DynamicModule, Module, OnModuleDestroy } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.tokens';

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
        const isTest = process.env.NODE_ENV === 'test';
        const allowInTest = process.env.ALLOW_REDIS_IN_TEST === 'true';
        if (backend !== 'redis') return null;
        if (isTest && !allowInTest) return null;
        // Lazy require to avoid hard dependency when not using Redis
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const RedisLib = require('ioredis');
        const url = process.env.REDIS_URL || 'redis://localhost:6379';
        const username = (process.env.REDIS_USERNAME || '').trim();
        const password = (process.env.REDIS_PASSWORD || '').trim();
        const opts: Record<string, unknown> = {};
        if (username) opts.username = username;
        if (password) opts.password = password;
        // Pass options only when provided to avoid affecting default behavior
        return Object.keys(opts).length > 0
          ? (new RedisLib(url, opts) as unknown as Redis)
          : (new RedisLib(url) as unknown as Redis);
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
