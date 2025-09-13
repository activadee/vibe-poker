# CORS Allowlist

Configure allowed web origins via the `CORS_ALLOWLIST` environment variable.

- Format: comma‑separated list of origins (scheme + host + optional port)
- Example:
  - `CORS_ALLOWLIST="http://localhost:4200, https://app.example.com"`

Applies to:
- HTTP REST (Nest) — see `applyCorsToNest` in `apps/api/src/app/security/cors.ts`.
- WebSocket (Socket.IO) — see `applyCorsToSocket` in the same module.

Behavior:
- When unset/empty, CORS is disabled (no cross‑origin allowed).
- `*` allows any origin (not recommended for production).

