# Kharcha — Comprehensive Test Audit

> Generated: July 2, 2026
> Current counts: **713 Vitest** (54 files) + **~45 Playwright** (5 spec files) = **~758 total**
> Status: 12 ESLint errors (all `setState-in-effect` warnings treated as errors), 28 warnings, 2 Prettier issues

---

## 1. Current Test Inventory

### 1.1 Vitest — Unit Tests (36 files)

| #   | Test File                                      | Tests | Covers                                                                                                                                            |
| --- | ---------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `unit/utils/currency.test.ts`                  | 29    | `parseIndianNumber`, `formatINR`, `formatCurrency`, `formatInputWithCommas`, `stripCommas`                                                        |
| 2   | `unit/utils/currency-edge-cases.test.ts`       | 18    | Boundary values, special chars, precision                                                                                                         |
| 3   | `unit/utils/date-helpers.test.ts`              | 17    | `monthNameToNumber`, `monthNumberToName`, `getMonthYearLabel`, `getPreviousMonth`, `getNextMonth`, `isValidMonth`, `isValidYear`                  |
| 4   | `unit/utils/validators.test.ts`                | 46    | `createCategorySchema`, `createExpenseSchema`, `updateExpenseSchema`, `createBudgetSchema`, `createIncomeSchema`, `registerSchema`, `loginSchema` |
| 5   | `unit/utils/password-strength.test.ts`         | 15    | `getPasswordStrength`, `isPasswordComplex`                                                                                                        |
| 6   | `unit/utils/file-validation.test.ts`           | 16    | `validateMagicBytes`, `detectMimeType`, `sanitizeFilename`                                                                                        |
| 7   | `unit/utils/client-analytics.test.ts`          | 9     | `computeAnalytics`, `computeSparkline`                                                                                                            |
| 8   | `unit/ocr/image-preprocessor.test.ts`          | 10    | Image preprocessing pipeline                                                                                                                      |
| 9   | `unit/ocr/recognizer.test.ts`                  | 6     | Tesseract recognition                                                                                                                             |
| 10  | `unit/ocr/text-parser.test.ts`                 | 33    | Text → amount/category parsing                                                                                                                    |
| 11  | `unit/ocr/category-matcher.test.ts`            | 17    | Category name matching + aliases                                                                                                                  |
| 12  | `unit/ocr/deduplicator.test.ts`                | 9     | Expense deduplication                                                                                                                             |
| 13  | `unit/ocr/corner-cases.test.ts`                | 38    | OCR edge cases                                                                                                                                    |
| 14  | `unit/analytics/budget-tracker.test.ts`        | 7     | `getBudgetOverview`                                                                                                                               |
| 15  | `unit/analytics/category-deepdive.test.ts`     | 8     | `getCategoryDeepDive`                                                                                                                             |
| 16  | `unit/analytics/heatmap-calculator.test.ts`    | 8     | `getCategoryHeatmap`                                                                                                                              |
| 17  | `unit/analytics/mom-calculator.test.ts`        | 9     | `getMonthSummary`, `getMoMComparison`                                                                                                             |
| 18  | `unit/analytics/savings-calculator.test.ts`    | 4     | `calculateSavings`                                                                                                                                |
| 19  | `unit/analytics/trend-analyzer.test.ts`        | 7     | `getCategoryTrends`, `getTopCategories`                                                                                                           |
| 20  | `unit/analytics/yoy-calculator.test.ts`        | 6     | `getYoYComparison`                                                                                                                                |
| 21  | `unit/persona/archetypes.test.ts`              | 19    | `matchPersona`, 9 archetypes                                                                                                                      |
| 22  | `unit/persona/insight-generator.test.ts`       | 10    | `generateInsights`                                                                                                                                |
| 23  | `unit/persona/persona-generator.test.ts`       | 6     | `buildPersonaSignals`, `generatePersona`                                                                                                          |
| 24  | `unit/persona/recommendation-engine.test.ts`   | 16    | `generateRecommendations`                                                                                                                         |
| 25  | `unit/email/email-client.test.ts`              | 9     | `getEmailConfig`, `isEmailConfigured`, `createEmailTransport`, `sendEmail`, `verifyConnection`, `resetTransport`                                  |
| 26  | `unit/email/email-service.test.ts`             | 7     | `sendUploadReminder`, `sendDashboardReady`, `getEmailLog`                                                                                         |
| 27  | `unit/email/email-templates.test.ts`           | 17    | `renderUploadReminder`, `renderDashboardReady`, `renderPasswordReset`                                                                             |
| 28  | `unit/email/scheduler.test.ts`                 | 7     | `startScheduler`, `stopScheduler`, `isSchedulerRunning`                                                                                           |
| 29  | `unit/export/csv-export.test.ts`               | 13    | `exportToCsv`                                                                                                                                     |
| 30  | `unit/export/excel-export.test.ts`             | 6     | `exportToExcel`                                                                                                                                   |
| 31  | `unit/middleware/rate-limit.test.ts`           | 9     | `createRateLimiter`, `authLimiter`, `registerLimiter`, `apiLimiter`                                                                               |
| 32  | `unit/services/danger-zone-service.test.ts`    | 3     | `deleteAllUserData`, `deleteUserAccount`                                                                                                          |
| 33  | `unit/services/forex-service.test.ts`          | 9     | `getRate`, `getAllRates`                                                                                                                          |
| 34  | `unit/services/password-reset-service.test.ts` | 11    | `hashToken`, `createResetToken`, `resetPassword`                                                                                                  |
| 35  | `unit/services/version-service.test.ts`        | 6     | `getDataVersion`, `bumpDataVersion`                                                                                                               |
| 36  | `unit/services/user-service.test.ts`           | 17    | `getProfile`, `updateProfile`, `changePassword`                                                                                                   |

