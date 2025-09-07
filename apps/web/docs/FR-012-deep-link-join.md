Title: FR-012 — Deep-link join (/r/:roomId)

Summary
- Opening a URL like `/r/:roomId` routes directly into the room join flow.
- If a display name is saved locally, the app auto-joins the room using the selected role (default player, or observer when `?role=observer`).
- If the room is invalid, the UI shows an error with a “Create a new room” CTA.

Implementation
- Routing: Added `roomGuard` to validate presence of a non-empty `:roomId` and redirect to `/` if missing.
  - File: `apps/web/src/app/room/room.guard.ts`
  - Wired in `apps/web/src/app/app.routes.ts` on the `r/:roomId` route.
- Join flow in room: `RoomComponent` reads `:roomId` from route params. If `localStorage.displayName` exists, it calls `join()` automatically (non-blocking via `setTimeout`). Otherwise, it shows the name prompt so the user can join.
  - Files: `apps/web/src/app/room/room.component.ts` + `.html` (existing).
- Invalid room handling: Server emits `room:error` with `code: 'invalid_room'`; component surfaces the message and shows a CTA to create a new room.

QA Notes
- Valid deep-link without saved name: Load `/r/ROOM1` in a fresh browser session (no `displayName`); a “Your name” prompt and “Join Room” button are visible.
- Valid deep-link with saved name: With `localStorage.displayName = 'Alice'`, loading `/r/ROOM1` auto-joins and shows participants area once the server broadcasts `room:state`.
- Invalid room: For a non-existent/expired room, the UI shows “This room does not exist or has expired.” with a “Create a new room” button back to the lobby.

Tests
- Guard tests: `apps/web/src/app/room/room.guard.spec.ts`
  - Allows activation when `roomId` present.
  - Redirects to `/` when blank.
- Deep-link tests: `apps/web/src/app/room/room.component.spec.ts`
  - Without saved name shows join prompt.
  - With saved name auto-invokes `join()`.
  - Invalid room error renders message + CTA.

User Impact
- Users can copy/share room URLs; teammates land directly in the join flow. If they’ve already joined before on this device, they reconnect faster with their saved name.
