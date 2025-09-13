# Payload Validation (Zod)

WebSocket event payloads are validated with Zod in `RoomsGateway`:
- `room:join`, `vote:cast`, `vote:reveal`, `vote:reset`, `story:set`, `deck:set`.
- Oversized payloads (> 2 KB) are rejected with `room:error` (`invalid_payload`).

REST `POST /api/rooms` validates `hostName` and ties room ownership to a session uid.

Shared contracts live in `apps/shared-types`.

