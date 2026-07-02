# Kharcha — Phase 2 Handoff Document

> **Status:** Phase 2 COMPLETE — 223 Vitest + 21 Playwright = **244 tests, all green**
> **Date:** July 1, 2026

---

## What Was Built (Phase 2 — OCR Pipeline)

Phase 2 implements the full OCR screenshot-to-expense pipeline: image preprocessing, text recognition, parsing, category matching, deduplication, upload management, and UI for the upload→review→commit workflow.

**Master plan:** `/Users/rmoin/Downloads/Personal/context-root/05-finalized-project-plan.md`
**OCR design:** `/Users/rmoin/Downloads/Personal/context-root/06-ocr-resilience-design.md`
**Phase 1 handoff:** `/Users/rmoin/Downloads/Personal/kharcha/PHASE-1-HANDOFF.md`

---

## New Dependencies Added

| Package        | Version | Purpose                                            |
| -------------- | ------- | -------------------------------------------------- |
| `sharp`        | 0.35.2  | Image preprocessing (resize, grayscale, threshold) |
| `tesseract.js` | 5.1.1   | OCR text recognition (WASM, offline)               |
| `prettier`     | 3.9.4   | Code formatting (4-space tabs)                     |

---

## Critical Gotchas for Next Chat

### 1. Tesseract.js misreads the ₹ symbol

Tesseract consistently misreads `₹` as digits (`3`, `2`, `7`) or symbols (`%`, `$`). The parser has 4 regex patterns to handle this:

- **Pattern A** — `₹`, `R`, `%`, `$` as currency symbol (confidence 0.8)
- **Pattern B** — space-separated, no symbol (confidence 0.6)
- **Pattern C** — loose extraction with optional symbol (confidence 0.5)
- **Pattern D** — OCR fallback: strips misread ₹ digit from amount prefix (confidence 0.55)

### 2. OCR icon emoji artifacts

Category emojis get OCR'd as 1-2 letter prefixes (e.g., `"Oo Rapido"`, `"mn Food"`). `normalizeCategory()` strips these automatically.

### 3. Budget Together false positives

The Buddy app has a "Budget Together" section with colon-separated entries (`Clothes: ₹170`). `isBudgetTogetherEntry()` filters these but was carefully tuned to avoid false-positives on OCR semicolons.

### 4. shadcn/ui v4 Select `onValueChange` accepts `string | null`

Wrap with `(v) => v && setter(v)` to avoid null state.

### 5. Prettier formatting — 4-space tabs

All source code uses 4-space indentation. Run `/format` workflow or `npm run format` before committing.

### 6. All Phase 1 gotchas still apply

See `PHASE-1-HANDOFF.md` — especially shadcn v4 `render` prop, Next.js 16 async `params`, and Zod v4 imports.

---

## OCR Pipeline Architecture

```
Screenshot (PNG/JPG)
    ↓
┌─────────────────────────────────────┐
│  1. Preprocessor (Sharp)            │
│  - Resize to 1080px                 │
│  - Grayscale + auto-detect dark     │
│  - Negate if dark mode              │
│  - Normalize + sharpen + threshold  │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  2. Recognizer (Tesseract.js)       │
│  - WASM engine, English lang        │
│  - Returns: full text + word boxes  │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  3. Parser (Regex)                  │
│  - 4 patterns (A/B/C/D)            │
│  - Noise filtering (nav, tabs,     │
│    status bar, Budget Together)     │
│  - Confidence scoring per pattern   │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  4. Category Matcher                │
│  - Alias map (62 aliases)           │
│  - Icon prefix stripping            │
│  - Levenshtein fuzzy matching       │
│  - Confidence multiplier            │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  5. Deduplicator (batch only)       │
│  - Group by normalized category     │
│  - Merge: highest confidence wins   │
│  - Flag conflicts (different amts)  │
└──────────────┬──────────────────────┘
               ↓
  Deduplicated entries → Review UI → DB
```

---

## Files Created/Modified

### OCR Pipeline (`src/lib/ocr/`)

