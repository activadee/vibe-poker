# Redis Module (Nx library)

This workspace provides a reusable Nx library `@scrum-poker/redis` exposing a NestJS module and DI token for a singleton Redis client.

## Usage

- Import the module in any Nest app (e.g., RoomsModule) and use the exported client to construct repositories/services when `ROOMS_BACKEND=redis`.
- When `ROOMS_BACKEND` is not `redis`, the client resolves to `null` and no connection is created.

## Env

- `ROOMS_BACKEND`: `redis` to enable; otherwise defaults to `memory`.
- `REDIS_URL`: Connection string like `redis://host:6379`.
- `REDIS_USERNAME`, `REDIS_PASSWORD`: Optional ACL credentials sent to Redis when provided.

## Lifecycle

`RedisShutdownService` calls `QUIT` on the client during Nest shutdown to close the connection gracefully.

See `libs/redis/README.md` for library-specific notes.
