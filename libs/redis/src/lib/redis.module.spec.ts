/**
 * Redis library tests (TDD)
 * Mock ioredis with a jest.fn that wraps ioredis-mock to capture constructor args
 */
jest.mock('ioredis', () => {
  const Real = require('ioredis-mock');
  return jest.fn(function (this: unknown, ...args: unknown[]) {
    // @ts-ignore - construct ioredis-mock with same args
    return new Real(...args);
  });
});

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
    process.env.ALLOW_REDIS_IN_TEST = 'true';
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

  it('passes REDIS_USERNAME and REDIS_PASSWORD to the client when provided', async () => {
    const RedisCtor = require('ioredis') as jest.Mock;
    RedisCtor.mockClear();
    process.env.ROOMS_BACKEND = 'redis';
    process.env.ALLOW_REDIS_IN_TEST = 'true';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.REDIS_USERNAME = 'default';
    process.env.REDIS_PASSWORD = 's3cr3t';

    const moduleRef = await Test.createTestingModule({
      imports: [RedisModule.forRoot()],
    }).compile();
    // touch client to ensure construction
    const client = moduleRef.get<Redis | null>(REDIS_CLIENT);
    expect(client).toBeTruthy();
    // Verify constructor was called with URL and options containing credentials
    expect(RedisCtor).toHaveBeenCalled();
    const call = RedisCtor.mock.calls[0];
    expect(call[0]).toBe('redis://localhost:6379');
    expect(call[1]).toEqual(expect.objectContaining({ username: 'default', password: 's3cr3t' }));
    await moduleRef.close();
  });
});