### 1.2 Vitest — Integration Tests (18 files)

| #   | Test File                                       | Tests | Covers                                                          |
| --- | ----------------------------------------------- | ----- | --------------------------------------------------------------- |
| 1   | `integration/api/expenses.test.ts`              | 16    | CRUD for expenses                                               |
| 2   | `integration/api/expenses-edge-cases.test.ts`   | 21    | Boundaries, precision, cross-user                               |
| 3   | `integration/api/categories.test.ts`            | 12    | CRUD for categories                                             |
| 4   | `integration/api/categories-edge-cases.test.ts` | 13    | Boundaries, uniqueness, cross-user                              |
| 5   | `integration/api/budgets.test.ts`               | 8     | CRUD for budgets                                                |
| 6   | `integration/api/budgets-edge-cases.test.ts`    | 16    | Boundaries, overlaps, cross-user                                |
| 7   | `integration/api/income.test.ts`                | 18    | CRUD for income                                                 |
| 8   | `integration/api/income-edge-cases.test.ts`     | 7     | Boundaries, cross-user, precision                               |
| 9   | `integration/api/audit-log.test.ts`             | 7     | `logAuditAction`, `getAuditLog`                                 |
| 10  | `integration/api/bulk-expenses.test.ts`         | 5     | `bulkDeleteExpenses`, `bulkUpdateExpenses`                      |
| 11  | `integration/analytics-flow.test.ts`            | 16    | Full analytics pipeline (MoM, savings, budgets, trends)         |
| 12  | `integration/data-isolation.test.ts`            | 20    | Cross-user isolation for categories, expenses, budgets, uploads |
| 13  | `integration/ocr-pipeline.test.ts`              | 9     | End-to-end OCR processing                                       |
| 14  | `integration/ocr-golden.test.ts`                | ~27   | 13 months × 2 screenshots golden tests                          |
| 15  | `integration/upload-e2e.test.ts`                | 13    | Upload → process → commit flow                                  |
| 16  | `integration/upload-service.test.ts`            | 14    | `createUpload`, `processUpload`, `commitUpload`, `getUploads`   |
| 17  | `integration/excel-import.test.ts`              | 10    | `parseExcelBuffer`, `importExcelData`                           |
| 18  | `integration/commit-flow.test.ts`               | 8     | Commit upload → create expenses                                 |

### 1.3 Playwright E2E (5 spec files)

| #   | Spec File                    | Tests | Covers                                                                      |
| --- | ---------------------------- | ----- | --------------------------------------------------------------------------- |
| 1   | `e2e/console-health.spec.ts` | ~17   | 14 routes × error check + 3 hydration checks                                |
| 2   | `e2e/page-smoke.spec.ts`     | 8     | Dashboard, Expenses, Analytics, Settings, Budgets, Persona, Login, Register |
| 3   | `e2e/onboarding.spec.ts`     | 6     | Wizard steps, navigation, skip, celebration                                 |
| 4   | `e2e/feature-tour.spec.ts`   | 6     | Tour button, data-tour attributes, desktop/mobile                           |
| 5   | `e2e/upload-flow.spec.ts`    | 8     | Upload UI flow                                                              |

---

