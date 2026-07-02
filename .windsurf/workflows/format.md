---
description: Format the entire codebase with Prettier (4-space tabs)
---

## Format Codebase

// turbo

1. Run Prettier on all source and test files:

```bash
npm run format
```

2. Verify no tests broke after formatting:
   // turbo

```bash
npx vitest run
```

3. Verify E2E tests still pass:
   // turbo

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npx playwright test
```

4. Check for lint errors:
   // turbo

```bash
npx eslint src/
```

### Notes

- Config: `.prettierrc` — 4-space indentation, double quotes, trailing commas, 100 char print width
- Ignore: `.prettierignore` — node_modules, .next, dist, data, coverage, *.db
- Check only (no write): `npm run format:check`
