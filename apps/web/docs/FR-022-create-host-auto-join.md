Title: FR-022 — Auto-join host after creating a room

Summary
- After creating a room, the creator is auto-joined as host to avoid a blank screen and reduce friction.

Details
- Lobby navigation: Upon successful room creation, the app navigates to `/r/:roomId?host=1`.
- Room handling: `RoomComponent` detects `host=1` and a saved display name, then calls `join()` automatically.
- Server logic: The API seeds a placeholder host (by name) when creating a room. On join, the server promotes the connecting socket to `host` if the name matches the placeholder.

Implementation
- apps/web/src/app/lobby/lobby.component.ts
  - After creating, navigate with `queryParams: { host: '1' }`.
- apps/web/src/app/room/room.component.ts
  - Reads `host=1` and calls `join()` if a saved name exists.
  - Modal conditions remain unchanged for deep links: the modal is shown only when there is no saved name and `role` is not `player|observer`.

Tests
- apps/web/src/app/lobby/lobby.component.spec.ts
  - Updated to expect navigation with `{ host: '1' }` after room creation.
- apps/web/src/app/room/room.component.spec.ts
  - Added a test that simulates `host=1` and verifies `join()` is called automatically.

User Notes
- Creating a room takes you straight into the session as host, using your provided name.
- Deep-link join behavior is unchanged; teammates still get the modal when appropriate unless the URL includes an explicit `role`.
