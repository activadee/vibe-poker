# NFR-006 — QA Checklist (i18n)

## Placeholders & Interpolation
- Verify placeholders render from translations (e.g., lobby name and room code inputs).
- Ensure parameterized strings interpolate correctly (e.g., `{{count}}/{{total}} voted`).
- Confirm error and status messages come from translations, not hard‑coded.

## RTL‑Safe Layout Considerations
- Components use flexbox and spacing utilities; avoid directional CSS (e.g., `margin-left`). Prefer logical properties if adding custom CSS.
- Icons and directional glyphs should remain meaningful in RTL (none are mirrored programmatically yet).
- Progress/Status “pills” read correctly with screen readers.

## Smoke Checks
- Language switch shows `en` and toggles without errors (only `en` exists by default).
- Share/invite text uses translations and includes both observer and player links.
- All primary buttons/labels in Lobby and Room read from translation keys.

## Non‑Goals
- Full RTL styles are not shipped in this NFR; this focuses on readiness and no hard‑coded strings in core flows.

