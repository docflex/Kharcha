# Kharcha — Phase 4 Handoff Document

> **Status:** Phase 4 COMPLETE — **476 Vitest + 21 Playwright = 497 tests, all green**
> **Date:** July 1, 2026

---

## What Was Built

Phase 4 covers **Personas & Intelligence** — a rule-based, AI-free persona engine that analyzes monthly spending and generates a spending personality, insights, and recommendations.

**Master plan:** `/Users/rmoin/Downloads/Personal/context-root/05-finalized-project-plan.md`
**Phase 3 handoff:** `/Users/rmoin/Downloads/Personal/kharcha/PHASE-3-HANDOFF.md`

---

## Critical Gotchas for Next Chat

### 1. All Phase 1 + Phase 2 + Phase 3 gotchas still apply

See previous handoff docs (shadcn v4 `render` prop, Next.js 16 async `params`, Zod v4 imports, OCR parser patterns, `fetchTrigger` pattern, `AbortController` in useEffect).

### 2. Persona engine is pure functions + analytics DB queries

The engine has no AI/ML — it's rule-based. It re-uses the existing analytics engine (MoM, savings, budget, trends) to build "signals", then matches one of 9 archetypes.

### 3. Archetypes are priority-ordered

`PERSONA_ARCHETYPES` in `archetypes.ts` has 9 entries sorted by `priority` (100 = highest, 20 = lowest). The engine checks from highest to lowest and picks the first match. Falls back to "The Steady" if nothing matches.

### 4. Persona API upserts to DB

`GET /api/persona?year=&month=` generates the persona **and** caches it in the `personas` table (upsert). This means calling the API multiple times for the same month updates the cached result with fresh data.

### 5. History endpoint for timeline

`GET /api/persona?history=true` returns all cached personas for the user, ordered by date descending. The timeline UI renders from this data.

### 6. Insights capped at 5

`generateInsights()` returns at most 5 insights per month, prioritized: over-budget → increasing categories → decreasing → under-budget → new categories → savings rate.

### 7. Recommendation types

Four types: `cut_back` (>120% budget), `watch_out` (trending up 3+ months), `great_job` (trending down or under budget), `room_to_spend` (<60% budget).

---

## Persona Archetypes

| #   | Persona          | Emoji | Priority | Trigger Conditions                                   |
| --- | ---------------- | ----- | -------- | ---------------------------------------------------- |
| 1   | The Red Flagger  | 🚩    | 100      | `savingsRate < 0` (spending > income)                |
| 2   | The Overachiever | 🔥    | 90       | `spend/income < 50%`, all budgets met, budgets exist |
| 3   | The Saver        | 🏦    | 80       | `savingsRate > 40%`, most categories under budget    |
| 4   | The Optimizer    | 🧘    | 70       | `savingsRate 25-40%`, spending trending down MoM     |
| 5   | The Generous     | 🎁    | 60       | Gift+Entertainment > 15% of spend, moderate overall  |
| 6   | The Explorer     | 🧭    | 50       | 2+ new categories, MoM increase ≤ 25%                |
| 7   | The Steady       | ⚖️    | 40       | MoM change < 5%                                      |
| 8   | The Stretcher    | 📈    | 30       | MoM increase > 15%, some budgets exceeded            |
| 9   | The Splurger     | 💸    | 20       | `savingsRate < 10%` (≥ 0), 2+ budgets exceeded       |

---

## Persona Engine Architecture

```
DB Data (expenses, income, budgets, categories)
    ↓
┌─────────────────────────────────────────────────────┐
│  buildPersonaSignals()                               │
│  Gathers: MoM, savings, budget overview, trends     │
│  Output: PersonaSignals object                       │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│  matchPersona()                                      │
│  Checks 9 archetypes in priority order              │
│  Returns: PersonaArchetype (name, emoji, description) │
├─────────────────────────────────────────────────────┤
│  generateInsights()                                  │
│  Produces 3-5 insights from signals                 │
│  Types: over_budget, spending_increase/decrease,    │
│         under_budget, new_category, savings_trend   │
├─────────────────────────────────────────────────────┤
│  generateRecommendations()                           │
│  Produces cut_back, room_to_spend, watch_out,       │
│  great_job recommendations                          │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│  generatePersona()                                   │
│  Orchestrates all above                             │
│  Output: PersonaResult (persona + metrics +          │
│          insights + recommendations)                │
└─────────────────────────────────────────────────────┘
```

---

## Files Created

### Persona Engine (`src/lib/persona/`)