## 2. Full Source → Test Coverage Map

### 2.1 Services (11 files)

| Service                     | Functions                                                                                                                          | Test File(s)                                                           | Status                                                                                                       |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `audit-service.ts`          | `logAuditAction`, `getAuditLog`                                                                                                    | `integration/api/audit-log.test.ts` (7)                                | ✅ Covered                                                                                                   |
| `budget-service.ts`         | `createBudget`, `getBudgets`, `getActiveBudget`, `updateBudget`, `deleteBudget`                                                    | `integration/api/budgets*.test.ts` (24)                                | ✅ Covered                                                                                                   |
| `category-service.ts`       | `createCategory`, `getCategories`, `getCategoryById`, `updateCategory`, `deleteCategory`, `getCategoryStats`, `resolveCategoryIds` | `integration/api/categories*.test.ts` (25)                             | ⚠️ `getCategoryStats` + `resolveCategoryIds` untested                                                        |
| `danger-zone-service.ts`    | `deleteAllUserData`, `deleteUserAccount`                                                                                           | `unit/services/danger-zone-service.test.ts` (3)                        | ⚠️ Only checks expenses/categories/budgets — missing income, uploads, audit_log, personas, email_log cascade |
| `expense-service.ts`        | `createExpense`, `getExpenses`, `getExpenseById`, `updateExpense`, `deleteExpense`, `bulkDeleteExpenses`, `bulkUpdateExpenses`     | `integration/api/expenses*.test.ts` (37) + `bulk-expenses.test.ts` (5) | ✅ Well covered                                                                                              |
| `forex-service.ts`          | `getRate`, `getAllRates`                                                                                                           | `unit/services/forex-service.test.ts` (9)                              | ✅ Covered                                                                                                   |
| `income-service.ts`         | `createIncome`, `upsertIncome`, `getIncome`, `updateIncome`, `deleteIncome`, `parsePaystubPdf`                                     | `integration/api/income*.test.ts` (25)                                 | ⚠️ `upsertIncome`, `updateIncome`, `parsePaystubPdf` not directly tested                                     |
| `password-reset-service.ts` | `hashToken`, `createResetToken`, `resetPassword`                                                                                   | `unit/services/password-reset-service.test.ts` (11)                    | ✅ Well covered                                                                                              |
| `upload-service.ts`         | `createUpload`, `processUpload`, `processBatchUploads`, `commitUpload`, `getUploads`, `getUpload`                                  | Multiple integration files (35)                                        | ✅ Well covered                                                                                              |
| `user-service.ts`           | `getProfile`, `updateProfile`, `changePassword`                                                                                    | `unit/services/user-service.test.ts` (17)                              | ✅ Well covered                                                                                              |
| `version-service.ts`        | `getDataVersion`, `bumpDataVersion`                                                                                                | `unit/services/version-service.test.ts` (6)                            | ✅ Covered                                                                                                   |

### 2.2 Analytics (7 logic files)

| Module                 | Functions                               | Test File                                       | Status |
| ---------------------- | --------------------------------------- | ----------------------------------------------- | ------ |
| `budget.ts`            | `getBudgetOverview`                     | `unit/analytics/budget-tracker.test.ts` (7)     | ✅     |
| `category-deepdive.ts` | `getCategoryDeepDive`                   | `unit/analytics/category-deepdive.test.ts` (8)  | ✅     |
| `heatmap.ts`           | `getCategoryHeatmap`                    | `unit/analytics/heatmap-calculator.test.ts` (8) | ✅     |
| `mom.ts`               | `getMonthSummary`, `getMoMComparison`   | `unit/analytics/mom-calculator.test.ts` (9)     | ✅     |
| `savings.ts`           | `calculateSavings`                      | `unit/analytics/savings-calculator.test.ts` (4) | ✅     |
| `trends.ts`            | `getCategoryTrends`, `getTopCategories` | `unit/analytics/trend-analyzer.test.ts` (7)     | ✅     |
| `yoy.ts`               | `getYoYComparison`                      | `unit/analytics/yoy-calculator.test.ts` (6)     | ✅     |

### 2.3 Utilities (7 logic files)

