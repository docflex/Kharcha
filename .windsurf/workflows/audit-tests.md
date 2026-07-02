---
description: Audit test coverage — find gaps, add missing tests, fuzz edge cases across all services
---

## Test Audit Workflow

### Step 1: Map coverage

1. List all service files:

```bash
find src/lib/services -name '*.ts' -type f
```

2. List all test files:

```bash
find tests -name '*.test.ts' -type f | sort
```

3. For each service, identify which functions are tested and which are NOT.

### Step 2: Check edge cases

For each service, verify that tests cover:

- **Empty inputs** — empty strings, null, undefined
- **Boundary values** — month 0, month 13, year 1999, negative amounts
- **Duplicate handling** — UNIQUE constraints, upsert behavior
- **Cross-user isolation** — user A cannot see/modify user B's data
- **Precision** — floating point amounts (e.g., 136204.33)
- **Large datasets** — 100+ entries in a single query

### Step 3: Add missing tests

Write tests BEFORE any fix. Follow the existing test patterns:
- Use `createTestDb()` + `seedTestUser()` + `seedTestCategory()` from `src/lib/db/test-utils.ts`
- Use `beforeEach`/`afterEach` for setup/teardown
- Group with `describe` blocks by function name
- Keep edge-case tests in separate `*-edge-cases.test.ts` files

### Step 4: Verify

// turbo

```bash
npx vitest run --reporter=verbose 2>&1 | tail -5
```

### Current test inventory (as of Phase 7.8)

**847 Vitest tests across 61 files + ~45 Playwright E2E tests across 7 spec files**

#### Unit Tests (38 files)
| Category | Files | Coverage |
|----------|-------|----------|
| `unit/utils/*` | 7 files | currency (47), dates (17), validators (46), password-strength (15), file-validation (16), client-analytics (9), api-error (8) |
| `unit/ocr/*` | 5 files | text-parser (33), category-matcher (17), corner-cases (38), deduplicator (9), image-preprocessor (10), recognizer (6) |
| `unit/analytics/*` | 7 files | budget (7), category-deepdive (8), heatmap (8), mom (9), savings (4), trends (7), yoy (6) |
| `unit/persona/*` | 4 files | archetypes (19), insight-generator (10), persona-generator (6), recommendations (16) |
| `unit/email/*` | 4 files | client (9), service (7), templates (17), scheduler (7) |
| `unit/export/*` | 2 files | csv (13), excel (6) |
| `unit/middleware/*` | 1 file | rate-limit (9) |
| `unit/services/*` | 5 files | danger-zone (3), forex (9), password-reset (11), version (6), user (17) |
| `unit/cache/*` | 1 file | cache LRU/TTL/tags (12) |

#### Integration Tests (21 files)
| Category | Files | Coverage |
|----------|-------|----------|
| API CRUD | 10 files | expenses (37), categories (25), budgets (24), income (25), audit-log (7), bulk-expenses (5) |
| Flows | 6 files | analytics (16), data-isolation (20), ocr-pipeline (9), ocr-golden (~27), upload-e2e (13), upload-service (14), excel-import (10), commit-flow (8) |
| Security/New | 5 files | category-deepdive (7), rate-limiting (8), cascade-delete (14), error-handling (8), forgot-password (8) |

#### E2E Tests (7 spec files)
| Spec File | Coverage |
|-----------|----------|
| console-health | ~17 tests — all public + auth routes |
| page-smoke | 8 tests — Dashboard, Expenses, Analytics, Settings, Budgets, Persona, Auth |
| onboarding | 6 tests — wizard flow |
| feature-tour | 6 tests — tour button, data-tour targets, responsive |
| upload-flow | 8 tests — upload UI flow |
| empty-states | 6 tests — all data pages with no data |
| landing | 4 tests — hero, CTA, sign-in link |

#### Full audit document: `TEST-AUDIT.md`
