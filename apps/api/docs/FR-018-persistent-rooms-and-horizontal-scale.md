# FR-018: Persistent Rooms (Redis) and Horizontal Scale

Goal: Persist room state across API restarts and support multi-instance deployments by sharing state in Redis and propagating Socket.IO events via the official Redis adapter.

## Summary

- Introduces a `RoomsRepository` abstraction with two implementations:
  - `InMemoryRoomsRepository` – default for local/dev.
  - `RedisRoomsRepository` – production default (opt-in via env).
- Refactors `RoomsService` to use the repository and exposes async methods for state changes.
- Enables the `@socket.io/redis-adapter` when Redis backend is active to fan out WS events between pods.
- TTL is enforced by Redis when active; the background sweeper remains for dev and acts as a guardrail.

## Configuration

- `ROOMS_BACKEND` – `memory` (default) or `redis`.
- `REDIS_URL` – Redis connection string (e.g., `redis://localhost:6379`). Required when `ROOMS_BACKEND=redis`.

## Storage Model

- Each room is stored under a single JSON key and TTL:
  - `room:{id}` – serialized `Room` object with `PEXPIREAT = expiresAt`.
  - `room:{id}:owner` – session uid of the creator, TTL matches the room.
- Operations (`addParticipant`, `castVote`, `reset`, `setStory`, `setDeck`, `setRevealed`) read-modify-write the `room:{id}` document.

Note: The model favors simplicity and atomicity over fine-grained structures; it can be normalized later if required.

## Socket.IO Cluster Adapter

When `ROOMS_BACKEND=redis` and `REDIS_URL` are set, the gateway enables the Redis adapter:

```ts
// Prefer DI: inject REDIS_CLIENT and duplicate it
const pub = injectedRedisClient; // from DI
const sub = pub.duplicate();
io.adapter(createAdapter(pub, sub));
```

This preserves current CORS and rate limit behavior and makes `server.to(roomId).emit(...)` reach clients connected to any instance.

## Rollback

Set `ROOMS_BACKEND=memory` to revert to in-memory storage. No API changes are required.

## Tests

- Repository contract tests cover both memory and Redis (using `ioredis-mock`).
- Existing service, gateway, controller, and sweeper tests were adapted to async service methods.
