# Kharcha — Phase 1 Handoff Document

> **Status:** Phase 1 COMPLETE — 92 Vitest + 13 Playwright = **105 tests, all green**
> **Date:** July 1, 2026

---

## What Is Kharcha?

Personal expense tracker replacing the Buddy iOS app + manual Excel workflow. Screenshots from Buddy get OCR'd into structured expense data with dashboards, personas, and insights.

**Master plan:** `/Users/rmoin/Downloads/Personal/context-root/05-finalized-project-plan.md`
**OCR design:** `/Users/rmoin/Downloads/Personal/context-root/06-ocr-resilience-design.md`

---

## Tech Stack (Installed & Configured)

| Layer      | Tech                                      | Version                         |
| ---------- | ----------------------------------------- | ------------------------------- |
| Framework  | Next.js (App Router)                      | 16.2.9                          |
| Language   | TypeScript                                | 5.x                             |
| Styling    | TailwindCSS                               | 4.x                             |
| Components | shadcn/ui (v4 — Base UI)                  | 4.12.0                          |
| ORM        | Drizzle ORM                               | 0.45.2                          |
| Database   | SQLite (better-sqlite3)                   | 12.11.1                         |
| Auth       | NextAuth.js v5 (beta.31)                  | Google OAuth + Credentials      |
| Animations | Framer Motion (motion)                    | 12.42.2                         |
| Theme      | next-themes                               | 0.4.6                           |
| Icons      | Lucide React                              | 1.22.0                          |
| Charts     | Recharts                                  | 3.9.1 (installed, not yet used) |
| Excel      | exceljs                                   | 4.4.0                           |
| Validation | Zod v4                                    | 4.4.3                           |
| Testing    | Vitest 4.1.9 + Playwright 1.61.1          |
| Fonts      | Space Grotesk + Space Mono (Google Fonts) |

---

## Critical Gotchas for Next Chat

### 1. shadcn/ui v4 uses `render` prop, NOT `asChild`

```tsx
// WRONG — will error
<SheetTrigger asChild><Button /></SheetTrigger>

// CORRECT — v4 uses Base UI's render prop
<SheetTrigger render={<Button variant="ghost" size="icon" />}>
  <Menu className="h-5 w-5" />
</SheetTrigger>
```

### 2. Next.js 16 — `params` and `searchParams` are Promises

```tsx
// Must await in page/layout/route components
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
}
```

Docs: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/`

### 3. Zod v4 — import from `"zod/v4"` not `"zod"`

```tsx
import { z } from "zod/v4";
```

### 4. NPM registry override

Corporate proxy requires `.npmrc` with `registry=https://registry.npmjs.org/`. Already configured.

