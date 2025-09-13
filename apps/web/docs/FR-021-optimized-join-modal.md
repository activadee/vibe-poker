Title: FR-021 — Optimized join flow via modal

Summary
- Present a modal to capture the user’s display name and whether to join as an observer when deep‑linking into a room.
- Always show the modal when no display name is saved, regardless of URL params.

Details
- Route: `/r/:roomId` remains unchanged.
- Detection: On entering the room route, `RoomComponent` checks `localStorage.displayName` and the `role` query param.
  - If `role=observer`, the observer checkbox is preselected.
  - If `role=player`, the player role is assumed.
  - If no saved username exists, the join modal opens (even for explicit role links) so first‑time visitors can enter a name.
Notes
- Explicit role links still preselect role; they no longer suppress the join modal when the user has no saved name.

Implementation
- UI: A lightweight modal overlay is rendered from `RoomComponent` (`.modal-backdrop` + `.modal`).
- State: `showJoinModal` signal controls visibility. It is set on route change based on the above conditions.
- Join: Clicking “Join Room” saves the display name, applies the observer role if selected, emits `room:join`, and closes the modal. The final joined state is confirmed via `room:state` from the server.

Files
- apps/web/src/app/room/room.component.ts
- apps/web/src/app/room/room.component.html
- apps/web/src/app/room/room.component.css

Tests
- Updated room tests to check for the presence of the join modal when deep‑linking without a saved name.
- Added expectations for the `role=player` share and lobby links.

User Notes
- If you already saved your name on this device, the app auto‑joins. Otherwise, the modal appears for name entry.