| Module                 | Functions                                                                                  | Test File                                   | Status      |
| ---------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------- | ----------- |
| `currency.ts`          | `parseIndianNumber`, `formatINR`, `formatCurrency`, `formatInputWithCommas`, `stripCommas` | 2 test files (47)                           | ✅          |
| `dates.ts`             | 7 functions + `MONTH_SELECT_ITEMS`                                                         | `unit/utils/date-helpers.test.ts` (17)      | ✅          |
| `validators.ts`        | 14 Zod schemas                                                                             | `unit/utils/validators.test.ts` (46)        | ⚠️ See §3.3 |
| `password-strength.ts` | `getPasswordStrength`, `isPasswordComplex`                                                 | `unit/utils/password-strength.test.ts` (15) | ✅          |
| `file-validation.ts`   | `validateMagicBytes`, `detectMimeType`, `sanitizeFilename`                                 | `unit/utils/file-validation.test.ts` (16)   | ✅          |
| `client-analytics.ts`  | `computeAnalytics`, `computeSparkline`                                                     | `unit/utils/client-analytics.test.ts` (9)   | ✅          |
| **`api-error.ts`**     | `handleApiError` (+ internal `classifyError`)                                              | ❌ **NO TEST**                              | 🔴 **GAP**  |

### 2.4 Other Modules

| Module                     | Functions                                                                          | Test File                                | Status                                               |
| -------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------- |
| `middleware/rate-limit.ts` | `createRateLimiter`, `authLimiter`, `registerLimiter`, `apiLimiter`                | `unit/middleware/rate-limit.test.ts` (9) | ✅                                                   |
| **`cache/index.ts`**       | `cacheGet`, `cacheInvalidate`, `cacheInvalidateByTags`, `cacheClear`, `cacheStats` | ❌ **NO TEST**                           | 🔴 **GAP** — bypasses in test env but logic untested |
| `middleware.ts` (Next.js)  | `middleware` — rate-limit routing                                                  | ❌ **NO TEST**                           | 🟡 Covered indirectly by rate-limit unit tests       |
| `tour/config.ts`           | Tour step config                                                                   | ❌ No test                               | 🟢 Low priority (config constants)                   |
| `api-client.ts`            | API fetch wrapper                                                                  | ❌ No test                               | 🟢 Low priority (thin wrapper)                       |

### 2.5 API Routes (38 files, 50 handlers)

#### Expenses — ✅ Fully Tested

| Route                       | Method             | Test Coverage                           |
| --------------------------- | ------------------ | --------------------------------------- |
| `/api/expenses`             | GET                | `integration/api/expenses.test.ts`      |
| `/api/expenses`             | POST               | `integration/api/expenses.test.ts`      |
| `/api/expenses/[id]`        | GET, PATCH, DELETE | `integration/api/expenses.test.ts`      |
| `/api/expenses/bulk-delete` | POST               | `integration/api/bulk-expenses.test.ts` |
| `/api/expenses/bulk-update` | POST               | `integration/api/bulk-expenses.test.ts` |

#### Categories — ⚠️ Partial

| Route                       | Method        | Test Coverage                        |
| --------------------------- | ------------- | ------------------------------------ |
| `/api/categories`           | GET, POST     | `integration/api/categories.test.ts` |
| `/api/categories/[id]`      | GET           | ⚠️ Tested via isolation tests only   |
| `/api/categories/[id]`      | PATCH, DELETE | `integration/api/categories.test.ts` |
| **`/api/categories/stats`** | **GET**       | ❌ **NO TEST**                       |

#### Budgets — ✅ Fully Tested

| Route               | Method        | Test Coverage                     |
| ------------------- | ------------- | --------------------------------- |
| `/api/budgets`      | GET, POST     | `integration/api/budgets.test.ts` |
| `/api/budgets/[id]` | PATCH, DELETE | `integration/api/budgets.test.ts` |

#### Income — ⚠️ Partial

| Route                    | Method    | Test Coverage                       |
| ------------------------ | --------- | ----------------------------------- |
| `/api/income`            | GET, POST | `integration/api/income.test.ts`    |
| `/api/income/[id]`       | DELETE    | `integration/api/income.test.ts`    |
| **`/api/income/[id]`**   | **PATCH** | ❌ **NO TEST** (`updateIncome`)     |
| **`/api/income/upload`** | **POST**  | ❌ **NO TEST** (paystub PDF upload) |

#### Analytics — ⚠️ Partial

| Route                              | Method  | Test Coverage                            |
| ---------------------------------- | ------- | ---------------------------------------- |
| `/api/analytics`                   | GET     | `integration/analytics-flow.test.ts`     |
| `/api/analytics/trends`            | GET     | `integration/analytics-flow.test.ts`     |
| **`/api/analytics/sparkline`**     | **GET** | ❌ **NO TEST**                           |
| **`/api/analytics/category/[id]`** | **GET** | ❌ **NO TEST** (category deepdive route) |
| **`/api/analytics/heatmap`**       | **GET** | ❌ **NO TEST**                           |
| **`/api/analytics/yoy`**           | **GET** | ❌ **NO TEST**                           |

