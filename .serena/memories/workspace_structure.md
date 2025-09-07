# Workspace Structure

- Root
  - `nx.json`, `tsconfig.base.json`, `package.json`, `eslint.config.mjs`, `.prettierrc`
  - `README.md` (Nx boilerplate), `prd.md` (product requirements), `TASKLIST.md`
  - `.nx/`, `.github/`, `.vscode/`
  - `tasks/` — FR/NFR markdown specs
- Projects (Nx)
  - `apps/web` (application)
    - Angular build via `@angular-devkit/build-angular`
    - Targets: `build`, `serve` (depends on `api:serve`), `extract-i18n`, `test`, `lint`, `serve-static`
  - `apps/api` (application)
    - NestJS runtime; build via `webpack-cli`
    - Targets: `build`, `serve`, `preview`, `serve-static`, `test`, `eslint:lint`, plus lockfile prune/copy helpers
  - `apps/shared-types` (library)
    - TS build via `@nx/js:tsc`
    - Targets: `build`, `test`, `eslint:lint`
- Dependency shape
  - `web` → uses `shared-types`; runtime depends on `api:serve` in dev
  - `api` → uses `shared-types`
