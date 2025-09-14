# FR-024: Custom Decks and Saved Presets (Room-level)

Scope
-- Add room-level custom decks with host-only management over WebSocket.

Contracts (shared-types)
- `type CustomDeck = { id: string; name: string; values: string[] }`
- `Room.customDecks?: CustomDeck[]`
- `deck:upsert` payload: `{ deck: CustomDeck }`
- `deck:delete` payload: `{ deckId: string }`
- `deck:set` payload (existing): `{ deckId: DeckId }`

Gateway (`RoomsGateway`)
- Validates with Zod and enforces host-only for `deck:upsert`, `deck:delete`, and `deck:set`.
- `deck:upsert` → `rooms.upsertCustomDeck()` then broadcast `room:state` (no progress change).
- `deck:delete` → `rooms.deleteCustomDeck()` then broadcast `room:state`.
- `deck:set` (existing) → `rooms.setDeck()` then `rooms.reset()` and broadcast `room:state` + `vote:progress`.

Validation limits
- Payload size cap remains 2KB.
- Name: non-empty, max 40.
- Values: 1–50 items; each 1–8 chars.

Service (`RoomsService`)
- `upsertCustomDeck(roomId, deck)` sanitizes and enforces unique deck name (case-insensitive) within the room (excluding the deck being updated) before delegating to the repository.
- `deleteCustomDeck(roomId, deckId)` removes a deck; if it was active, repository unsets `deckId`.

Repository
- InMemory and Redis implementations persist `customDecks` inside the `Room` JSON and preserve TTL.

Security & Privacy
- Host-only actions guarded, consistent with `story:set` and `deck:set`.
- `room:state` continues to omit votes and stats until reveal.

Testing
- Unit tests cover host-only guards, Zod validation, broadcast behavior, and round-tripping of `customDecks` via `room:state`.