| File                  | Purpose                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| `types.ts`            | All pipeline type definitions (ExtractedEntry, DeduplicatedEntry, ImageResult, BatchResult, etc.)        |
| `preprocessor.ts`     | Sharp-based image preprocessing (resize, grayscale, dark mode detection, normalize, sharpen, threshold)  |
| `recognizer.ts`       | Tesseract.js wrapper — returns full text + word-level bounding boxes + confidence                        |
| `parser.ts`           | 4-pattern regex extraction with noise filtering, Budget Together rejection, confidence scoring           |
| `category-matcher.ts` | 62-alias map + Levenshtein fuzzy matching + OCR icon prefix stripping + title case normalization         |
| `deduplicator.ts`     | Cross-screenshot dedup — groups by normalized category, picks highest confidence, flags amount conflicts |
| `pipeline.ts`         | Orchestrator — `processImage()` (single) and `processBatch()` (multi with dedup)                         |
| `index.ts`            | Barrel export for all OCR modules and types                                                              |

### Upload Service (`src/lib/services/`)

| File                | Purpose                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `upload-service.ts` | Full upload lifecycle: `createUpload`, `processUpload`, `processBatchUploads`, `commitUpload`, `getUploads`, `getUpload` |

### API Routes (`src/app/api/uploads/`)

| Route                       | Method | Purpose                                                         |
| --------------------------- | ------ | --------------------------------------------------------------- |
| `/api/uploads`              | `GET`  | List uploads (filter by year, month, status)                    |
| `/api/uploads`              | `POST` | Upload screenshots (multipart form, max 5 files, max 10MB each) |
| `/api/uploads/[id]/process` | `POST` | Run OCR pipeline on a pending upload                            |
| `/api/uploads/[id]/commit`  | `POST` | Save approved entries as expenses                               |

### UI Components (`src/components/upload/`)

| File               | Purpose                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| `dropzone.tsx`     | Drag & drop file selector with file list, remove, size display, batch limit                      |
| `review-table.tsx` | Editable review table — approve/reject checkboxes, inline edit, confidence badges, commit button |

### Upload Page (`src/app/(app)/upload/page.tsx`)

Full 3-step flow: **Upload** (dropzone + month/year selector) → **Review** (editable table) → **Done** (success confirmation). Error states displayed with visible banner.

### Formatting

| File                            | Purpose                                                      |
| ------------------------------- | ------------------------------------------------------------ |
| `.prettierrc`                   | 4-space tabs, double quotes, trailing commas, 100 char width |
| `.prettierignore`               | Excludes node_modules, .next, dist, data, coverage, *.db     |
| `.windsurf/workflows/format.md` | `/format` workflow — runs prettier + verifies tests          |

---

## Test Suite (244 Tests Total)

### Vitest — 223 Tests (14 files)

| File                                        | Tests | What It Covers                                                                |
| ------------------------------------------- | ----: | ----------------------------------------------------------------------------- |
| `tests/unit/utils/currency.test.ts`         |    29 | INR formatting, parsing, Indian comma placement                               |
| `tests/unit/utils/date-helpers.test.ts`     |    17 | Month name mapping, range calculations                                        |
| `tests/integration/api/expenses.test.ts`    |    16 | Expense CRUD via service layer                                                |
| `tests/integration/api/categories.test.ts`  |    12 | Category CRUD, unique name constraint                                         |
| `tests/integration/excel-import.test.ts`    |    10 | Excel parsing, validation, DB import                                          |
| `tests/integration/api/budgets.test.ts`     |     8 | Budget CRUD, date range logic                                                 |
| `tests/unit/ocr/image-preprocessor.test.ts` |    10 | Sharp preprocessing: resize, grayscale, dark mode, threshold                  |
| `tests/unit/ocr/recognizer.test.ts`         |     6 | Tesseract.js: text extraction, word boxes, confidence                         |
| `tests/unit/ocr/text-parser.test.ts`        |    29 | Regex patterns, noise filtering, Budget Together, amount extraction           |
| `tests/unit/ocr/category-matcher.test.ts`   |    17 | Alias resolution, fuzzy matching, normalization                               |
| `tests/unit/ocr/deduplicator.test.ts`       |     9 | Cross-screenshot merge, conflict detection                                    |
| `tests/unit/ocr/corner-cases.test.ts`       |    38 | Edge cases: ₹ misreads, icon prefix, false positives, large batches           |
| `tests/integration/ocr-pipeline.test.ts`    |     9 | Full pipeline on 9 real screenshots + batch dedup + noise rejection           |
| `tests/integration/upload-e2e.test.ts`      |    13 | **TRUE E2E**: real images → upload service → OCR → DB write → verify expenses |