> Note: The underlying analytics functions ARE unit tested. These API route wrappers (auth + query param parsing + error handling) are not.

#### Auth — ⚠️ Partial

| Route                           | Method    | Test Coverage                              |
| ------------------------------- | --------- | ------------------------------------------ |
| `/api/auth/[...nextauth]`       | GET, POST | NextAuth built-in, not directly testable   |
| `/api/auth/register`            | POST      | ❌ No integration test (validators tested) |
| **`/api/auth/forgot-password`** | **POST**  | ❌ **NO TEST** (service tested, route not) |
| **`/api/auth/reset-password`**  | **POST**  | ❌ **NO TEST** (service tested, route not) |

#### User — ❌ No Route Tests (services are unit tested)

| Route                     | Method     | Test Coverage  |
| ------------------------- | ---------- | -------------- |
| **`/api/user/profile`**   | **GET**    | ❌ **NO TEST** |
| **`/api/user/profile`**   | **PATCH**  | ❌ **NO TEST** |
| **`/api/user/password`**  | **POST**   | ❌ **NO TEST** |
| **`/api/user/data`**      | **DELETE** | ❌ **NO TEST** |
| **`/api/user/account`**   | **DELETE** | ❌ **NO TEST** |
| **`/api/user/audit-log`** | **GET**    | ❌ **NO TEST** |

#### Other — ❌ No Route Tests

| Route                            | Method        | Test Coverage                                 |
| -------------------------------- | ------------- | --------------------------------------------- |
| **`/api/email`**                 | **GET, POST** | ❌ **NO TEST**                                |
| **`/api/export`**                | **GET**       | ❌ **NO TEST** (export functions unit tested) |
| **`/api/forex`**                 | **GET**       | ❌ **NO TEST** (service unit tested)          |
| **`/api/persona`**               | **GET**       | ❌ **NO TEST** (engine unit tested)           |
| **`/api/snapshot`**              | **GET**       | ❌ **NO TEST**                                |
| **`/api/version`**               | **GET**       | ❌ **NO TEST** (service unit tested)          |
| **`/api/cron/email-reminder`**   | **GET**       | ❌ **NO TEST**                                |
| `/api/uploads`                   | GET, POST     | Partial via `upload-e2e.test.ts`              |
| `/api/uploads/[id]/process`      | POST          | `upload-e2e.test.ts`                          |
| **`/api/uploads/process-batch`** | **POST**      | ❌ **NO TEST**                                |
| `/api/uploads/[id]/commit`       | POST          | `commit-flow.test.ts`                         |

### 2.6 Hooks (12 files) — ❌ No Tests

All hooks are React Query wrappers — would require component testing (JSDOM + React Testing Library):

| Hook                 | Functions                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `use-analytics.ts`   | `useAnalytics`                                                                                                              |
| `use-budgets.ts`     | `useBudgets`, `useCreateBudget`, `useUpdateBudget`, `useDeleteBudget`                                                       |
| `use-categories.ts`  | `useCategories`, `useCreateCategory`, `useUpdateCategory`, `useDeleteCategory`                                              |
| `use-chart-delta.ts` | `useChartDelta`                                                                                                             |
| `use-email.ts`       | `useEmailLog`, `useSendEmail`                                                                                               |
| `use-expenses.ts`    | `useExpenses`, `useCreateExpense`, `useUpdateExpense`, `useDeleteExpense`, `useBulkDeleteExpenses`, `useBulkUpdateExpenses` |
| `use-income.ts`      | `useIncome`, `useCreateIncome`, `useDeleteIncome`                                                                           |
| `use-page-size.ts`   | `usePageSize`                                                                                                               |
| `use-persona.ts`     | `usePersona`                                                                                                                |
| `use-profile.ts`     | `useProfile`, `useUpdateProfile`, `useChangePassword`                                                                       |
| `use-snapshot.ts`    | `useSnapshot`                                                                                                               |
| `use-uploads.ts`     | `useUploads`, `useUploadImage`, `useProcessUpload`, `useCommitUpload`                                                       |

### 2.7 Components (52 files) — ❌ No Component Tests

All component testing is via Playwright E2E only. No React Testing Library component tests exist.

### 2.8 Pages (17 files)

