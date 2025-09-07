# Project Overview

- Name: Scrum Poker (Planning Poker)
- Purpose: Open‑source, privacy‑respecting Planning Poker for agile estimation. Create ephemeral rooms, cast hidden votes, reveal results, and revote with minimal friction.
- Stack: Nx monorepo (Nx 21.4.1, npm). Frontend Angular 20 (standalone components). Backend NestJS 11 + Socket.IO. Shared TypeScript library for cross‑app types.
- Top Apps/Libs:
  - apps/web: Angular SPA with routes `/` (lobby) and `/r/:roomId` (room).
  - apps/api: NestJS app with REST + WebSockets (Socket.IO) for rooms.
  - apps/shared-types: TS library exposed as `@scrum-poker/shared-types`.
- Realtime: Socket.IO namespace for rooms; in‑memory storage with TTL sweeper.
- Repo docs: `prd.md` (MVP PRD), `tasks/` (feature and NFR specs), `TASKLIST.md`.
- License: MIT
- OS: Linux development environment