### Playwright — 21 Tests (2 files)

| File                               | Tests | What It Covers                                                                        |
| ---------------------------------- | ----: | ------------------------------------------------------------------------------------- |
| `tests/e2e/console-health.spec.ts` |    13 | Zero console errors + hydration warnings on all routes                                |
| `tests/e2e/upload-flow.spec.ts`    |     8 | Upload UI: dropzone, file selection, multi-file, remove, error states, console health |

### Test Fixtures

| Path                          | Contents                                         |
| ----------------------------- | ------------------------------------------------ |
| `tests/fixtures/screenshots/` | 9 real Buddy app screenshots (IMG_2806-2816.PNG) |
| `tests/fixtures/expected/`    | Expected extraction JSON files for validation    |

---

## Bugs Found & Fixed During Audit

### 1. `isBudgetTogetherEntry` false positives (parser.ts)

**Problem:** Regex `/[A-Za-z]+[;:]\s*[₹R%$]?\d/` matched ANY line with word+colon+digit. OCR semicolons (`Electronics;34,317`) were silently swallowed as Budget Together entries.

**Fix:** Changed to require `:` only (not `;`), require 3+ letter word before colon, and explicitly exclude lines with list-style spacing (2+ spaces before number).

### 2. `normalizeCategory` case-sensitive icon strip (category-matcher.ts)

**Problem:** Lookahead `(?=[A-Z])` only stripped when followed by uppercase. `"mn food"` (lowercase) wouldn't strip.

**Fix:** Changed to `(?=[A-Za-z]{3,})` — case-insensitive, requires 3+ chars after to protect real short category names.

### 3. Missing file size limit (uploads/route.ts)

**Problem:** No max file size validation. Users could upload 50MB images.

**Fix:** Added 10MB max per file validation.

### 4. Silent errors in UI (upload/page.tsx)

**Problem:** Upload/commit failures were only `console.error`'d. Users saw nothing.

**Fix:** Added `errorMessage` state with visible red banner using `AlertCircle` icon.

### 5. React Compiler lint error (review-table.tsx)

**Problem:** `handleCommit` used `useCallback` with `approvedEntries` (a computed array) as dependency, which the React Compiler couldn't preserve.

**Fix:** Converted to plain function that computes approved entries inside the callback body.

### 6. Unused imports (pipeline.ts, upload-service.ts)

**Problem:** `normalizeCategory` and `DeduplicatedEntry` imported but unused.

**Fix:** Removed.

---

## Verification Steps Performed

1. **223 Vitest tests passing** — `npx vitest run`
2. **21 Playwright E2E tests passing** — `npx playwright test`
3. **0 lint errors** — `npx eslint src/` (3 warnings: `_error` catch variables, expected)
4. **Prettier formatted** — entire codebase with 4-space tabs
5. **True E2E test** — real IMG_2806.PNG uploaded → OCR processed → entries verified in in-memory SQLite → committed as expenses → 5 expense rows verified in DB
6. **Batch E2E test** — IMG_2811 + IMG_2812 batch processed with deduplication verified
7. **Corner case audit** — 38 targeted tests for OCR edge cases (₹ misreads, icon prefixes, false positives, empty categories, large batches)
8. **Error handling** — tested non-existent uploads, wrong status, wrong user, all throw correct errors

---

## Scripts

```bash
npm run dev          # Start dev server (localhost:3000)
npm test             # Run Vitest (223 tests)
npm run test:e2e     # Run Playwright (21 tests)
npm run test:watch   # Vitest watch mode
npm run format       # Prettier — format all source files (4-space tabs)
npm run format:check # Prettier — check without writing
npm run lint         # ESLint
npm run db:push      # Push schema to SQLite
npm run db:studio    # Open Drizzle Studio
```