| File                 | Purpose                                                                        |
| -------------------- | ------------------------------------------------------------------------------ |
| `types.ts`           | TypeScript interfaces (PersonaSignals, PersonaResult, Insight, Recommendation) |
| `archetypes.ts`      | 9 archetype definitions with match functions + `matchPersona()`                |
| `generator.ts`       | `buildPersonaSignals()` + `generatePersona()` orchestrator                     |
| `insights.ts`        | `generateInsights()` — 3-5 insights per month                                  |
| `recommendations.ts` | `generateRecommendations()` — cut-back/spend-more suggestions                  |
| `index.ts`           | Barrel export                                                                  |

### API Route

| Route          | Method | Purpose                                                       |
| -------------- | ------ | ------------------------------------------------------------- |
| `/api/persona` | `GET`  | Generate persona for `?year=&month=` or fetch `?history=true` |

### UI Components (`src/components/persona/`)

| File                  | Purpose                                                   |
| --------------------- | --------------------------------------------------------- |
| `persona-card.tsx`    | Persona name/emoji/description + 4 metric tiles           |
| `insights-list.tsx`   | Staggered list of insights with sentiment-colored borders |
| `recommendations.tsx` | Recommendation cards with type badges                     |

### UI Page

| Page       | What It Does                                                               |
| ---------- | -------------------------------------------------------------------------- |
| `/persona` | Full persona page: card + insights + recommendations + historical timeline |

### Tests (`tests/unit/persona/`)

| File                            | Tests | What It Covers                                            |
| ------------------------------- | ----- | --------------------------------------------------------- |
| `archetypes.test.ts`            | 19    | 9 archetype match conditions, priority ordering, fallback |
| `persona-generator.test.ts`     | 6     | Signal building from DB, full persona generation          |
| `insight-generator.test.ts`     | 10    | All 6 insight types, cap at 5, edge cases                 |
| `recommendation-engine.test.ts` | 8     | 4 recommendation types, sorting, empty state              |

---

## Test Suite (497 Tests Total)

### Vitest — 476 Tests (31 files)

| Category                      | Tests  | Files |
| ----------------------------- | ------ | ----- |
| Phase 1 (utils, CRUD, import) | 92     | 7     |
| Phase 2 (OCR pipeline)        | 122    | 7     |
| Phase 3 (analytics, golden)   | 219    | 13    |
| **Phase 4 (persona)**         | **43** | **4** |

### Playwright — 21 Tests (2 files)

| File                     | Tests | What It Covers                                          |
| ------------------------ | ----- | ------------------------------------------------------- |
| `console-health.spec.ts` | 13    | Zero console errors on all routes (includes `/persona`) |
| `upload-flow.spec.ts`    | 8     | Upload UI flow                                          |

---

## Verification Steps Performed

1. **476 Vitest tests passing** — `npx vitest run` (31 files)
2. **0 lint errors** — `npx eslint src/` (warnings only: `_error` catch vars)
3. **Prettier formatted** — `npm run format:check` passes
4. **All 43 persona tests passing** — archetypes, generator, insights, recommendations
5. **No regressions** — 425 pre-existing tests still pass

---

## Data Ingestion

Full Excel import completed: **392 expenses across 30 months** (Jan 2024 → Jun 2026).

- **Source file:** `/Users/rmoin/Downloads/Personal/Spending Tracker.xlsx`
- **Script:** `scripts/ingest-excel.ts` (`npx tsx --tsconfig tsconfig.json scripts/ingest-excel.ts`)
- **Sheet:** "Monthly Input", columns D–G (Year, Month, Category, Amount), data from row 4
- **User:** Rehber (`d0c0a1e0-ad5e-42cb-ae70-6242d8024ba8`)
- **22 categories** auto-mapped (all pre-existed from OCR)
- **Feb 2026 deduped:** 17 OCR entries removed (identical to Excel import entries)
- **Note:** `monthly_income` table is empty — savings/persona calculations will use `defaultMonthlyIncome` from the user record. Set this for accurate savings rates.

---

## Phase 4.5: What Came Next

> **See:** `/Users/rmoin/Downloads/Personal/kharcha/PHASE-4.5-HANDOFF.md`

Phase 4.5 added Income Management (CRUD + paystub PDF parsing), month navigation arrows, pagination, and 25 new tests. Total is now **501 Vitest + 21 Playwright = 522 tests**.

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
# 1. Install deps
npm install

# 2. Push DB schema
npx drizzle-kit push

# 3. Run all unit/integration tests
npm test
# Expected: 31 files, 476 tests, all passing

# 4. Start dev server
npm run dev

# 5. Run E2E tests (in another terminal)
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run test:e2e
# Expected: 21 tests, all passing

# 6. Format check
npm run format:check
# Expected: "All matched files use Prettier code style!"

# 7. Lint check
npx eslint src/
# Expected: 0 errors

# 8. Open browser and visit /persona
open http://localhost:3000/persona
```
