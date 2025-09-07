Title: FR-020 — Join role via URL param and invite text

Summary
- Provide explicit room join links for user and observer by appending a `role` URL param.
- Update “Copy Link” to copy a full invite text including both links.

Details
- Routing: Room route remains `/r/:roomId`. The app now understands a query `?role=player|observer` to preselect the role on the join form.
- Lobby join: When joining from the lobby, we always navigate with an explicit role param:
  - Observer → `/r/:roomId?role=observer`
  - User → `/r/:roomId?role=player`
- Room share links: The room view shows both links and the “Copy Invite” button copies the following text:
  - `Join this room:`
  - `Join as observer: <origin>/r/<roomId>?role=observer`
  - `Join as user: <origin>/r/<roomId>?role=player`

Implementation
- Read param: `apps/web/src/app/room/room.component.ts` reads `role` from the route and preselects the observer checkbox when `role=observer`.
- Share links: Added `shareUrlObserver` and `shareUrlPlayer` computed helpers and a `buildShareUrl()` method. The template shows both links and changes the button to “Copy Invite”.
- Lobby navigation: `apps/web/src/app/lobby/lobby.component.ts` now always includes a `role` query param when navigating to a room.

Tests
- Updated lobby join tests to expect `role=player` by default and `role=observer` when checkbox is selected.
- Added a room test to verify `copyLink()` writes a formatted invite containing both explicit URLs.

Files
- apps/web/src/app/lobby/lobby.component.ts
- apps/web/src/app/lobby/lobby.component.spec.ts
- apps/web/src/app/room/room.component.ts
- apps/web/src/app/room/room.component.html
- apps/web/src/app/room/room.component.spec.ts

User Notes
- Users can share either link depending on whether the invitee should join as a voter or an observer. The role can still be changed before joining.

