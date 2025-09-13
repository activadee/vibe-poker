### Describe the bug
In the Angular web app, Transloco renders placeholder strings instead of real translations on the Lobby screen (e.g., “Missing value for 'lobby.title'”, “Missing value for 'lobby.join.title'”). The `en` locale is loaded via `AppTranslocoHttpLoader` (`/i18n/en.json`), but the translation file currently contains many auto‑generated placeholder keys and duplicates.

Context from the repo:
- Runtime loader: `apps/web/src/app/i18n/transloco.loader.ts` (GET `/i18n/<lang>.json`).
- Config: `apps/web/src/app/app.config.ts` (availableLangs: `['en']`, defaultLang: `en`).
- Source keys used in templates: `apps/web/src/app/lobby/lobby.component.html` (e.g., `{{ 'lobby.create.title' | transloco }}`).
- Locale file: `apps/web/public/i18n/en.json` contains both nested keys with real values (e.g., `lobby.create.title: "Create a Room"`) and flat, duplicate keys with placeholder values (e.g., `"lobby.create.title": "Missing value for 'lobby.create.title'"`). It also lacks some keys altogether (e.g., `lobby.title`).

### To Reproduce
1. `npm ci`
2. Start the stack: `npm run dev` (or `npx nx serve web` in one terminal and `npx nx serve api` in another)
3. Open the app at http://localhost:4200
4. Observe the Lobby page headings, labels, and placeholders – they display “Missing value for …” strings instead of the expected text.

### Expected behavior
All UI strings on the Lobby page resolve to the English translations defined in `/apps/web/public/i18n/en.json` (e.g., “Planning Poker”, “Create a Room”, “Join a Room”, labels and placeholders).

### Screenshots / Logs
See attached screenshot in the original report: placeholders such as “Missing value for 'lobby.title'” are rendered for headings, inputs, and buttons.

### Environment
- OS: any
- Node: 20.x
- npm: 10.x

### Additional context
This appears to be caused by the extracted placeholder keys created by `transloco-keys-manager` (target: `web:i18n-extract`). The locale file mixes:
- nested objects with correct values (e.g., `lobby.create.title: "Create a Room"`), and
- flat duplicate keys with placeholder values (e.g., `"lobby.create.title": "Missing value for '…'"`).

Depending on Transloco flattening/lookup order, placeholders may override or the missing `lobby.title` key simply isn’t defined.

Proposed fix (implementation plan):
- Remove the auto‑generated placeholder duplicates from `apps/web/public/i18n/en.json`; keep a single, nested structure.
- Fill missing keys for the Lobby scope (`lobby.title`, `lobby.subtitle`, and any `lobby.join.*` / `lobby.create.*` not populated).
- Add a lightweight guard in CI: fail `web:i18n-extract` if the output still contains values starting with “Missing value for”.
- Add/extend unit tests using `TranslocoTestingModule` to assert the Lobby headings render localized text (we already have a foundation in `lobby.component.spec.ts`).

Acceptance criteria:
- Given the app is served in English, when I visit the Lobby page, then all headings, labels, placeholders, and buttons are localized (no “Missing value for …” strings).
- `apps/web/public/i18n/en.json` contains no duplicate flat keys and no placeholder values.
- `npx nx run web:i18n-extract` runs cleanly in CI without re‑introducing placeholder values.
- Existing tests pass; new i18n assertions added for the Lobby.
