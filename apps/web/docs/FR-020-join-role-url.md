Title: FR-020 — Join role via URL param and invite text

Summary
- Provide explicit room join links for user and observer by appending a `role` URL param.
- Update “Copy Link” to copy a full invite text including both links.

Details
- Routing: Room route remains `/r/:roomId`. The app now understands a query `?role=user|observer` to preselect and optimize the join flow.
- Lobby join: When joining from the lobby, we always navigate with an explicit role param:
  - Observer → `/r/:roomId?role=observer`
  - User → `/r/:roomId?role=user`
- Room share links: The room view continues to show the standard room URL and a “Copy Link” button. Clicking it copies a formatted invite containing both explicit links:
  - `Join this room:`
  - `Join as observer: <origin>/r/<roomId>?role=observer`
  - `Join as user: <origin>/r/<roomId>?role=user`

Implementation
- Read param: `apps/web/src/app/room/room.component.ts` reads `role` from the route and preselects the observer checkbox when `role=observer`.
- Share links: Added `shareUrlObserver` and `shareUrlUser` computed helpers and a `buildShareUrl()` method. The template still shows the base URL; only the clipboard content changes.
- Lobby navigation: `apps/web/src/app/lobby/lobby.component.ts` now always includes a `role` query param when navigating to a room.

Tests
- Updated lobby join tests to expect `role=user` by default and `role=observer` when checkbox is selected.
- Added a room test to verify `copyLink()` writes a formatted invite containing both explicit URLs.

Files
- apps/web/src/app/lobby/lobby.component.ts
- apps/web/src/app/lobby/lobby.component.spec.ts
- apps/web/src/app/room/room.component.ts
- apps/web/src/app/room/room.component.html
- apps/web/src/app/room/room.component.spec.ts

User Notes
- Users can share either link depending on whether the invitee should join as a voter or an observer. The role can still be changed before joining.
