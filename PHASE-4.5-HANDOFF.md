# Kharcha — Phase 4.5 Handoff Document

> **Status:** Phase 4.5 COMPLETE — **501 Vitest + 21 Playwright = 522 tests, all green**
> **Date:** July 1, 2026

---

## What Was Built

Phase 4.5 covers **Income Management, UX Improvements, Pagination, and Testing Audit**.

**Master plan:** `/Users/rmoin/Downloads/Personal/context-root/05-finalized-project-plan.md`
**Phase 4 handoff:** `/Users/rmoin/Downloads/Personal/kharcha/PHASE-4-HANDOFF.md`

---

## Critical Gotchas for Next Chat

### 1. All Phase 1–4 gotchas still apply

See previous handoff docs (shadcn v4 `render` prop, Next.js 16 async `params`, Zod v4 import from `"zod/v4"`, OCR parser patterns, `fetchTrigger` pattern, `AbortController` in useEffect).

### 2. pdf-parse is CJS-only

`parsePaystubPdf()` uses `require("pdf-parse")` (not ESM import) because the library is CJS-only. The function accepts both `Buffer` and `ArrayBuffer` and handles conversion internally.

### 3. Income source unique constraint

The `monthly_income` table has a unique index on `(userId, year, month, source)`. This means one entry per source per month. The API returns a 409 for duplicates.

### 4. Pagination is client-side

The `Pagination` component in `src/components/ui/pagination.tsx` is a reusable client-side paginator. Both the expense table (20 per page) and income page (12 month groups per page) use it. Data is still fetched all at once from the API.

### 5. Month navigation arrows

Dashboard, Analytics, and Expenses pages all have ◀ ▶ buttons flanking the month/year dropdowns. On Expenses, arrows are disabled when "All Months" is selected (`month === null`).

### 6. Income API uses Zod validation

`POST /api/income` validates input with `createIncomeSchema` from `validators.ts`. Invalid input returns 400, duplicate source/month returns 409.

---

## Features Implemented

### Income Management

| Component                 | What It Does                                                        |
| ------------------------- | ------------------------------------------------------------------- |
| `income-service.ts`       | CRUD (create, get, delete) + `parsePaystubPdf()`                    |
| `POST /api/income`        | Create income entry (Zod validated)                                 |
| `GET /api/income`         | List income entries (filterable by year/month)                      |
| `DELETE /api/income/[id]` | Delete income entry                                                 |
| `POST /api/income/upload` | Upload paystub PDF → auto-parse → create entry                      |
| `/settings/income`        | Full UI: drag-drop PDF, manual add dialog, grouped list with delete |

### Paystub PDF Parsing

- Extracts month/year from "Payslip for the Month of..." text
- Extracts NET PAY from line before "Bank-Transfer"
- Auto-detects salary vs bonus from document content
- Supports BlackRock payslip format

### UX Improvements

| Feature                       | Pages Affected                     |
| ----------------------------- | ---------------------------------- |
| Month navigation arrows (◀ ▶) | Dashboard, Analytics, Expenses     |
| Pagination (20 items/page)    | Expenses table                     |
| Pagination (12 groups/page)   | Income month groups                |
| Reusable Pagination component | `src/components/ui/pagination.tsx` |

---

## Files Created

### Income Service

| File                                     | Purpose              |
| ---------------------------------------- | -------------------- |
| `src/lib/services/income-service.ts`     | CRUD + PDF parsing   |
| `src/app/api/income/route.ts`            | GET/POST endpoints   |
| `src/app/api/income/[id]/route.ts`       | DELETE endpoint      |
| `src/app/api/income/upload/route.ts`     | PDF upload endpoint  |
| `src/app/(app)/settings/income/page.tsx` | Income management UI |

### UI Components

| File                               | Purpose                               |
| ---------------------------------- | ------------------------------------- |
| `src/components/ui/pagination.tsx` | Reusable pagination with page numbers |

### Tests

