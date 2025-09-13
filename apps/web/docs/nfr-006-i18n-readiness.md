# NFR-006 — Internationalization Readiness (Transloco)

Goal: externalize UI strings, scaffold locale switching, and make adding languages later low‑effort. Default locale is `en`.

## What’s Included

- Transloco wired for the web app (Angular 20)
  - Provider configured in `apps/web/src/app/app.config.ts`
  - HTTP loader (`/i18n/<lang>.json`) in `apps/web/src/app/i18n/transloco.loader.ts`
  - Wrapper service with a tiny API in `apps/web/src/app/i18n/i18n.service.ts`
- Language switcher UI (`app-lang-switch`) included globally in `app.html`
- Core flows externalized (Lobby + Room templates and key runtime messages)
- Baseline translations at `apps/web/public/i18n/en.json`
- Keys extraction task via Transloco Keys Manager

## Using Translations

- In templates: `{{ 'lobby.create.title' | transloco }}`
- For attributes: `[placeholder]="('room.join.namePlaceholder' | transloco)"`
- In TS: `i18n.t('room.reset.confirm')`

Avoid hard‑coded user‑facing strings in components/services.

## File Layout

- Translations: `apps/web/public/i18n/en.json`
- Providers: `apps/web/src/app/app.config.ts`
- Loader: `apps/web/src/app/i18n/transloco.loader.ts`
- Service: `apps/web/src/app/i18n/i18n.service.ts`
- Switcher: `apps/web/src/app/i18n/lang-switch.component.ts`

## Extraction & Maintenance

- Run automatic key extraction for the web app:

  - Nx target: `npx nx run web:i18n-extract`
  - This scans `apps/web/src` and writes to `apps/web/public/i18n/en.json`.

- Add a new language:

  1) Create `apps/web/public/i18n/<lang>.json` (e.g. `es.json`).
  2) Add the code to `availableLangs` in `app.config.ts`.
  3) Switch at runtime using the switcher or `I18nService.setLang('<lang>')`.

## Notes

- Tests use TranslocoTestingModule to keep unit tests isolated and fast.
- Do not use `any` in source files; tests may use it as needed for stubs.
- The Angular CLI `extract-i18n` target remains for built‑in i18n but is not required for Transloco.

