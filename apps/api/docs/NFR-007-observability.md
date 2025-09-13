# NFR-007: Observability (Structured Logs & Basic Metrics)

Goal: Operators can see room creation, joins, votes, reveals in logs with correlation IDs. JSON logs include `room_id`, `socket_id`, `event`, `latency_ms`. A `/api/metrics` endpoint exposes lightweight counters and timing snapshots.

## What Was Added

- LoggingService based on `pino` with:
  - JSON output to stdout (production-friendly)
  - Secret redaction using the existing `redactSecrets` utility
  - Correlation ID support via AsyncLocalStorage and explicit overrides
  - Standard fields: `event`, optional `correlation_id`, optional `latency_ms`

- Correlation middleware (`correlation.middleware.ts`):
  - Reads `x-correlation-id`/`x-request-id` or generates one.
  - Sets `x-correlation-id` response header.
  - Binds the correlation ID for the request lifetime.

- WebSocket correlation:
  - Derives correlation ID from `handshake.headers['x-correlation-id']`, or session UID, or falls back to the socket ID.
  - All WS event logs include this correlation ID.

- Event coverage
  - `room_create` (HTTP: `POST /api/rooms`)
  - `room_join`, `room_leave`, `vote_cast`, `vote_reveal`, `vote_reset`, `story_set`, `deck_set`, `socket_connected`
  - Each handler logs after completing core work and includes `latency_ms` from `PerfService`.

- Metrics endpoint
  - `/api/metrics` returns counters and timing quantiles plus lightweight room stats (total rooms, total/max participants).

## Key Files

- `apps/api/src/app/logging/logging.service.ts` — Pino-based logger with redaction and correlation support
- `apps/api/src/app/logging/correlation.middleware.ts` — Express middleware for correlation IDs
- `apps/api/src/app/perf/perf.service.ts` — emits `timing` events with `latency_ms` via the LoggingService
- `apps/api/src/app/rooms/rooms.controller.ts` — logs `room_create` with correlation
- `apps/api/src/app/rooms/rooms.gateway.ts` — logs all WS events with correlation and `latency_ms`
- `apps/api/src/main.ts` — wires correlation middleware

## Testing (TDD)

- New tests validate logging behavior and presence of fields:
  - `logging.service.spec.ts` — correlation and redaction
  - `rooms.logging.http.spec.ts` — HTTP room creation logging
  - `rooms.logging.ws.spec.ts` — WS join and reveal logging
  - Existing tests continue to pass.

Run:

```
npm test
npm run lint
```

## Operational Notes

- Logs are JSON on stdout; ingest with your platform’s logging agent.
- Correlation ID precedence for each request:
  1) `x-correlation-id`/`x-request-id` header if present
  2) Middleware-generated UUID (stored in AsyncLocalStorage)
  3) Fallbacks for WS only: session UID, then socket id
  All logs for the same HTTP request now reuse the same correlation ID (including timing + event logs).
- Provide `x-correlation-id` from the client or reverse proxy to thread related actions.
- Sensitive keys (e.g., `token`, `password`, `secret`, `authorization`, `cookie`) are redacted.