| Page                       | E2E Coverage                                     |
| -------------------------- | ------------------------------------------------ |
| `/` (landing)              | `console-health` (smoke only)                    |
| `/auth/login`              | `page-smoke` + `console-health`                  |
| `/auth/register`           | `page-smoke` + `console-health`                  |
| `/auth/forgot-password`    | ❌ **NOT IN ANY TEST**                           |
| `/auth/reset-password`     | ❌ **NOT IN ANY TEST**                           |
| `/dashboard`               | `page-smoke` + `console-health`                  |
| `/expenses`                | `page-smoke` + `console-health`                  |
| `/analytics`               | `page-smoke` + `console-health`                  |
| `/analytics/category/[id]` | ❌ **NOT IN ANY TEST**                           |
| `/persona`                 | `page-smoke` + `console-health`                  |
| `/upload`                  | `upload-flow` + `console-health`                 |
| `/onboarding`              | `onboarding` + `console-health`                  |
| `/settings`                | `page-smoke` + `feature-tour` + `console-health` |
| `/settings/budgets`        | `page-smoke` + `console-health`                  |
| `/settings/income`         | `console-health` only                            |
| `/settings/email`          | `console-health` only                            |
| `/settings/profile`        | `console-health` only                            |

---

## 3. Gap Analysis — Prioritized

### 3.1 🔴 CRITICAL — Missing Test Files (0 coverage)

| Priority | Gap                                                                                             | File to Create                                  | Est. Tests |
| -------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------- | ---------- |
| **P0**   | `api-error.ts` has 10+ error classification branches, used in every API route                   | `tests/unit/utils/api-error.test.ts`            | 12-15      |
| **P0**   | Cache LRU, TTL, tag invalidation untested                                                       | `tests/unit/cache/cache.test.ts`                | 10-12      |
| **P1**   | Forgot/reset password API flow                                                                  | `tests/integration/api/forgot-password.test.ts` | 6-8        |
| **P1**   | Cascade delete doesn't verify income/uploads/audit_log cleanup                                  | `tests/integration/api/cascade-delete.test.ts`  | 8-10       |
| **P1**   | Error handling integration (routes return correct status codes for DB errors, validation, etc.) | `tests/integration/api/error-handling.test.ts`  | 8-10       |

### 3.2 🟡 HIGH — Untested Functions in Tested Files

| Priority | Gap                                                                                      | Where to Add                                     | Est. Tests |
| -------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------ | ---------- |
| **P1**   | `getCategoryStats` — category usage counts                                               | `integration/api/categories.test.ts` or new file | 3-4        |
| **P1**   | `resolveCategoryIds` — maps names to IDs                                                 | `integration/api/categories.test.ts`             | 2-3        |
| **P1**   | `updateIncome` — PATCH income entries                                                    | `integration/api/income.test.ts`                 | 4-5        |
| **P1**   | `upsertIncome` — insert-or-update                                                        | `integration/api/income.test.ts`                 | 3-4        |
| **P2**   | Analytics API routes (sparkline, heatmap, yoy, category deepdive) — auth + param parsing | New `integration/api/analytics-routes.test.ts`   | 6-8        |

### 3.3 🟡 HIGH — Validator Schema Gaps

The `unit/utils/validators.test.ts` file covers 7 of 14 schemas. **Missing schemas:**

| Schema                     | Used By                          |
| -------------------------- | -------------------------------- |
| `bulkDeleteExpensesSchema` | `POST /api/expenses/bulk-delete` |
| `bulkUpdateExpensesSchema` | `POST /api/expenses/bulk-update` |
| `updateCategorySchema`     | `PATCH /api/categories/[id]`     |
| `updateBudgetSchema`       | `PATCH /api/budgets/[id]`        |
| `updateIncomeSchema`       | `PATCH /api/income/[id]`         |
| `forgotPasswordSchema`     | `POST /api/auth/forgot-password` |
| `resetPasswordSchema`      | `POST /api/auth/reset-password`  |
| `updateProfileSchema`      | `PATCH /api/user/profile`        |
| `changePasswordSchema`     | `POST /api/user/password`        |

**Estimated: 20-25 additional tests** in `validators.test.ts`.

### 3.4 🟡 MEDIUM — E2E Gaps

