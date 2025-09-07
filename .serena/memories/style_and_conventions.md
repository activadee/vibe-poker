# Style and Conventions

- Language: TypeScript across repo.
- Formatting: Prettier (`.prettierrc` → `singleQuote: true`). Prefer `prettier --write` before commits.
- Linting: ESLint (flat config). Nx plugin enforces module boundaries. Use project‑level ESLint configs under each app when present.
- Angular (apps/web)
  - Standalone components; `bootstrapApplication` in `main.ts`.
  - Component selectors follow Angular ESLint defaults; SCSS styles.
  - Prefer Signals for local UI state; use `HttpClient` for REST, `socket.io-client` for realtime.
- NestJS (apps/api)
  - Conventional modules/services/controllers/gateways. DI via `@Injectable()`.
  - WebSockets via `@nestjs/websockets` + `@nestjs/platform-socket.io`.
  - Keep DTOs/types in `apps/shared-types` when shared with FE.
- Shared types
  - Import via path alias `@scrum-poker/shared-types` (see `tsconfig.base.json`).
- Naming
  - Angular component files: `feature-name.component.ts`; services: `*.service.ts`.
  - Nest files: `*.module.ts`, `*.service.ts`, `*.controller.ts`, `*.gateway.ts`.
- Tests
  - Jest for both Angular and Nest. Co‑locate `*.spec.ts` with sources.