---

## File Tree (Phase 2 Additions)

```
kharcha/
├── src/
│   ├── app/
│   │   ├── (app)/
│   │   │   └── upload/page.tsx           # Full upload→review→commit flow (was placeholder)
│   │   └── api/
│   │       └── uploads/
│   │           ├── route.ts              # GET (list) + POST (multipart upload)
│   │           └── [id]/
│   │               ├── process/route.ts  # POST (run OCR pipeline)
│   │               └── commit/route.ts   # POST (save to expenses)
│   ├── components/
│   │   └── upload/
│   │       ├── dropzone.tsx              # Drag & drop file selector
│   │       └── review-table.tsx          # Editable review table
│   └── lib/
│       ├── ocr/
│       │   ├── types.ts                  # Pipeline type definitions
│       │   ├── preprocessor.ts           # Sharp image preprocessing
│       │   ├── recognizer.ts             # Tesseract.js wrapper
│       │   ├── parser.ts                 # 4-pattern regex extraction
│       │   ├── category-matcher.ts       # Alias + fuzzy matching
│       │   ├── deduplicator.ts           # Cross-screenshot dedup
│       │   ├── pipeline.ts               # Orchestrator (processImage, processBatch)
│       │   └── index.ts                  # Barrel export
│       └── services/
│           └── upload-service.ts         # Upload lifecycle management
├── tests/
│   ├── unit/ocr/
│   │   ├── image-preprocessor.test.ts    # 10 tests
│   │   ├── recognizer.test.ts           # 6 tests
│   │   ├── text-parser.test.ts          # 29 tests
│   │   ├── category-matcher.test.ts     # 17 tests
│   │   ├── deduplicator.test.ts         # 9 tests
│   │   └── corner-cases.test.ts         # 38 tests (edge case audit)
│   ├── integration/
│   │   ├── ocr-pipeline.test.ts         # 9 tests (real screenshots)
│   │   └── upload-e2e.test.ts           # 13 tests (TRUE E2E with DB)
│   ├── e2e/
│   │   ├── console-health.spec.ts       # 13 tests
│   │   └── upload-flow.spec.ts          # 8 tests (upload UI)
│   └── fixtures/
│       ├── screenshots/                  # 9 training PNGs
│       └── expected/                     # Expected extraction JSONs
├── .prettierrc                           # 4-space tabs config
├── .prettierignore                       # Formatting exclusions
└── .windsurf/workflows/format.md         # /format workflow
```

---

## Phase 3: What's Next

Per the master plan, Phase 3 covers the remaining UI pages and features:

| Step | Task                                                                                          |
| ---- | --------------------------------------------------------------------------------------------- |
| 3.1  | Expenses page — table view with filters (month, category, source)                             |
| 3.2  | Expenses page — add/edit/delete expense modal                                                 |
| 3.3  | Analytics page — Recharts charts (monthly trends, category breakdown)                         |
| 3.4  | Dashboard — wire up bento grid with real data (summary cards, top categories, recent uploads) |
| 3.5  | Budgets page — budget management UI (set limits, view progress bars)                          |
| 3.6  | Persona page — monthly spending persona with insights                                         |
| 3.7  | Settings page — profile, currency preference, export                                          |
| 3.8  | Excel import UI — upload .xlsx, preview, import                                               |

**Key resources already built:**

- All services exist (expense, category, budget, upload)
- All API routes exist
- Database schema is complete (13 tables)
- Currency formatting, date helpers, validators all tested
- Excel parser exists and is tested
- Recharts is installed but not yet used

---

## How to Verify Everything Works

```bash
# 1. Install deps
npm install

# 2. Push DB schema
npx drizzle-kit push

# 3. Run all unit/integration tests
npm test
# Expected: 14 files, 223 tests, all passing

# 4. Start dev server
npm run dev

# 5. Run E2E tests (in another terminal)
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run test:e2e
# Expected: 21 tests, all passing

# 6. Format check
npm run format:check
# Expected: all files formatted

# 7. Lint check
npm run lint
# Expected: 0 errors (3 warnings OK — _error catch variables)

# 8. Open browser
open http://localhost:3000
```
