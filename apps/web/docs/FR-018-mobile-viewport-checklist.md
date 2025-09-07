# FR-018 – Mobile Viewport Checklist (QA)

Viewports
- 320×640, 360×780, 390×844, 768×1024, 1280×800

Checks
- Layout
  - No horizontal scroll; content fits width at 320px.
  - Lobby cards and room panels fit with `px-4` gutters.
  - Vote cards wrap with even spacing (CSS Grid).
- Touch targets ≥ 44px
  - Buttons: computed min-height ≥ 44px.
  - Text inputs: computed min-height ≥ 44px.
  - Vote cards: min 44×44px.
- Keyboard + SR
  - Vote cards: arrow key navigation and Enter/Space selection.
  - `aria-pressed` reflects selection; `aria-disabled` for observers.
  - Forms have visible labels and focus outlines.
- Visual
  - Card corners 12px; shadows present; colors readable.

How to verify
- Run `nx serve web`, open devtools device emulation and test above sizes.
- Use Tab to navigate; inspect element styles for min heights and wrapping.
