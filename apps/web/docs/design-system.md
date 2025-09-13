# Web Design System (Tailwind)

This app uses Tailwind CSS (v4) with a small set of primitives to implement a consistent visual language. The implementation is based on the provided landing page reference.

Tailwind v4 is precompiled with the Tailwind CLI before Angular builds.

## Theme

- Colors
  - `primary` – deep slate/indigo used for primary actions.
  - `surface` – base surfaces: `DEFAULT`, `faint` (app background), `muted`.
- Typography
  - `font-sans` uses a system stack with Inter first.
- Effects
  - `shadow-card` for elevated cards.
  - `rounded-xl` (12px) for cards and controls.

Configuration lives in `apps/web/tailwind.web.config.js`. Global Tailwind layers are declared in `apps/web/src/styles.scss`.

## Reusable UI Primitives

- `button[appUiButton]`
  - Inputs: `variant` `primary | secondary | ghost` (default `primary`), `size` `sm | md | lg`.
  - Shorthand: you may also pass the variant via the directive value: `appUiButton="secondary"`.
  - Applies accessible focus styles and disabled state.
- `input[appUiInput]` and `textarea[appUiInput]`
  - Standard text inputs with focus ring and placeholder styling.
- `input[type=checkbox][appUiCheckbox]`
  - Styled checkbox using the Tailwind Forms plugin.
- `<app-ui-card>`
  - Card container with border, rounded corners and `shadow-card`.
  - Input: `padding` `sm | md` (default `md`).

These primitives are framework‑agnostic directives/components defined under `apps/web/src/app/ui/` and can be imported into any standalone component.

## Landing Page

The lobby (landing) page was refactored to use the primitives above and Tailwind utility classes to match the reference design:

- Centered header with title “Planning Poker” and subtitle.
- Two cards: “Create a Room” and “Join a Room”, each with an icon, helper text, inputs and a full‑width action button.

Files touched:

- `apps/web/src/app/lobby/lobby.component.html`
- `apps/web/src/app/lobby/lobby.component.ts`
- `apps/web/src/styles.scss`
- `apps/web/tailwind.config.cjs`
- `apps/web/src/app/ui/*` (primitives listed above)

## Usage Examples

```html
<!-- Button -->
<button appUiButton>Primary</button>
<button appUiButton variant="secondary">Secondary</button>
<button appUiButton="ghost">Ghost (shorthand)</button>

<!-- Input + label -->
<label for="name" class="block text-sm font-medium text-slate-700">Name</label>
<input id="name" name="name" appUiInput />

<!-- Card -->
<app-ui-card class="max-w-md">
  <h2 class="text-base font-semibold">Card Title</h2>
  <p class="text-sm text-slate-500">Body content…</p>
  <div class="mt-4">
    <button appUiButton class="w-full">Action</button>
  </div>
  
</app-ui-card>
```

## Development

- Build: `nx build web`
- Test: `nx test web`
- Lint: `nx run web:lint`

Tailwind classes are available anywhere in `apps/web/src/**/*.html|ts`.