| File                                              | Tests | What It Covers                                   |
| ------------------------------------------------- | ----- | ------------------------------------------------ |
| `tests/integration/api/income.test.ts`            | 18    | CRUD operations, filtering, ordering, edge cases |
| `tests/integration/api/income-edge-cases.test.ts` | 7     | Boundary months, cross-user isolation, precision |

### Modified Files

| File                                          | Change                                 |
| --------------------------------------------- | -------------------------------------- |
| `src/components/expenses/expense-table.tsx`   | Added pagination (20/page)             |
| `src/app/(app)/dashboard/page.tsx`            | Month nav arrows                       |
| `src/app/(app)/analytics/page.tsx`            | Month nav arrows                       |
| `src/components/expenses/expense-filters.tsx` | Month nav arrows                       |
| `src/components/layout/sidebar.tsx`           | Income nav link + v0.4.0               |
| `tests/e2e/console-health.spec.ts`            | Added `/settings/income` route         |
| `src/app/api/income/route.ts`                 | Zod validation + 409 for duplicates    |
| `src/lib/utils/validators.ts`                 | `createIncomeSchema` (already existed) |

---

## Test Suite (522 Tests Total)

### Vitest — 501 Tests (33 files)

| Category                      | Tests  | Files |
| ----------------------------- | ------ | ----- |
| Phase 1 (utils, CRUD, import) | 92     | 7     |
| Phase 2 (OCR pipeline)        | 122    | 7     |
| Phase 3 (analytics, golden)   | 219    | 13    |
| Phase 4 (persona)             | 43     | 4     |
| **Phase 4.5 (income)**        | **25** | **2** |

### Playwright — 21 Tests (2 files)

| File                     | Tests | What It Covers                                                  |
| ------------------------ | ----- | --------------------------------------------------------------- |
| `console-health.spec.ts` | 13    | Zero console errors on all routes (includes `/settings/income`) |
| `upload-flow.spec.ts`    | 8     | Upload UI flow                                                  |

---

## Data Ingested

- **31 income entries** from BlackRock paystub PDFs via `scripts/ingest-paystubs.cjs`
- Covers Jan 2024 → Jun 2026 (salary + bonus)
- User: Rehber (`d0c0a1e0-ad5e-42cb-ae70-6242d8024ba8`)

---

## Verification Steps Performed

1. **501 Vitest tests passing** — `npx vitest run` (33 files)
2. **Prettier formatted** — `npm run format` passes
3. **All 25 income tests passing** — CRUD + edge cases
4. **No regressions** — 476 pre-existing tests still pass

---

## Phase 5: What's Next

Per the master plan, Phase 5 covers **Email & Polish**:

| Step | Task                             | Test First                |
| ---- | -------------------------------- | ------------------------- |
| 5.1  | Nodemailer client setup          | `email-client.test.ts`    |
| 5.2  | Email HTML templates             | `email-templates.test.ts` |
| 5.3  | Upload reminder email            | `email-reminder.test.ts`  |
| 5.4  | Dashboard ready email            | `email-dashboard.test.ts` |
| 5.5  | node-cron scheduler              | `scheduler.test.ts`       |
| 5.6  | Email settings UI                | —                         |
| 5.7  | Excel export (.xlsx via exceljs) | `excel-export.test.ts`    |
| 5.8  | CSV export                       | `csv-export.test.ts`      |
| 5.9  | Responsive design polish         | —                         |
| 5.10 | Dark/light mode                  | —                         |
| 5.11 | Loading states, error boundaries | —                         |

---

## How to Verify Everything Works

```bash
# 1. Run all unit/integration tests
npm test
# Expected: 33 files, 501 tests, all passing

# 2. Start dev server
npm run dev

# 3. Run E2E tests (in another terminal)
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run test:e2e
# Expected: 21 tests, all passing

# 4. Format check
npm run format:check

# 5. Open browser and visit /settings/income
open http://localhost:3000/settings/income
```
