# Roadmap

This roadmap proposes pragmatic, high‑impact next steps for the current Planning Poker implementation (Angular web + NestJS API + shared types). Items are ordered by expected impact vs. effort and given a rating from 1–10 where 10 is highest potential value. Each item includes a brief “why” and a suggested outline for implementation.

Note: The project already has a solid core (rooms, join flows, host/player/observer roles, vote cast/reset/reveal, deck presets, progress + stats, i18n and a11y checks, server logging/metrics). The roadmap focuses on features that expand utility, reliability, and fit for real‑world team workflows.

## Phase 1 — Core Product Fit

- Persistent Room Store + Horizontal Scale (Rating: 10)
  - Why: In‑memory state limits uptime and single‑instance scaling. Persisting rooms and using a Socket.IO adapter enables multi‑node deployments and safer restarts.
  - How: Introduce Redis for room state (TTL per room) and Socket.IO `@socket.io/redis-adapter`. Replace the in‑memory maps in `RoomsService` with a repository interface and a Redis implementation. Keep domain types in shared‑types.
  - Acceptance: Rooms survive API restarts within TTL; multiple API instances share state; e2e test confirms cross‑instance voting stays consistent.
  - LLM Prompt: Act as a senior Nx engineer. Implement "Persistent Room Store + Horizontal Scale" using Redis (TTL per room) and the Socket.IO redis adapter. Meet acceptance: rooms survive API restarts within TTL, multiple API instances share state, and a Playwright e2e proves cross‑instance voting consistency. Deliver: architecture plan, domain types, repository interface + Redis implementation, NestJS module wiring, Socket.IO adapter configuration, rollback strategy, and unit/integration/e2e tests. Avoid using `any` in non‑test TypeScript.

- Story Backlog Inside Room (Rating: 9)
  - Why: Real sessions estimate multiple stories in sequence; keeping a backlog in the room streamlines facilitation.
  - How: Add `stories: Story[]` to room, with active `storyId`. Host can add/reorder/select stories; progressing to next story resets votes automatically.
  - Acceptance: Host can manage a backlog; next/previous story actions broadcast correctly; tests cover reset/reveal behavior across stories.
  - LLM Prompt: Implement a room‑scoped backlog with `stories: Story[]` and an active `storyId`. Meet acceptance by ensuring host add/reorder/select, next/previous broadcasts, and automatic vote reset between stories. Provide: updated shared types, server socket events and handlers, Angular UI flows, race‑condition handling, and a unit/integration/e2e test plan covering reset/reveal across stories. No `any` outside tests.

- Private Rooms with Access Code (Rating: 8)
  - Why: Prevent drive‑by joins in public demos and protect internal sessions without adding heavy auth.
  - How: Optional `secret` on room create; enforce on join (server‑side). Lobby supports entering a code; share links include `?code=...` when present.
  - Acceptance: Joining without a valid code is rejected; host can toggle/rotate the code.
  - LLM Prompt: Add an optional room `secret` that is enforced on join. Meet acceptance by rejecting invalid codes and allowing the host to toggle/rotate secrets. Produce: validation and error flows, rate‑limit considerations, Angular lobby UX for code entry, link sharing with `?code`, and unit/e2e tests for rejection and rotation. Keep TypeScript strict and avoid `any` in non‑test code.

- Host Controls: Transfer Host, Kick/Rename Participant (Rating: 7)
  - Why: Common moderation needs in real sessions.
  - How: New host‑only socket events (`host:transfer`, `participant:kick`, `participant:rename`). UI affordances visible only to host.
  - Acceptance: Tests verify authorization; UI updates propagate immediately.
  - LLM Prompt: Implement host‑only moderation: transfer host, kick, and rename participants. Define WS event contracts, server authorization guards, and optimistic UI updates with rollback. Meet acceptance by providing unit/integration tests that enforce authorization and confirm instant UI propagation. Avoid `any` in non‑test TypeScript.

- Custom Decks and Saved Presets (Rating: 7)
  - Why: Teams vary in estimation scales; presets avoid repeated setup.
  - How: Add `customDecks` owned by room; allow host to define/edit. Persist with room state.
  - Acceptance: Switching to a custom deck clears votes and updates all clients; presets round‑trip in state.
  - LLM Prompt: Add room‑level custom decks and saved presets. Specify shared types, persistence, and UI for create/edit/select. Ensure that switching decks clears votes and broadcasts updates to all clients, with tests verifying round‑trip state and clearing behavior. No `any` outside tests.

