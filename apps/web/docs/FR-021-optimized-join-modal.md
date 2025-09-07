Title: FR-021 — Optimized join flow via modal

Summary
- Present a modal to capture the user’s display name and whether to join as an observer when deep‑linking into a room.
- Only show the modal if all of the following are true:
  - No username is found in local storage.
  - The current user is not the host (implicit before joining).
  - The URL does not include an explicit `role=player|observer` query param.

Details
- Route: `/r/:roomId` remains unchanged.
- Detection: On entering the room route, `RoomComponent` checks `localStorage.displayName` and the `role` query param.
  - If `role=observer`, the observer checkbox is preselected and the modal is suppressed.
  - If `role=player`, the modal is suppressed.
  - Otherwise, and if no saved username exists, the join modal opens.
Backward compatibility
- If older links use `role=player`, they behave as the explicit voter role and suppress the modal as expected.

Implementation
- UI: A lightweight modal overlay is rendered from `RoomComponent` (`.modal-backdrop` + `.modal`).
- State: `showJoinModal` signal controls visibility. It is set on route change based on the above conditions.
- Join: Clicking “Join Room” saves the display name, applies the observer role if selected, emits `room:join`, and closes the modal. The final joined state is confirmed via `room:state` from the server.

Files
- apps/web/src/app/room/room.component.ts
- apps/web/src/app/room/room.component.html
- apps/web/src/app/room/room.component.scss

Tests
- Updated room tests to check for the presence of the join modal when deep‑linking without a saved name.
- Added expectations for the `role=player` share and lobby links.

User Notes
- If you already saved your name on this device or join via a link with `?role=player` or `?role=observer`, the modal will not appear.
