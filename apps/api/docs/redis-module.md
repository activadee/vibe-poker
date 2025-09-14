# RedisModule

Provides a singleton Redis client via NestJS DI with token `REDIS_CLIENT`.

## Usage

- The module is imported by `RoomsModule` and exported client is used to construct `RedisRoomsRepository` when `ROOMS_BACKEND=redis`.
- When `ROOMS_BACKEND` is not `redis`, the client resolves to `null` and no connection is created.

## Env

- `ROOMS_BACKEND`: `redis` to enable; otherwise defaults to `memory`.
- `REDIS_URL`: Connection string like `redis://host:6379`.

## Lifecycle

`RedisShutdownService` calls `QUIT` on the client during Nest shutdown to close the connection gracefully.

