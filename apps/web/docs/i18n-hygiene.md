I18n Hygiene
============

- `apps/web/public/i18n/en.json` uses a nested structure (not flat dotted keys).
- `tools/i18n/check-locale.mjs` enforces two rules in CI:
  - No top-level dotted keys (e.g., `"lobby.title"`).
  - No placeholder values like `"Missing value for '…'"`.
- The `web:i18n-extract` target chains the check after extraction. If the keys manager
  generates placeholders, the task fails to prevent regressions.

Run locally:

```
npx nx run web:i18n-extract
node tools/i18n/check-locale.mjs apps/web/public/i18n/en.json
```

