Title: FR-017 — Host deck presets (Fibonacci, T‑Shirt)

Summary
- Host can switch the room’s deck preset between Fibonacci and T‑Shirt sizes.
- On change, the UI updates instantly for all participants (no refresh).
- Server clears all votes on deck change so the round restarts.

UI
- Location: Host Controls section in the room view.
- Control: “Deck Preset” select with options:
  - Fibonacci
  - T‑Shirt sizes
- When changed, the client emits `deck:set` with `{ deckId }`.
- Vote cards reflect the selected preset:
  - Fibonacci: `['1','2','3','5','8','13','21','?','☕']`
  - T‑Shirt: `['XS','S','M','L','XL','?','☕']`
- Local card highlight is cleared on deck change to avoid stale selection.

Implementation
- Component: `apps/web/src/app/room/room.component.ts` + `.html`.
  - `deckId` is part of room state; `deckValues()` maps it to the card list.
  - Host action `changeDeck(deckId)` emits the socket event.
  - In `room:state`, if `deckId` changes, clears local selection via `VoteCardsComponent.clearSelection()`.
- Vote cards: `apps/web/src/app/vote-cards/vote-cards.component.ts`
  - Uses Angular input signals for `values` and `disabled` to react instantly to changes: `values = input<string[]>(...)`, `disabled = input<boolean>(false)`.
  - The deck preset `[values]` binding from the room updates the rendered cards without reload.

Tests
- Added to `apps/web/src/app/room/room.component.spec.ts`:
  - Renders deck dropdown for host and emits `deck:set` on change.
  - Updates vote card values when server changes `deckId` and clears selection.

Operations
- Run tests: `nx run web:test`
- Lint: `nx run web:eslint:lint`
