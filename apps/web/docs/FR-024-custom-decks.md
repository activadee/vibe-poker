# FR-024: Custom Decks and Saved Presets (Room-level)

Summary
- Hosts can create, edit, delete, and select custom vote decks per room.
- Selecting any deck (preset or custom) clears votes, unreveals, and updates all clients.

UI
- Host Controls show a "Deck" select grouped as Presets (Fibonacci, T‑Shirt) and Custom (room decks).
- Manage actions are wired via component helpers (`saveCustomDeck`, `deleteCustomDeck`) which emit socket events.

Events
- `deck:upsert` → `{ deck: { id, name, values[] } }` (host-only)
- `deck:delete` → `{ deckId }` (host-only)
- `deck:set` → `{ deckId }` (host-only, clears votes via server reset)

Validations
- Name: non-empty, max 40 chars.
- Values: 1–50 items; each value non-empty, max 8 chars.

State
- `Room.customDecks?: { id: string; name: string; values: string[] }[]` is included in `room:state`.
- When `room.deckId` matches a custom deck id, vote cards render using that deck’s values.

Accessibility
- No changes to card focus/keyboard handling; `VoteCardsComponent` still manages focus and selection.

Notes
- Decks are room-local and expire with the room TTL. Future work can introduce user/workspace-level presets.