### 5. Playwright browser install needs TLS bypass

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npx playwright install chromium
```

---

## Database Schema (13 Tables)

All defined in `src/lib/db/schema.ts` using Drizzle ORM:

| Table                 | Purpose                                                          |
| --------------------- | ---------------------------------------------------------------- |
| `users`               | User accounts (email, password hash, preferences)                |
| `accounts`            | NextAuth OAuth accounts                                          |
| `sessions`            | NextAuth sessions                                                |
| `verification_tokens` | NextAuth email verification                                      |
| `categories`          | Per-user expense categories (22 defaults seeded on registration) |
| `category_aliases`    | OCR alias mapping (e.g., "Service" → "Services")                 |
| `expenses`            | Core data — monthly aggregates per category                      |
| `monthly_income`      | Manual income entries per month                                  |
| `budgets`             | Per-category monthly budget limits with effective date ranges    |
| `uploads`             | Screenshot upload records with OCR status                        |
| `personas`            | Monthly persona snapshots                                        |
| `forex_rates`         | Cached currency conversion rates (24h TTL)                       |
| `email_log`           | Email send history                                               |
| `ocr_corrections`     | User corrections to OCR output (adaptive learning)               |

**DB file:** `./data/kharcha.db` (gitignored)
**Migrations:** `drizzle-kit push` (schema push mode)

---

## What Was Built (Phase 1 Checklist)

### Infrastructure

- [x] Next.js 16 + TypeScript + TailwindCSS 4 + shadcn/ui v4
- [x] Docker + docker-compose (Dockerfile, docker-compose.yml)
- [x] Vitest config with path aliases + jsdom environment
- [x] Playwright config (Chromium, reuses dev server)
- [x] Drizzle ORM + SQLite with WAL mode + foreign keys
- [x] DB schema — all 13 tables
- [x] Test utilities (`src/lib/db/test-utils.ts`) — in-memory SQLite for tests

### Authentication

- [x] NextAuth.js v5 — Google OAuth + Credentials provider
- [x] Registration API (`/api/auth/register`) — password hashing + seeds 22 default categories
- [x] Login page + Register page (neo-brutalist styled)
- [x] Protected route group `(app)` — redirects to login if unauthenticated

### Services (Business Logic)

- [x] **Expense service** (`src/lib/services/expense-service.ts`) — CRUD + list by user
- [x] **Category service** (`src/lib/services/category-service.ts`) — CRUD with unique name constraint
- [x] **Budget service** (`src/lib/services/budget-service.ts`) — CRUD + active budget query with date range logic

### API Routes

- [x] `GET/POST /api/expenses` — list + create
- [x] `GET/PUT/DELETE /api/expenses/[id]` — single expense CRUD
- [x] `GET/POST /api/categories` — list + create
- [x] `GET/POST /api/budgets` — list + create

### Utilities

- [x] **Currency** (`src/lib/utils/currency.ts`) — INR formatting (₹2,00,077.00), parsing, validation
- [x] **Dates** (`src/lib/utils/dates.ts`) — month name ↔ number, range helpers
- [x] **Validators** (`src/lib/utils/validators.ts`) — Zod schemas for all entities
- [x] **Constants** (`src/lib/constants.ts`) — 22 default categories, currencies, OCR thresholds

### Excel Import

- [x] **Parser** (`src/lib/import/excel.ts`) — reads "Monthly Input" sheet (cols D-G, rows 3+)
- [x] **Importer** — maps category names → IDs, inserts as `source="import"` expenses
- [x] **Validation** — month name parsing, amount validation, error collection per row

### UI Design System (Neo-Brutalist)

- [x] **Theme:** System preference + toggle (dark/light) via `next-themes`
- [x] **Colors:** Warm Amber/Orange (#F59E0B) accent, #FFFBF5 light bg, #0A0A0A dark bg
- [x] **Typography:** Space Grotesk (sans) + Space Mono (mono)
- [x] **Cards:** 2px borders, 3-4px hard box-shadows, hover lift effect
- [x] **Buttons:** Neo-brutalist with hard shadows, press-down on active
- [x] **Logo:** ₹ symbol in amber box with hard shadow

### Layout & Navigation

- [x] **Desktop sidebar** (`src/components/layout/sidebar.tsx`) — 7 nav items, animated active indicator
- [x] **Mobile bottom nav** (`src/components/layout/bottom-nav.tsx`) — 5 tabs with spring animation
- [x] **Header** (`src/components/layout/header.tsx`) — theme toggle, user dropdown, mobile logo
- [x] **App layout** (`src/app/(app)/layout.tsx`) — sidebar + header + bottom nav + auth guard

### Pages (All Routes Scaffolded)

- [x] `/` — landing with auth redirect
- [x] `/auth/login` — animated login with Google OAuth + credentials
- [x] `/auth/register` — animated registration
- [x] `/dashboard` — bento grid with staggered animations
- [x] `/upload` — placeholder
- [x] `/expenses` — placeholder
- [x] `/analytics` — placeholder
- [x] `/persona` — placeholder
- [x] `/settings` — placeholder
- [x] `/settings/budgets` — placeholder

---

## Test Suite (105 Tests Total)

### Vitest — 92 Tests (6 files)

| File                                       | Tests | What It Covers                                              |
| ------------------------------------------ | ----- | ----------------------------------------------------------- |
| `tests/unit/utils/currency.test.ts`        | 29    | INR formatting, parsing, Indian comma placement, edge cases |
| `tests/unit/utils/date-helpers.test.ts`    | 17    | Month name mapping, range calculations, boundary months     |
| `tests/integration/api/expenses.test.ts`   | 16    | Expense CRUD via service layer, validation, auth scoping    |
| `tests/integration/api/categories.test.ts` | 12    | Category CRUD, unique name constraint, default seeding      |
| `tests/integration/excel-import.test.ts`   | 10    | Excel parsing, validation, error reporting, DB import       |
| `tests/integration/api/budgets.test.ts`    | 8     | Budget CRUD, active budget query, date range logic          |

**Run:** `npm test` or `npx vitest run`

### Playwright — 13 Tests (1 file)

| File                               | Tests | What It Covers                                      |
| ---------------------------------- | ----- | --------------------------------------------------- |
| `tests/e2e/console-health.spec.ts` | 10    | Zero `console.error` on every route (public + auth) |
|                                    | 3     | Zero hydration mismatch warnings on public pages    |

**Run:** `npm run test:e2e` or `npx playwright test`

### Test Infrastructure

- **In-memory SQLite** for unit/integration tests (no file I/O)
- `src/lib/db/test-utils.ts` — `createTestDb()`, `seedTestUser()`, `seedTestCategory()` helpers
- `tests/setup.ts` — global test setup
- Console health spec filters noise (React DevTools, HMR, favicon)

### Verification Steps Performed

1. All 92 Vitest tests passing
2. All 13 Playwright E2E tests passing
3. Dev server restarted with clean `.next` cache — no errors
4. All 10 routes hit via curl — correct HTTP status codes (200 or 307 redirect)
5. Zero server-side errors in terminal output
6. Zero client-side console errors in browser preview
7. Zero hydration mismatch warnings
8. `scroll-behavior: smooth` CSS warning fixed (removed from globals.css)
9. Stale font reference (`geistSans`) eliminated by cache clear

---

## Scripts

```bash
npm run dev          # Start dev server (localhost:3000)
npm test             # Run Vitest (92 tests)
npm run test:e2e     # Run Playwright (13 tests)
npm run test:watch   # Vitest watch mode
npm run db:push      # Push schema to SQLite
npm run db:studio    # Open Drizzle Studio
npm run lint         # ESLint
```

---

## File Tree (Key Files Only)

```
kharcha/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout (fonts, theme provider)
│   │   ├── globals.css                   # Neo-brutalist theme tokens
│   │   ├── page.tsx                      # Landing (auth redirect)
│   │   ├── auth/
│   │   │   ├── login/page.tsx            # Login (animated, themed)
│   │   │   └── register/page.tsx         # Register (animated, themed)
│   │   ├── (app)/
│   │   │   ├── layout.tsx                # Auth-guarded layout
│   │   │   ├── dashboard/page.tsx        # Bento grid dashboard
│   │   │   ├── upload/page.tsx           # Placeholder
│   │   │   ├── expenses/page.tsx         # Placeholder
│   │   │   ├── analytics/page.tsx        # Placeholder
│   │   │   ├── persona/page.tsx          # Placeholder
│   │   │   └── settings/
│   │   │       ├── page.tsx              # Placeholder
│   │   │       └── budgets/page.tsx      # Placeholder
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── [...nextauth]/route.ts
│   │       │   └── register/route.ts
│   │       ├── expenses/
│   │       │   ├── route.ts              # GET/POST
│   │       │   └── [id]/route.ts         # GET/PUT/DELETE
│   │       ├── categories/route.ts       # GET/POST
│   │       └── budgets/route.ts          # GET/POST
│   ├── components/
│   │   ├── layout/
│   │   │   ├── sidebar.tsx               # Desktop nav (neo-brutalist)
│   │   │   ├── header.tsx                # Top bar + theme toggle
│   │   │   └── bottom-nav.tsx            # Mobile tab bar
│   │   ├── providers/
│   │   │   └── theme-provider.tsx        # next-themes wrapper
│   │   └── ui/                           # shadcn/ui components (16 total)
│   └── lib/
│       ├── auth/config.ts                # NextAuth config
│       ├── constants.ts                  # Default categories, currencies
│       ├── db/
│       │   ├── index.ts                  # Drizzle client
│       │   ├── schema.ts                 # 13 tables
│       │   └── test-utils.ts             # In-memory test DB
│       ├── import/excel.ts               # Excel import parser + importer
│       ├── services/
│       │   ├── expense-service.ts        # Expense CRUD
│       │   ├── category-service.ts       # Category CRUD
│       │   └── budget-service.ts         # Budget CRUD
│       └── utils/
│           ├── currency.ts               # INR formatting
│           ├── dates.ts                  # Date helpers
│           └── validators.ts             # Zod schemas
├── tests/
│   ├── setup.ts
│   ├── unit/utils/
│   │   ├── currency.test.ts              # 29 tests
│   │   └── date-helpers.test.ts          # 17 tests
│   ├── integration/
│   │   ├── api/
│   │   │   ├── expenses.test.ts          # 16 tests
│   │   │   ├── categories.test.ts        # 12 tests
│   │   │   └── budgets.test.ts           # 8 tests
│   │   └── excel-import.test.ts          # 10 tests
│   └── e2e/
│       └── console-health.spec.ts        # 13 tests
├── .env.local                            # Secrets (gitignored)
├── .env.example                          # Template
├── Dockerfile
├── docker-compose.yml
├── drizzle.config.ts
├── vitest.config.ts
├── playwright.config.ts
└── package.json
```

---

## Phase 2: OCR Pipeline (Next)

Per the master plan (`05-finalized-project-plan.md`), Phase 2 covers:

| Step | Task                              | Test First                   |
| ---- | --------------------------------- | ---------------------------- |
| 2.1  | Image preprocessor (Sharp)        | `image-preprocessor.test.ts` |
| 2.2  | Tesseract.js integration          | `recognizer.test.ts`         |
| 2.3  | Text parser (regex extraction)    | `text-parser.test.ts`        |
| 2.4  | Amount normalizer (Indian format) | `amount-normalizer.test.ts`  |
| 2.5  | Category matcher (alias + fuzzy)  | `category-matcher.test.ts`   |
| 2.6  | Deduplication engine              | `deduplicator.test.ts`       |
| 2.7  | Full pipeline orchestrator        | `ocr-pipeline.test.ts`       |
| 2.8  | Upload API route                  | `api/upload.test.ts`         |
| 2.9  | Dropzone UI component             | —                            |
| 2.10 | Review table UI (edit, approve)   | —                            |
| 2.11 | Upload → review → commit E2E flow | `upload-flow.spec.ts`        |

**Key resources:**

- OCR resilience design: `/Users/rmoin/Downloads/Personal/context-root/06-ocr-resilience-design.md`
- 9 training screenshots: `/Users/rmoin/Downloads/Personal/context-root/IMG_28*.PNG`
- Amount normalizer already exists in `src/lib/utils/currency.ts` (parseINR function)
- Date helpers already exist in `src/lib/utils/dates.ts`

**OCR approach:** Tesseract.js (WASM, offline, free) with 4-strategy fallback chain:

1. Line regex extraction
2. Spatial analysis
3. Semantic search
4. Summary validation

---

## Environment Variables (.env.local)

```env
AUTH_SECRET=<random string>
AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<from Google Console>
GOOGLE_CLIENT_SECRET=<from Google Console>
```

---

## How to Verify Everything Works

```bash
# 1. Install deps
npm install

# 2. Push DB schema
npx drizzle-kit push

# 3. Run all unit/integration tests
npm test
# Expected: 6 files, 92 tests, all passing

# 4. Start dev server
npm run dev

# 5. Run E2E tests (in another terminal)
npm run test:e2e
# Expected: 13 tests, all passing

# 6. Open browser
open http://localhost:3000
```
