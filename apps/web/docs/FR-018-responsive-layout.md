# FR-018 – Responsive Layout (FE)

Goal
- Provide a responsive, attractive UI from 320px mobile up to desktop.
- Ensure touch targets are at least 44px and vote cards wrap gracefully.

Changes
- Tokens
  - Added global CSS tokens in `apps/web/src/styles.css`:
    - `--touch-target: 44px`, `--radius: 12px`
    - Spacing scale: `--space-1..8`
    - Grid: `--card-min` (min column size for vote grid)
- Vote cards grid
  - Switched `.deck` to CSS Grid with `repeat(auto-fit, minmax(var(--card-min, 68px), 1fr)))`.
  - Uses tokenized spacing and maintains wrapping at all widths.
- Touch target enforcement
  - `UiButtonDirective` and `UiInputDirective` bind `style.minHeight: var(--touch-target, 44px)` to meet 44px minimum regardless of size classes.
  - Default button `md` size uses `h-11` (44px).

Files
- `apps/web/src/styles.css`
- `apps/web/src/app/vote-cards/vote-cards.component.css`
- `apps/web/src/app/ui/button.directive.ts`
- `apps/web/src/app/ui/input.directive.ts`

Notes
- The lobby and room views already use fluid containers and Tailwind responsive utilities; with tokens and grid, they render correctly from 320px upwards.
- Meta viewport is present in `index.html`.

Verification
- Visual check at 320px, 375px, 768px, 1024px.
- Keyboard: arrow navigation and Enter on vote cards.
- Screen reader: roles and aria attributes remain intact (`role=list`, `aria-pressed`, `aria-disabled`).
