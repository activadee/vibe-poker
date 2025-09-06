# Scrum Poker (Planning Poker) — MVP PRD

**Product**: Open‑source Scrum Poker (Angular + NestJS)  
**Version**: MVP v0.1.0  
**Date**: 2025-09-06  
**Owner**: You (Maintainer)  
**License**: MIT

---

## 1. Problem & Vision

Teams need a fast, privacy‑respecting Planning Poker tool that “just works” for ad‑hoc estimation without sign‑in, storing minimal data, and focusing on the core ceremony. Existing tools often require accounts or heavy integrations.

**Vision**: A lightweight, beautiful, real‑time planning poker that anyone can spin up, share a link, vote, reveal, and move on — with excellent UX and OSS quality.

## 2. Goals & Non‑Goals

### Goals (MVP)

- Create/join ephemeral rooms via link/code.
- Vote secretly with a standard Fibonacci deck; reveal to show stats (avg/median) and distribution.
- Simple roles (host/player/observer), “has‑voted” progress, reset/revote.
- Zero‑auth (name only), in‑memory storage, room TTL (~24h).
- Responsive, keyboard‑friendly UX; dark “futuristic” default theme.
- OSS hygiene (MIT, Contrib guide, CI, smoke tests).

### Non‑Goals (MVP)

- Persistent DB or story backlogs.
- OAuth/SAML or enterprise SSO.
- Jira/Linear integrations (post‑MVP).
- Custom decks beyond a preset (initially one deck; host can switch among presets later).
- Analytics on user identity; we avoid storing PII beyond display name in memory.

## 3. Personas

- **Facilitator/Host**: Sets up a room, controls reveal/reset, sets current Story.
- **Player/Estimator**: Joins with a display name, casts votes, sees results.
- **Observer**: Joins to watch but cannot vote.

## 4. User Journeys

1) **Create & Share**
   - Host opens app → types display name → “Create Room” → gets `/r/ABCD-1234` → shares link.
2) **Join & Vote**
   - Player opens link → enters name → joins room → sees participants and card deck → clicks card → shows “voted” status.
3) **Reveal & Discuss**
   - Host clicks Reveal → all votes appear with average/median → optional Revote or set next Story.
4) **Exit**
   - Users leave; rooms expire automatically after TTL.

## 5. Scope (Functional)

Mapped to FR IDs (see /tasks):

- **Rooms & Presence**: FR‑001, FR‑002, FR‑003, FR‑004, FR‑015, FR‑019
- **Lobby & Routing**: FR‑005, FR‑012
- **Voting**: FR‑006, FR‑007, FR‑008, FR‑009, FR‑010, FR‑013, FR‑014, FR‑017
- **Story Handling**: FR‑011
- **Responsiveness**: FR‑018

## 6. Non‑Functional Requirements

Mapped to NFR IDs:

- **Performance & Scale**: NFR‑002
- **Security & Privacy**: NFR‑003, NFR‑004
- **Accessibility**: NFR‑005
- **Observability & Testing**: NFR‑007, NFR‑008
- **OSS & Delivery**: NFR‑009, NFR‑010
- **i18n Readiness**: NFR‑006

## 7. Success Metrics (MVP)

- Time to first vote (TTFV) ≤ 30 s for a new room on a cold start.
- Reveal latency (host click → all clients rendered) P95 ≤ 250 ms in‑region.
- Join failure rate < 1% (invalid rooms excluded).
- E2E smoke (create → join → vote → reveal) passes in CI and on staging.

## 8. UX & Visual Direction

- **Theme**: “Glass‑Neon” dark base, high contrast, smooth elevation and neon accents.
- **States**: Clear hidden/revealed states; prominent “Reveal” and “Reset” actions for host.
- **A11y**: Focus rings; minimum 4.5:1 contrast for text; full keyboard navigation for vote cards and primary actions.
- **Responsive**: Card deck reachable with thumb on mobile; grid adapts to 320–1440+ widths.

## 9. Technical Approach (High‑Level)

- **FE**: Angular SPA (Lobby `/`, Room `/r/:roomId`), socket.io‑client, Signals/BehaviorSubject state.
- **BE**: NestJS + Socket.IO namespace `/rooms`; in‑memory `Map<string, Room>` and TTL sweeper.
- **Protocol**: REST (create room) + WS (join, vote, reveal, reset, story, deck).
- **Security**: Input validation, rate limits, optional room secret.
- **Hosting**: FE on Vercel/Netlify; BE on Fly.io/Railway/Render (Node 20, websockets enabled).

## 10. Release Plan

- **M1 Core Realtime**: FR‑001..004, FR‑006..009, NFR‑003, NFR‑007, NFR‑008
- **M2 Host Controls & Story**: FR‑009..011, FR‑014, FR‑019, NFR‑002, NFR‑005
- **M3 Polish & OSS**: FR‑012, FR‑015, FR‑017, FR‑018, NFR‑004, NFR‑006, NFR‑009, NFR‑010

## 11. Risks & Mitigations

- **WebSocket scaling** → Start single instance; add Redis adapter later (out of MVP).
- **Abuse/Spam** → Basic rate limits, optional room secret (FR‑019), CORS allow‑list.
- **Disconnect storms** → Idempotent presence, heartbeat pings.
- **A11y regressions** → CI a11y lint + manual keyboard test checklist.

## 12. Open Questions

- Should we show both average and median in UI or allow host to choose default?
- What is the exact rounding rule (e.g., average to 1 decimal)? → **Decision**: avg 1 decimal, median exact card when possible.
- Do we provide emoji/avatars in MVP? → **Deferred**.

## 13. Glossary

- **Reveal**: Action that unmasks individual votes and shows stats.
- **Observer**: Room participant who cannot cast votes.
- **TTL**: Time‑to‑live; automatic room cleanup window.
