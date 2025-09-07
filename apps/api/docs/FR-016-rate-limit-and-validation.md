Title: FR-016 — Rate limiting & payload validation

Summary
- Adds per-socket and per-IP token-bucket rate limiting for sensitive WebSocket events: `room:join`, `vote:cast`, `vote:reveal`, `vote:reset`.
- Adds strict payload validation using Zod and a 2KB payload size limit. Invalid or oversized payloads emit `room:error` with `invalid_payload` and are dropped.

Rate limiting
- Policy: 5 operations/second per socket, 8 operations/second per IP. Buckets refill every second.
- On limit exceed: emit `room:error` with code `rate_limited` and drop the event.
- Scope: `room:join`, `vote:cast`, `vote:reveal`, `vote:reset`.

Payload validation
- Zod schemas enforce minimal shape for all handled events.
- Size guard: any payload over 2KB is rejected with `invalid_payload`.
- Story and deck events validate structure; server still sanitizes story content and generates an `id` when missing.

Implementation notes
- The limiter is a simple in-memory token bucket in `RoomsGateway` and is not distributed. For multi-instance deployments consider moving to a shared store (e.g. Redis) or an upstream limiter.
- Error codes: `rate_limited` added to `RoomErrorEvent` shared contract.

Tests
- Added unit tests covering per-socket and per-IP limits and oversized payload rejection in `apps/api/src/app/rooms/rooms.gateway.spec.ts`.

Operations
- No configuration changes required. Limits can be tuned via constants in `RoomsGateway`.