## Phase 2 — Collaboration & Flow

- Quorum and Auto‑Reveal Modes (Rating: 7)
  - Why: Faster rounds when everyone has voted; reduce facilitator micro‑actions.
  - How: Room setting to auto‑reveal at 100% (or configurable quorum). Optional countdown timer to reveal.
  - Acceptance: Progress events trigger reveal per setting; UI indicates mode.
  - LLM Prompt: Implement auto‑reveal/quorum settings (100% or configurable). Define state changes and server logic that triggers reveal based on progress events; add clear UI indicators. Provide types, socket events, and unit/e2e tests proving reveal occurs per setting. Avoid `any` in non‑test code.

- Timer and “Break” Mode (Rating: 6)
  - Why: Keeps sessions on track; signals pauses to all participants.
  - How: Host can start a per‑story timer; when paused, votes are disabled and a banner is shown.
  - Acceptance: Timer state syncs; vote buttons disabled during break.
  - LLM Prompt: Add per‑story timer and break mode controlled by host. Implement synchronized countdown via sockets, a visible banner during breaks, and enforced vote disabling. Cover reconnection/pause/resume edge cases and write unit/integration/e2e tests to prove state sync and disabled voting. Do not use `any` outside tests.

- Export Results (CSV/JSON) and Clipboard Summary (Rating: 6)
  - Why: Teams often paste results into trackers or share summaries.
  - How: When revealed, compute per‑story stats and provide CSV/JSON download and “Copy summary”.
  - Acceptance: Export matches visible data; browser‑only, no server storage needed.
  - LLM Prompt: Implement browser‑only CSV/JSON export and a copyable summary of revealed results. Ensure exported data exactly matches the UI. Provide data shaping, download/clipboard UX, and unit/e2e tests comparing exported content to on‑screen values. No `any` in non‑test code.

- Mobile UX polish for large rooms (Rating: 6)
  - Why: Many participants on phones; ensure list and cards remain readable.
  - How: Virtualize participant list, responsive grid for cards, larger tap targets.
  - Acceptance: A11y/contrast tests pass; Lighthouse mobile scores remain high.
  - LLM Prompt: Optimize mobile UX for large rooms using list virtualization, responsive card grids, and larger tap targets. Produce accessibility checks (contrast, focus order) and Lighthouse mobile budget. Provide changes and tests that keep scores high and a11y passing. Avoid `any` in non‑test code.

## Phase 3 — Integrations & Async Workflows

- Import/Sync from Issue Trackers (Rating: 9)
  - Why: Reduce manual story entry; keep results where the work lives.
  - How: Start with GitHub issues and Jira as separate optional integrations. OAuth app for GitHub; PAT or OAuth for Jira. Import titles/descriptions into the room backlog; optionally write back final estimate as a comment or field.
  - Acceptance: Host can import a selected range; exported estimates appear on the issue.
  - LLM Prompt: Implement GitHub and Jira integrations for importing stories and writing back estimates. Specify auth flows (GitHub OAuth app; Jira PAT/OAuth), data mapping, pagination and rate‑limit handling, and UI for selecting a range. Provide negative cases and unit/e2e tests proving selected‑range import and estimate write‑back. No `any` outside tests.

- Async Estimation Mode (Rating: 8)
  - Why: Distributed teams estimate on their own time; results are revealed at a deadline.
  - How: Room with “async” flag stores votes over a window; reveal happens at host‑set time or when all required voters submit.
  - Acceptance: Participants can vote while others are offline; reveal occurs on schedule with a notification banner in UI.
  - LLM Prompt: Add an async room mode that stores votes across a time window and reveals at a scheduled time or when all required voters submit. Define scheduling (cron/timeout), persistence, permissions, and a UI notification banner. Provide tests proving offline voting works and reveal occurs on schedule. Avoid `any` in non‑test code.

- Chat App Shortcuts (Slack/Teams/Viber) (Rating: 6)
  - Why: Meet teams where they coordinate. Lightweight commands to create/join a room improve adoption.
  - How: Bot endpoints create rooms and post join links; optional slash commands.
  - Acceptance: A chat command returns working join links; minimal permissions.
  - LLM Prompt: Build chat shortcuts (Slack/Teams/Viber) that create rooms and return join links. Define bot endpoints, command payloads, minimal permission scopes, signing/verification, and error handling. Provide unit/integration tests that validate join links are returned and usable. No `any` outside tests.

