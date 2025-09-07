Title: FR-017 — Deck presets and deck:set

Summary
- Adds deck preset switching via WebSocket event `deck:set`.
- When the host switches decks, the server updates `room.deckId` and clears all stored votes so everyone starts fresh.
- Broadcasts `room:state` immediately so clients update UI without refresh, and emits `vote:progress` reset.

Contract
- Event: `deck:set`
  - Payload: `{ deckId: 'fibonacci' | 'tshirt' | string }`
  - Auth: host-only. Non-hosts receive `room:error` with `code: 'forbidden'`.
  - Validation: `deckId` must be a non-empty string.

Behavior
- On success:
  - `room.deckId` is set to the requested preset id.
  - The round is reset: `revealed = false`, `votes = {}`, and any `stats` removed.
  - Emits `room:state` with the updated room (votes/stats omitted until reveal).
  - Emits `vote:progress` with counts recomputed (typically reset to 0/Y).

Implementation
- Handler: `apps/api/src/app/rooms/rooms.gateway.ts` in `handleDeckSet()`.
- Types: `DeckId` in `apps/shared-types/src/lib/domain.ts` and payload contract in `apps/shared-types/src/lib/ws-contracts.ts`.

Tests
- Added unit tests in `apps/api/src/app/rooms/rooms.gateway.spec.ts`:
  - Host can set deck, votes are cleared, and progress resets.
  - Non-host blocked with `forbidden`.
  - Invalid payload rejected with `invalid_payload`.

Operations
- Run tests: `nx run api:test`
- Lint: `nx run api:eslint:lint`
