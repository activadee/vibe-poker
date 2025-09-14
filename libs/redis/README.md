# @scrum-poker/redis

Nx library that provides a Redis client module for NestJS apps.

## Exports

- `RedisModule.forRoot()` – registers a singleton client under `REDIS_CLIENT`.
- `REDIS_CLIENT` – DI token for the client instance.

## Behavior

- If `ROOMS_BACKEND=redis`, the module instantiates a client using `REDIS_URL`.
- Otherwise the provider resolves to `null`.
- On Nest shutdown the client is gracefully quit.

### Authentication

- Optional envs: `REDIS_USERNAME`, `REDIS_PASSWORD`.
- If set, they are passed to the ioredis constructor along with `REDIS_URL`.

## Tests

Unit tests use `ioredis-mock` and verify both memory-default and redis modes.
