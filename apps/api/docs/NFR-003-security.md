# NFR-003 — Security hardening

Epic: Validation, CORS, rate limits. Goal: sane defaults to prevent common issues.

## Summary
- CORS allowlist via `CORS_ALLOWLIST` env (comma‑separated origins).
- Zod validation for WebSocket events (join, vote, reveal, reset, story:set, deck:set).
- Event rate limits (token buckets: per‑socket and per‑IP) as per FR‑016.
- Secrets redacted in logs across services.

## CORS
- Set `CORS_ALLOWLIST` to a comma‑separated list of origins, e.g.
  - `CORS_ALLOWLIST="http://localhost:4200, https://app.example.com"`
- HTTP: applied in `main.ts` via `applyCorsToNest()`.
- WebSocket: applied in `RoomsGateway.afterInit()` via `applyCorsToSocket()`.

## Validation
- Zod schemas in `RoomsGateway` enforce payload shape and size caps (2KB/event).
- REST `POST /api/rooms` validates `hostName` and binds ownership to session uid.

## Rate limiting
- Implemented in `RoomsGateway` as token buckets (see `FR-016-rate-limit-and-validation.md`).
- Limits sensitive events: `room:join`, `vote:cast`, `vote:reveal`, `vote:reset`.

## Log redaction
- All structured logs pass through `redactSecrets` to mask keys like `secret`, `password`, `token`, `authorization`, `cookie`, `apiKey`, `session`.
- Applied in `RoomsGateway`, `RoomsService`, and timing logs in `PerfService`.

## QA — ASVS subset checklist
- [ ] Verify CORS only allows configured origins in both HTTP and WS paths.
- [ ] Verify WS payloads reject invalid/oversized inputs with `room:error`.
- [ ] Verify rate limits emit `rate_limited` and block excess events.
- [ ] Inspect logs to confirm secrets are redacted (`[REDACTED]`).

