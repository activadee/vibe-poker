# MVP Tasklist (Concise)
>
> Use this as a starting board. See individual FR/NFR files for details.

- **Epic**: Rooms & Presence | **Goal**: Create & Join Rooms | **Refs**: FR-001..004, 015, 019
  - **Story**: As a facilitator I can create and share a room. | **Refs**: FR-001 | **Estimate**: 5
    - **AC**: POST /rooms → id; route to /r/:roomId; host assigned; TTL set.
    - **Tasks**: [BE] create room —2; [FE] lobby create —2; [QA] e2e —2
    - **DoD**: E2E green; logs have room_id.
  - **Story**: As a player I can join by name (and secret). | **Refs**: FR-002, FR-019 | **Estimate**: 5
    - **AC**: `room:join` ack; invalid shows friendly error.
    - **Tasks**: [BE] join —3; [FE] join UI —2; [QA] cases —2
- **Epic**: Voting | **Goal**: Hidden → Reveal → Reset | **Refs**: FR-006..010, 013–014, 017
  - **Story**: As a player I can cast a hidden vote. | **Refs**: FR-008 | **Estimate**: 5
    - **AC**: hidden until reveal; progress updates.
    - **Tasks**: [BE] castVote —2; [FE] deck —1; [QA] multi client —1
  - **Story**: As a host I reveal results with stats. | **Refs**: FR-009 | **Estimate**: 5
    - **AC**: avg(1dp), median; non‑numeric excluded from stats.
    - **Tasks**: [BE] stats —2; [FE] display —1; [QA] correctness —2
- **Epic**: NFRs | **Goal**: Safety, A11y, CI | **Refs**: NFR-002..010
  - **Story**: As a maintainer I can ship reliably. | **Estimate**: 8
    - **Tasks**: rate limits, validation, tests, CI/CD, logs.

See `/tasks/INDEX.md` and individual files for full details.
