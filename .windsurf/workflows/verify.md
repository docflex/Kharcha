---
description: Run the full verification suite (unit + integration + E2E + lint + format check)
---

## Full Verification

Run all checks in sequence. If any step fails, stop and fix before proceeding.

// turbo

1. Run Vitest (unit + integration tests):

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npx vitest run
```

Expected: 61 files, 847+ tests, all passing (~75s due to OCR golden tests).

// turbo 2. Run Playwright E2E tests:

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npx playwright test --reporter=list
```

Expected: 45+ tests across 7 spec files, all passing. Dev server must be running or will auto-start.

Note: Golden OCR tests read from /Users/rmoin/Downloads/Personal/Sample/ — ensure images exist.

// turbo 3. Lint check (0 errors expected, warnings OK):

```bash
npx eslint src/
```

// turbo 4. Format check:

```bash
npm run format:check
```

Expected: "All matched files use Prettier code style!"

### When to run

- Before creating a handoff document
- After finishing a feature or bugfix
- Before declaring a phase complete
