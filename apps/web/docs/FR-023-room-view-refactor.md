# FR-023 Room View Refactor (Design System)

Goal: Align the Room UI with the design system primitives and the provided reference layouts (player/host). The refactor replaces ad-hoc CSS with Tailwind utilities and shared UI directives/components.

## Summary

- Rebuilt the Room view layout using:
  - `button[appUiButton]` for all actions (primary/secondary, sm sizes).
  - `input[appUiInput]`, `textarea[appUiInput]`, and `input[appUiCheckbox]` for form controls.
  - `<app-ui-card>` to group Story, Voting, Participants, Host Controls, and Share/Actions.
- Preserved accessibility and keyboard interactions for vote cards.
- Kept existing behaviors for join modal, sharing, voting, and host actions.

## Files

- Updated
  - `apps/web/src/app/room/room.component.ts` (imports UI primitives)
  - `apps/web/src/app/room/room.component.html` (new layout + design system usage)
  - `apps/web/src/app/room/room.component.scss` (trimmed; modal overlay + small badges)
  - `apps/web/src/app/room/room.component.spec.ts` (selectors updated to `appUiButton` and `.host-controls`)
- Added
  - `apps/web/docs/FR-023-room-view-refactor.md` (this file)

## UI Notes

- Join Modal
  - Uses `<app-ui-card>`, `appUiInput` for name, `appUiCheckbox` for observer toggle, and `appUiButton` for actions.
- Story
  - Host sees editable Title/Notes with `appUiInput` and a secondary Save button.
  - Players see a read-only view.
- Voting
  - Uses existing `<app-vote-cards>`; disabled for observers, keyboard-friendly.
- Participants
  - Shows progress pill when voting is in progress and stats pill when revealed.
  - Displays per-user vote after reveal; otherwise shows muted dash.
- Host Controls
  - Deck preset dropdown (`.deck-select select`) kept for tests.
  - Reveal/Reset before reveal, Revote after reveal.
- Share/Actions
  - Shows truncated room URL with Copy Invite and Leave Room buttons.

## Behavior (unchanged)

- Auto-join logic based on saved name and query params.
- `copyLink()` copies both role-based invite URLs.
- `revote()` clears local selection (via `VoteCardsComponent.clearSelection()`).
- `changeDeck()` emits `deck:set` and updates vote cards when server changes deck.

## Testing

- Updated unit tests for Room to match new selectors and structure.
- All tests pass: `nx test web`.

## Lint/Build

- Lint passes with only test-file warnings (allowed): `nx run web:lint`.
- Build succeeds: `nx build web`.

## Usage

No changes to routing or APIs. Run locally:

- `nx serve web` – open `/r/<roomId>`.
- `nx test web` – run unit tests.
- `nx run web:lint` – lint the app.