| Priority | Gap                                               | File to Create                   | Est. Tests |
| -------- | ------------------------------------------------- | -------------------------------- | ---------- |
| **P2**   | Landing page content, CTA, authenticated redirect | `tests/e2e/landing.spec.ts`      | 4-5        |
| **P2**   | Empty states on all data pages                    | `tests/e2e/empty-states.spec.ts` | 6-8        |
| **P2**   | Forgot/reset password pages in console-health     | Update `console-health.spec.ts`  | +2 routes  |
| **P3**   | Category deepdive page                            | Update `console-health.spec.ts`  | +1 route   |

### 3.5 🟢 LOW — Nice to Have

| Priority | Gap                                                                                  | Notes                                                             |
| -------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| **P3**   | API route tests for thin wrappers (version, forex, persona, snapshot, export, email) | Services are unit tested; routes just add auth + error handling   |
| **P3**   | Hook tests (12 files)                                                                | Requires JSDOM + React Query test utils; hooks are thin wrappers  |
| **P3**   | Component tests                                                                      | Would need React Testing Library; currently covered by Playwright |
| **P3**   | Cron email-reminder route                                                            | Requires CRON_SECRET mocking                                      |
| **P3**   | `processBatchUploads` route                                                          | Batch processing already tested via service                       |

---

## 4. Edge Case Gaps

### 4.1 Danger Zone Service

- ❌ Does NOT verify income entries are deleted
- ❌ Does NOT verify uploads are deleted
- ❌ Does NOT verify audit_log entries are deleted
- ❌ Does NOT verify personas are deleted
- ❌ Does NOT verify email_log entries are deleted
- ❌ Does NOT test deleting a user with zero data (empty user)
- ❌ Missing: what happens with password_reset_tokens on account delete?

### 4.2 Bulk Operations

- ❌ Bulk update with non-existent categoryId
- ❌ Bulk delete with mix of own IDs + other user's IDs (partial success behavior)
- ❌ Bulk update/delete with very large arrays (100+ IDs)

### 4.3 Version Service

- ❌ Concurrent version bumps (race condition)
- ❌ `getDataVersion` for non-existent user
- ❌ Verify version bump is atomic (SQL increment)

### 4.4 Password Reset

- ❌ Multiple reset tokens for same user (should invalidate old ones?)
- ❌ Rate limiting on forgot-password endpoint (prevent email spam)
- ❌ Token cleanup cron (expired tokens accumulate)

### 4.5 Income Service

- ❌ `upsertIncome` — conflict resolution (same year/month)
- ❌ `updateIncome` — partial update, cross-user isolation
- ❌ `parsePaystubPdf` — malformed PDF, empty PDF, non-PDF file

### 4.6 Data Isolation Gaps

- Current test covers: categories, expenses, budgets, uploads
- ❌ Missing: income isolation (separate `income-edge-cases.test.ts` has 2 cross-user tests, but not in `data-isolation.test.ts`)
- ❌ Missing: audit_log isolation
- ❌ Missing: persona isolation

---

## 5. API Route Handler Pattern — What's NOT Tested

Every API route follows this pattern:

```typescript
export async function GET(request: NextRequest) {
    const session = await auth();              // 1. Auth check
    if (!session?.user?.id) return 401;        // 2. Guard
    const params = request.nextUrl.searchParams; // 3. Parse params
    const validated = schema.safeParse(body);    // 4. Validate
    const result = await service(db, userId, ...); // 5. Call service
    return Response.json({ data: result });      // 6. Return
}
```

**What's tested:** Step 5 (service logic) via integration tests
**What's NOT tested:** Steps 1-4 and 6 (auth guards, param parsing, validation in route context, error responses)

This means:

- A route could accidentally remove its auth guard and no test would catch it
- A route could return wrong HTTP status codes and no test would catch it
- Query param parsing bugs (e.g., `year` as string vs number) would not be caught

**Recommendation:** For critical routes (user data mutations), add API route handler tests that mock `auth()` and call the route handler directly.

---

## 6. Recommended Test Plan — By Priority

### Wave 1: Critical Gaps (~55 new tests)

1. **`tests/unit/utils/api-error.test.ts`** — 15 tests
    - DB errors (schema mismatch, connection, timeout)
    - Constraint violations (unique, FK)
    - Validation/parse errors
    - Auth errors
    - Timeout, network, TLS errors
    - Default fallback
    - `handleApiError` logging + response format

2. **`tests/unit/cache/cache.test.ts`** — 12 tests
    - Note: must override `NODE_ENV` or test the internals directly
    - Cache hit, cache miss, TTL expiry
    - LRU eviction at MAX_ENTRIES
    - `cacheInvalidate` single key
    - `cacheInvalidateByTags` — matching, partial, no match
    - `cacheClear` — empties everything
    - `cacheStats` — reports size
    - Concurrent access patterns

