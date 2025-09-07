# Task Completion Checklist

Before opening a PR or marking a task done:

- Sync & Branch
  - Ensure branch up to date with default branch; write clear commit messages.
- Build & Test
  - Run unit tests: `npx nx test api web` (or `npm test`).
  - Build apps: `npx nx build api web` and ensure no type errors.
- Lint & Format
  - Lint: `npx nx lint web` and `npx nx run api:eslint:lint`.
  - Format: `npx prettier --check .` (then `--write` if needed).
- Manual Smoke
  - Start dev: `npx nx serve web` (starts API too) → create room → join → vote → reveal.
- Update Docs
  - If behavior or API changed, update `tasks/` specs and relevant README snippets.
- CI Considerations
  - Ensure new dependencies are reflected and builds within budget (web prod budget warnings acceptable only if intentional).
