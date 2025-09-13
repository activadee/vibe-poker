# NFR-004: Privacy — Minimal Data & TTL

Goal: Store the bare minimum in memory and ensure all room data is deleted when its lifetime ends.

- No database is used. Rooms live only in-process in memory (`Map`).
- Room TTL is enforced at 24 hours from creation (`expiresAt`).
- A background sweeper runs every 60 seconds and removes expired rooms.
- Joining an expired room immediately deletes it and emits `room:error` with `code: 'expired'`.
- Server logs are structured and passed through redaction to avoid leaking secrets.

## Implementation

- In‑memory store and TTL: `apps/api/src/app/rooms/rooms.service.ts`
- Periodic cleanup: `apps/api/src/app/rooms/ttl-sweeper.service.ts`
- Join‑time expiry handling: `apps/api/src/app/rooms/rooms.gateway.ts`
- Redaction helper: `apps/api/src/app/security/redact.ts`

## Tests (DoD)

- Service TTL logic: `apps/api/src/app/rooms/rooms.service.spec.ts`
- Sweeper interval + cleanup: `apps/api/src/app/rooms/ttl-sweeper.service.spec.ts`
- Expired join path: `apps/api/src/app/rooms/rooms.gateway.spec.ts`

## Operations

- Run unit tests: `nx run-many -t test --all`
- Run linter: `nx run-many -t eslint:lint --all`

## Notes

- TTL is fixed to 24h for the MVP. If configurability is needed later, expose an env like `ROOM_TTL_HOURS` and thread it through `RoomsService`.
- In multi‑instance deployments, data is still per‑process. Scaling would require a distributed store; that’s explicitly out of scope for this NFR.