## Phase 4 — Reliability, Ops, and Quality

- OpenTelemetry + Prometheus Exporter (Rating: 6)
  - Why: Production visibility into latency, errors, and WS events.
  - How: Add OTEL SDK to API, instrument REST/Socket.IO handlers; expose `/metrics` for Prometheus. Correlate with existing correlation IDs.
  - Acceptance: Dashboards show request/vote throughput, latencies, and errors.
  - LLM Prompt: Instrument the NestJS API with OpenTelemetry and expose Prometheus metrics. Define spans for REST and Socket.IO, counters/histograms for request/vote throughput, latencies, and errors, and a `/metrics` endpoint. Provide example dashboards and tests validating metric emission and sane label cardinality. Avoid `any` in non‑test code.

- Room Lifecycle Hardening (Rating: 6)
  - Why: Prevent lingering sockets and stale state.
  - How: Periodic sweep checks empty rooms; WS rooms auto‑close after inactivity; ensure TTL extends on activity if desired.
  - Acceptance: No rooms remain after TTL; reconnection behaves predictably.
  - LLM Prompt: Harden room lifecycle with periodic sweeps, inactivity auto‑close, and optional TTL extension on activity. Define reconnection semantics and cleanup guarantees. Provide unit/integration tests proving no stale rooms after TTL and predictable reconnection flows. No `any` outside tests.

- E2E Tests (Playwright) for Critical Flows (Rating: 6)
  - Why: Guard rails for refactors and scale changes.
  - How: Add Playwright tests that spin up two browser contexts, create/join, vote/reveal/reset, deck changes, and reconnection.
  - Acceptance: CI runs headless e2e suite; flakiness kept low via WS event waits.
  - LLM Prompt: Author a stable Playwright e2e suite for multi‑client flows (create/join, vote/reveal/reset, deck switch, reconnection). Configure CI to run headless, rely on WS event waits to minimize flakiness, and add robust selectors. Provide test organization and scripts. Avoid `any` in non‑test code.

- Secure Defaults (Rating: 6)
  - Why: Safer deployments out of the box.
  - How: Tighten CORS allow‑list, Helmet/CSP, rate limits per IP + per room, size limits on WS payloads (already present but parameterized), and robust input validation with Zod.
  - Acceptance: Security headers present; negative tests verify blocks.
  - LLM Prompt: Apply secure defaults: strict CORS allow‑list, Helmet/CSP, IP and per‑room rate limits, WS payload size limits, and Zod validation. Provide configs, failure responses, and negative tests that prove blocked scenarios and presence of security headers. No `any` in non‑test TypeScript.

## Phase 5 — Fit & Finish

- PWA Installability (Rating: 5)
  - Why: One‑tap access on mobile and offline shell for quick re‑join.
  - How: Add manifest and service worker for asset caching; keep real‑time actions online‑only.
  - Acceptance: “Install app” prompt available; works when offline for lobby/read‑only screens.
  - LLM Prompt: Implement PWA support with a web app manifest and a service worker that caches assets and enables offline lobby/read‑only screens. Ensure the install prompt appears and online‑only constraints are respected. Provide tests validating installability and offline behavior. Avoid `any` in non‑test code.

- Theming & Basic Branding (Rating: 4)
  - Why: White‑label for teams; small UX win.
  - How: CSS variables and theme switcher (light/dark/high‑contrast). Persist preference in localStorage.
  - Acceptance: Meets contrast requirements; no layout shift across themes.
  - LLM Prompt: Introduce theming via CSS variables and a theme switcher (light/dark/high‑contrast) with persistence in localStorage. Meet acceptance by ensuring contrast compliance and zero layout shift across themes. Provide tokens, styles, and tests. No `any` in non‑test code.

---

## Implementation Notes

- Keep shared contracts source of truth in `shared-types` and avoid introducing `any` in non‑test code.
- For Redis, provide a toggle so local dev can still use in‑memory maps with the same repository interface.
- Gate integrations (GitHub/Jira/Slack/Teams/Viber) behind environment flags to keep core deployment simple.
- Prefer additive changes to protocols (new socket events) over breaking payloads; when changing shapes, add versioned fields and keep server‑side shaping like `safeRoom()`.

## Rough Sequencing

1) Persistence + scale, private rooms, backlog.
2) Host controls, custom decks, auto‑reveal/timer, exports.
3) Tracker imports + async mode.
4) Observability, lifecycle hardening, e2e.
5) PWA + theming.
