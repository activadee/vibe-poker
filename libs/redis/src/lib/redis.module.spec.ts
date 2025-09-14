/**
 * Redis library tests (TDD)
 */
jest.mock('ioredis', () => require('ioredis-mock'));

import { Test } from '@nestjs/testing';
import type Redis from 'ioredis';
import { RedisModule } from './redis.module';
import { REDIS_CLIENT } from './redis.tokens';

describe('@scrum-poker/redis', () => {
  const prevEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...prevEnv };
  });

  it('provides null client when backend is memory (default)', async () => {
    delete process.env.ROOMS_BACKEND;
    const moduleRef = await Test.createTestingModule({
      imports: [RedisModule.forRoot()],
    }).compile();
    const client = moduleRef.get<Redis | null>(REDIS_CLIENT);
    expect(client).toBeNull();
  });

  it('creates a singleton Redis client when backend is redis', async () => {
    process.env.ROOMS_BACKEND = 'redis';
    process.env.REDIS_URL = 'redis://localhost:6379';
    const moduleRef = await Test.createTestingModule({
      imports: [RedisModule.forRoot()],
    }).compile();
    const a = moduleRef.get<Redis | null>(REDIS_CLIENT);
    const b = moduleRef.get<Redis | null>(REDIS_CLIENT);
    expect(a).toBeTruthy();
    expect(b).toBe(a);
    await a!.set('k', 'v');
    const v = await a!.get('k');
    expect(v).toBe('v');
    await moduleRef.close();
  });
});