3. **`tests/integration/api/cascade-delete.test.ts`** — 10 tests
    - `deleteAllUserData` verifies ALL tables: expenses, categories, budgets, income, uploads, audit_log, personas, email_log, password_reset_tokens
    - `deleteUserAccount` verifies user row + all data gone
    - Empty user (no data) doesn't throw
    - Other users unaffected

4. **Add to `validators.test.ts`** — 20 tests
    - All 7 missing schemas with valid + invalid cases

### Wave 2: High Gaps (~30 new tests)

5. **`tests/integration/api/forgot-password.test.ts`** — 8 tests
    - POST forgot-password with valid email → creates token
    - POST forgot-password with unknown email → 200 (no info leak)
    - POST forgot-password with OAuth-only user → 200 (no info leak)
    - POST reset-password with valid token → 200, password changed
    - POST reset-password with expired token → 400
    - POST reset-password with used token → 400
    - POST reset-password with invalid token → 400
    - POST reset-password with weak new password → 400

6. **`tests/integration/api/error-handling.test.ts`** — 8 tests
    - classifyError with various Error types → correct status codes
    - handleApiError logs to console.error
    - handleApiError returns JSON with error + code
    - fallbackMessage overrides classified message

7. **Add to `integration/api/income.test.ts`** — 6 tests
    - `updateIncome` — partial update, full update, cross-user isolation
    - `upsertIncome` — insert new, update existing, dedup

8. **Add to `integration/api/categories.test.ts`** — 5 tests
    - `getCategoryStats` — returns usage counts
    - `resolveCategoryIds` — resolves names to IDs, handles missing

### Wave 3: E2E Gaps (~15 new tests)

9. **`tests/e2e/landing.spec.ts`** — 5 tests
    - Landing page renders hero section
    - CTA "Get Started" link goes to `/auth/register`
    - Feature highlight bento cards visible
    - Logo animation renders
    - Authenticated user redirects to `/dashboard`

10. **`tests/e2e/empty-states.spec.ts`** — 6 tests
    - Dashboard with no data shows empty state
    - Expenses page with no data shows empty state
    - Analytics page with no data shows empty state
    - Persona page with no data shows empty state
    - Settings categories with no data shows empty state
    - Budgets page with no budgets shows empty state

11. **Update `console-health.spec.ts`** — +3 routes
    - `/auth/forgot-password`
    - `/auth/reset-password`
    - `/analytics/category/some-id` (dynamic route smoke)

### Wave 4: Edge Cases (~25 new tests)

12. **Danger zone edge cases** — expand existing test (8 tests)
13. **Bulk operations edge cases** — expand existing test (5 tests)
14. **Version service edge cases** — expand existing test (4 tests)
15. **Data isolation for income/audit_log** — expand `data-isolation.test.ts` (8 tests)

---

## 7. Estimated Impact

| Wave                | New Tests | Cumulative Total |
| ------------------- | --------- | ---------------- |
| Current             | —         | ~758             |
| Wave 1 (Critical)   | ~55       | ~813             |
| Wave 2 (High)       | ~30       | ~843             |
| Wave 3 (E2E)        | ~15       | ~858             |
| Wave 4 (Edge Cases) | ~25       | ~883             |
| **Total**           | **~125**  | **~883**         |

---

## 8. Files That Need No Tests

These are either config-only, barrel exports, type definitions, or UI primitives:

- `src/lib/analytics/types.ts` — interfaces only
- `src/lib/analytics/index.ts` — barrel export
- `src/lib/ocr/types.ts` — interfaces only
- `src/lib/ocr/index.ts` — barrel export
- `src/lib/persona/types.ts` — interfaces only
- `src/lib/persona/index.ts` — barrel export
- `src/lib/email/index.ts` — barrel export
- `src/lib/export/index.ts` — barrel export
- `src/lib/tour/index.ts` — barrel export
- `src/lib/utils.ts` — `cn()` helper (trivial)
- `src/lib/constants.ts` — constants
- `src/lib/db/index.ts` — DB connection (tested implicitly)
- `src/lib/db/schema.ts` — schema definition (tested implicitly)
- `src/lib/db/test-utils.ts` — test infrastructure
- All `src/components/ui/*.tsx` — shadcn primitives
- `src/components/providers/theme-provider.tsx` — wrapper
- `src/providers/query-provider.tsx` — wrapper
- `src/app/layout.tsx` — root layout
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth handler
