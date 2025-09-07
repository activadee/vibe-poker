# FR-015: Room TTL Sweeper

Goal: Ensure rooms expire automatically after 24h to bound memory.

- TTL: 24 hours from room creation (`expiresAt`).
- Sweeper: Background interval runs every 60 seconds to remove expired rooms.
  - Implementation: `apps/api/src/app/rooms/ttl-sweeper.service.ts`
  - Registered in: `apps/api/src/app/rooms/rooms.module.ts`
- Join handling: When a client attempts to join an expired room, the server
  deletes the room and emits `room:error` with:
  - `code: 'expired'`
  - `message: 'This room has expired. Please create a new room.'`
  - Implementation: `apps/api/src/app/rooms/rooms.gateway.ts`
- Contract update: `RoomErrorEvent['code']` includes `'expired'` in
  `apps/shared-types/src/lib/ws-contracts.ts`.

## Tests

- Sweeper interval + cleanup: `apps/api/src/app/rooms/ttl-sweeper.service.spec.ts`
- Expired join path: `apps/api/src/app/rooms/rooms.gateway.spec.ts`
- TTL enforcement in service: `apps/api/src/app/rooms/rooms.service.spec.ts`

## Operations

- Run tests: `nx run-many -t test --all`
- Lint: `nx run-many -t eslint:lint --all`

