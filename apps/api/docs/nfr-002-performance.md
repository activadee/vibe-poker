# NFR-002 — Performance

Goal: P95 reveal latency ≤ 250 ms within region; support 100 participants per room and 1000 concurrent overall on staging hardware.

## Implemented

- WS compression disabled at engine level (per-message deflate off).
- Payloads minimized for `room:state` (omit heavy fields before reveal).
- Basic perf counters:
  - Per-event handler timings (e.g., `ws_handler.vote_reveal`).
  - Emit timings for progress updates (`ws_emit.vote_progress`).
  - Socket connection gauge (`sockets.connected`).
- Metrics endpoint: `GET /metrics` returns counters and timing snapshots (p50/p95/avg/min/max).

## Load Testing

- Script: `tasks/loadtest/socketio-room-100.js`
- Usage example:
  - `node tasks/loadtest/socketio-room-100.js --api=http://localhost:3000 --count=100 --path=/api/socket.io`
  - Creates a room (captures host session), spawns clients, casts votes, triggers reveal, records client-observed reveal latency.
- Output: JSON written to `tasks/loadtest/out/`.

## How to Verify

1. Start API + Web: `npm run dev`.
2. Run the load script for 100 users.
3. Inspect `GET /metrics` for timing p95 values of `ws_handler.vote_reveal`.
4. Confirm client-observed `reveal_last_ms` in the load report ≤ 250 ms on staging.

## Notes

- With compression disabled, CPU cost per message drops; payload minimization keeps bandwidth modest.
- `room:state` omits votes and stats until reveal; after reveal, includes `votes` and computed `stats` only.

