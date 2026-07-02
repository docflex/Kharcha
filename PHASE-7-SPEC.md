# Phase 7: Polish, Security & Deploy — Implementation Spec

> **Decisions finalized:** July 1, 2026
> **Scope:** UX overhaul, missing features, security hardening, Vercel deployment, Neon Postgres migration
> **Pre-requisite:** Phase 6 complete (593 Vitest + 23 Playwright = 616 tests, all green)

---

## Decision Log (Phase 7)

| #   | Decision               | Choice                                                               |
| --- | ---------------------- | -------------------------------------------------------------------- |
| 14  | Onboarding             | Both: First-Run Wizard + driver.js Feature Tour                      |
| 15  | Page transitions       | Matched/shared element transitions (Framer Motion `layoutId`)        |
| 16  | Missing features scope | Everything — all unbuilt spec'd features                             |
| 17  | Database for Vercel    | Neon Postgres (free tier: 512MB)                                     |
| 18  | Data fetching          | @tanstack/react-query (replace manual fetch+useState)                |
| 19  | Security level         | Full hardening (rate limiting, audit log, CSP, session invalidation) |

---

## New Dependencies

| Package                             | Purpose                                                                           | Size                      |
| ----------------------------------- | --------------------------------------------------------------------------------- | ------------------------- |
| `driver.js`                         | Guided feature tour overlay                                                       | ~15KB                     |
| `@tanstack/react-query`             | Data fetching, caching, mutations                                                 | ~15KB gzipped             |
| `@neondatabase/serverless`          | Neon Postgres driver (serverless-compatible)                                      | ~20KB                     |
| `drizzle-orm/neon-http`             | Drizzle adapter for Neon                                                          | (included in drizzle-orm) |
| ~~`@vercel/blob`~~                  | ~~File storage for uploads on Vercel~~ (not needed — uploads processed in-memory) | —                         |
| `nprogress` or `next-nprogress-bar` | Route-level loading indicator                                                     | ~2KB                      |

### Dependencies to Remove (post-migration)

- `better-sqlite3` + `@types/better-sqlite3` (replaced by Neon)
- `node-cron` + `@types/node-cron` (replaced by Vercel Cron)

---

## Sub-Phase Breakdown

### 7.1 — Database Migration (Neon Postgres)

**Goal:** Swap SQLite → Neon Postgres. All 593+ tests must pass after migration.

| Step   | Task                                                                                                                                                                | Test Impact           |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 7.1.1  | Create Neon account + project + database                                                                                                                            | None (infra)          |
| 7.1.2  | Install `@neondatabase/serverless`, `drizzle-orm/neon-http`                                                                                                         | None                  |
| 7.1.3  | Rewrite `src/lib/db/index.ts` — dual adapter: Neon for prod, `pg` or Neon for dev                                                                                   | Connection tests      |
| 7.1.4  | Migrate schema from SQLite types to Postgres types: `integer` → `integer`, `text` as JSON → `jsonb`, `real` → `numeric`/`doublePrecision`, `DATETIME` → `timestamp` | Schema tests          |
| 7.1.5  | Update `drizzle.config.ts` for Postgres                                                                                                                             | None                  |
| 7.1.6  | Rewrite `src/lib/db/test-utils.ts` — use Neon branching or `pg-mem` for in-memory test DB                                                                           | All integration tests |
| 7.1.7  | Run `drizzle-kit push` to create schema in Neon                                                                                                                     | None                  |
| 7.1.8  | Migrate seed data (392 expenses, 31 income, 22 categories)                                                                                                          | Data verification     |
| 7.1.9  | Update `scripts/ingest-excel.ts` and `scripts/ingest-paystubs.cjs` for Postgres                                                                                     | Script tests          |
| 7.1.10 | Run full test suite — all 593+ Vitest + 23 Playwright must pass                                                                                                     | All                   |
| 7.1.11 | Update Docker setup to not require SQLite native deps                                                                                                               | Docker build          |
| 7.1.12 | Update `.env.example` with `DATABASE_URL=postgres://...`                                                                                                            | Docs                  |

**Key gotcha:** Postgres uses `$1, $2` parameterized queries vs SQLite's `?`. Drizzle abstracts this — but raw SQL (if any) needs updating.

**Key gotcha:** `better-sqlite3` is synchronous, Neon is async. All DB calls should already be async (via Drizzle), but verify no sync patterns exist.

---

### 7.2 — React Query Migration

**Goal:** Replace manual `fetch` + `useState` + `useEffect` + `AbortController` with React Query.

| Step   | Task                                                                                                                                                                        |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7.2.1  | Install `@tanstack/react-query`                                                                                                                                             |
| 7.2.2  | Create `src/providers/query-provider.tsx` — `QueryClientProvider` wrapping app                                                                                              |
| 7.2.3  | Create `src/lib/api-client.ts` — typed fetch wrapper with error handling, auth                                                                                              |
| 7.2.4  | Create hooks: `src/hooks/use-analytics.ts`, `use-expenses.ts`, `use-categories.ts`, `use-budgets.ts`, `use-income.ts`, `use-persona.ts`, `use-uploads.ts`, `use-profile.ts` |
| 7.2.5  | Migrate Dashboard page — replace 3 `useEffect`s with `useQuery`                                                                                                             |
| 7.2.6  | Migrate Expenses page — `useQuery` for list, `useMutation` for CRUD                                                                                                         |
| 7.2.7  | Migrate Analytics page                                                                                                                                                      |
| 7.2.8  | Migrate Persona page                                                                                                                                                        |
| 7.2.9  | Migrate Upload page                                                                                                                                                         |
| 7.2.10 | Migrate all Settings pages (categories, budgets, income, email, profile)                                                                                                    |
| 7.2.11 | Add optimistic updates for expense create/edit/delete                                                                                                                       |
| 7.2.12 | Add global error toast via `onError` callback on QueryClient                                                                                                                |

**Pattern to follow:**

```typescript
// Before (current):
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/analytics?year=${year}&month=${month}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((res) => setData(res.data))
        .finally(() => setLoading(false));
    return () => controller.abort();
}, [year, month]);

// After:
const { data, isLoading } = useQuery({
    queryKey: ["analytics", year, month],
    queryFn: () => apiClient.get(`/api/analytics?year=${year}&month=${month}`),
});
```

---

### 7.3 — Onboarding & Feature Tour

**Goal:** New users get a setup wizard and guided tour.

#### 7.3.1 — First-Run Wizard (`/onboarding`)

**Trigger:** After registration or first login, if user has 0 expenses AND 0 income entries → redirect to `/onboarding`.

**Steps:**

1. **Welcome** — "Welcome to Kharcha! Let's set things up." + user's name
2. **Set Income** — "What's your monthly take-home?" + amount input (pre-filled if paystub uploaded)
3. **Import Data** (optional) — "Have historical data?" → Excel upload zone OR skip
4. **Set Budgets** (optional) — Show top 5 categories, let user set limits. Can skip.
5. **Done** — Confetti animation 🎉 → "Your dashboard is ready" → CTA to Dashboard

**Files to create:**

- `src/app/(app)/onboarding/page.tsx` — multi-step wizard
- `src/components/onboarding/welcome-step.tsx`
- `src/components/onboarding/income-step.tsx`
- `src/components/onboarding/import-step.tsx`
- `src/components/onboarding/budget-step.tsx`
- `src/components/onboarding/complete-step.tsx`

**Tests:**

- `tests/e2e/onboarding.spec.ts` — full wizard flow

#### 7.3.2 — Feature Tour (driver.js)

**Trigger:** After onboarding wizard completes (or for existing users: a "Take a Tour" button in settings).

**Tour stops (desktop):**

1. Sidebar — "Navigate between sections"
2. Dashboard bento grid — "Your spending at a glance"
3. Month selector — "Switch between months"
4. Upload CTA — "Upload Buddy screenshots for automatic expense extraction"
5. Sparkline cards — "See 6-month trends inline"
6. Currency selector — "View amounts in any currency"
7. Theme toggle — "Switch between dark and light mode"

**Tour stops (mobile):**

1. Bottom nav — "Tap to navigate"
2. Dashboard cards — "Your spending overview"
3. Upload tab — "Upload screenshots here"

**Files to create:**

- `src/lib/tour/config.ts` — driver.js step definitions
- `src/lib/tour/index.ts` — `startTour()`, `hasCompletedTour()` (localStorage flag)
- `src/components/onboarding/feature-tour.tsx` — wrapper component

**Tests:**

- `tests/e2e/feature-tour.spec.ts` — tour starts, steps render, tour completes

---

### 7.4 — UI/UX Polish

**Goal:** Matched transitions, empty states, loading skeletons, toast consistency, keyboard shortcuts.

#### 7.4.1 — Matched Page Transitions

**Implementation:**

- Add `AnimatePresence` to app layout (`src/app/(app)/layout.tsx`)
- Each page root gets a `motion.div` with `layoutId` based on the page key
- Bento cards on dashboard get `layoutId`s matching their destination page
- When navigating Dashboard → Analytics, the analytics card morphs into the full page
- Use Framer Motion's `layout` prop for smooth geometry transitions

**Files to modify:**

- `src/app/(app)/layout.tsx` — add `AnimatePresence` + page transition wrapper
- All page components — wrap in `motion.div` with unique `layoutId`
- `src/components/layout/page-transition.tsx` — reusable transition wrapper

**Note:** Next.js App Router doesn't natively support `AnimatePresence` across routes well. May need a custom `LayoutTransition` component or `framer-motion`'s `useIsPresent`. Evaluate feasibility during implementation — fall back to directional slide+fade if matched transitions prove too complex with App Router.

#### 7.4.2 — Empty States

Every page needs a rich empty state with icon, message, and CTA:

| Page                | Empty Condition             | Message                                      | CTA                                   |
| ------------------- | --------------------------- | -------------------------------------------- | ------------------------------------- |
| `/dashboard`        | 0 expenses for month        | ✅ Already has "Getting Started"             | Enhance with illustration             |
| `/expenses`         | 0 expenses for filters      | "No expenses found"                          | "Add Expense" or "Upload Screenshots" |
| `/analytics`        | 0 expenses for month        | "Not enough data for analytics"              | "Upload expenses first"               |
| `/persona`          | No persona generated        | "Need expense data to generate your persona" | "Go to Dashboard"                     |
| `/settings/budgets` | 0 budgets                   | "No budgets set"                             | "Create your first budget"            |
| `/settings/income`  | 0 income entries            | "No income recorded"                         | "Add income" or "Upload paystub"      |
| `/upload`           | N/A (always shows dropzone) | —                                            | —                                     |

**Files to create:**

- `src/components/ui/empty-state.tsx` — reusable: icon + title + description + CTA button

#### 7.4.3 — Loading Skeletons

Replace all `"..."` text loading states with proper skeleton cards:

| Page      | Current Loading      | Target                                        |
| --------- | -------------------- | --------------------------------------------- |
| Dashboard | `"..."` in each card | Skeleton cards matching exact card dimensions |
| Analytics | Loading text         | Chart placeholder skeletons                   |
| Expenses  | Loading text         | Table row skeletons                           |
| Persona   | Loading text         | Persona card skeleton                         |

`LoadingSkeleton` and `TableLoadingSkeleton` exist (`src/components/layout/loading-skeleton.tsx`). Extend and use them in every page.

#### 7.4.4 — Toast Notifications (Sonner)

Audit all CRUD operations and ensure consistent feedback:

| Action           | Current Feedback | Target                               |
| ---------------- | ---------------- | ------------------------------------ |
| Create expense   | Unknown          | Success toast: "Expense added"       |
| Edit expense     | Unknown          | Success toast: "Expense updated"     |
| Delete expense   | Unknown          | Success toast: "Expense deleted"     |
| Create budget    | Unknown          | Success toast                        |
| OCR commit       | Banner           | Toast: "N expenses committed"        |
| Export download  | Unknown          | Toast: "Download started"            |
| Email sent       | Unknown          | Toast: "Test email sent"             |
| Profile updated  | Inline message   | Toast: "Profile updated"             |
| Password changed | Inline message   | Toast + session invalidation         |
| Error (any)      | Mixed            | Destructive toast with error message |

**File to create/modify:**

- `src/components/providers/toast-provider.tsx` — Sonner `<Toaster>` with neo-brutalist styling

#### 7.4.5 — Keyboard Shortcuts

| Shortcut       | Action                                                     |
| -------------- | ---------------------------------------------------------- |
| `Ctrl/Cmd + K` | Open command palette / quick search (future, skip for now) |
| `Escape`       | Close any open dialog/modal                                |
| `N`            | New expense (when on expenses page)                        |
| `←` / `→`      | Previous/next month (when on dashboard/analytics/expenses) |

**Implementation:** Event listener in layout, page-specific shortcuts via context.

#### 7.4.6 — Landing Page

Simple single-page at `/` for unauthenticated users:

- Hero: App name, tagline "See where your money flows", ₹ logo animation
- Feature highlights (3-4 cards): OCR, Analytics, Persona, Free
- CTA: "Get Started" → `/auth/register`
- Footer: "Built with ☕ and Next.js"

**File to modify:**

- `src/app/page.tsx` — replace redirect with actual landing page

---

### 7.5 — Missing Spec'd Features

**Goal:** Build all features from the original plan that were never implemented.

#### 7.5.1 — Investment Toggle

**Spec:** "Include investments" switch on Dashboard that excludes `is_investment` categories from totals.

**Implementation:**

- Add toggle to dashboard header (next to month selector)
- Filter state stored in React Query param or URL search param
- Analytics API already has category `type` field — filter on it
- Persist preference in localStorage or user profile

#### 7.5.2 — Category Heatmap

**Spec:** 12-month grid, color intensity = spend level per category.

**Implementation:**

- New component: `src/components/analytics/category-heatmap.tsx`
- Recharts or custom SVG grid — 12 columns (months) × N rows (categories)
- Color scale: white/light → amber → red (over budget)
- Add to `/analytics` page

#### 7.5.3 — YoY Comparison

**Spec:** Same month across years — side-by-side bar chart.

**Implementation:**

- New analytics engine function: `src/lib/analytics/yoy.ts`
- API: `GET /api/analytics/yoy?month=6` — returns data for that month across all years
- UI: Grouped bar chart on `/analytics` page
- Tests: `tests/unit/analytics/yoy-calculator.test.ts`

#### 7.5.4 — Category Deep-Dive (`/analytics/category/[id]`)

**Spec:** Historical trend for one category, budget adherence timeline, avg/min/max/stddev, anomaly highlighting.

**Implementation:**

- New page: `src/app/(app)/analytics/category/[id]/page.tsx`
- API: `GET /api/analytics/category/[id]` — full history for one category
- Charts: line chart (trend), bar chart (budget adherence), stat cards
- Click on category name anywhere → navigates here

#### 7.5.5 — Forgot Password Flow

**Implementation:**

- Page: `src/app/auth/forgot-password/page.tsx` — email input
- Page: `src/app/auth/reset-password/page.tsx` — new password form
- API: `POST /api/auth/forgot-password` — generate token, send email
- API: `POST /api/auth/reset-password` — validate token, update password
- DB: Add `password_reset_tokens` table (token, userId, expiresAt)
- Email template: password reset email with time-limited link

#### 7.5.6 — Danger Zone (Delete Account/Data)

**Implementation:**

- Add "Danger Zone" section at bottom of `/settings/profile`
- "Delete All Data" — deletes expenses, budgets, income, uploads, personas (keeps account)
- "Delete Account" — deletes everything including user account, signs out
- Both require typing "DELETE" to confirm
- API: `DELETE /api/user/data` and `DELETE /api/user/account`

#### 7.5.7 — Bulk Actions on Expenses

**Implementation:**

- Checkbox column in expense table
- "Select All" in header
- Floating action bar when items selected: "Delete Selected", "Re-categorize"
- API: `POST /api/expenses/bulk-delete` — accepts array of IDs

#### 7.5.8 — Category Customization (Icons + Colors)

**Implementation:**

- On `/settings` (category management), add icon picker and color picker per category
- Icon picker: grid of Lucide icons (most common ~30)
- Color picker: preset palette of 12 colors
- Save via existing `PATCH /api/categories/[id]`
- Display icons/colors throughout app (dashboard, analytics, expenses)

---

### 7.6 — Security Hardening

**Goal:** Full hardening per security audit findings.

#### 7.6.1 — Rate Limiting

**Implementation:**

- Create `src/lib/middleware/rate-limit.ts` — in-memory sliding window counter
- Login endpoint: 5 attempts / 15 minutes per IP
- All other API endpoints: 100 requests / minute per user
- Return `429 Too Many Requests` with `Retry-After` header
- Apply via Next.js middleware (`src/middleware.ts`)

**Tests:**

- `tests/integration/api/rate-limiting.test.ts`

#### 7.6.2 — Security Headers

**Implementation:** Add to `next.config.ts`:

```typescript
headers: async () => [{
    source: '/(.*)',
    headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.neon.tech https://api.frankfurter.app" },
    ],
}],
```

#### 7.6.3 — Password Policy Enhancement

**Implementation:**

- Update `changePasswordSchema` and registration: min 8 chars, must contain: uppercase, lowercase, digit, special char
- Add password strength indicator component on register + change password forms
- Add `src/lib/utils/password-strength.ts` — scoring function

#### 7.6.4 — Session Invalidation on Password Change

**Implementation:**

- When password changes, rotate `AUTH_SECRET` for that user (or use per-user JWT invalidation)
- Simpler: add `passwordChangedAt` timestamp to users table, check JWT `iat` against it in auth callback

#### 7.6.5 — Audit Logging

**Implementation:**

- New table: `audit_log (id, userId, action, details, ipAddress, createdAt)`
- Log: password change, profile update, data export, data delete, account delete, failed login
- API: `GET /api/admin/audit-log` (self-user only)
- UI: Section on profile page showing recent security events

#### 7.6.6 — File Upload Validation

**Implementation:**

- Validate magic bytes: PNG (`89504E47`), JPEG (`FFD8FF`), PDF (`25504446`)
- Reject files that don't match their claimed content-type
- Sanitize filenames: `filename.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 100)`
- Store with UUID filenames, keep original name in DB only

#### 7.6.7 — Sign-Out via POST

**Implementation:**

- Change `window.location.href = "/api/auth/signout"` to `signOut()` from `next-auth/react` (which uses POST internally)

#### 7.6.8 — OAuth User Password Guard

**Implementation:**

- In profile page: check if user has `passwordHash`. If null (OAuth-only), hide password change form and show "Signed in via Google" badge.
- In API: `POST /api/user/password` returns 400 if user has no existing password

---

### 7.7 — Vercel Deployment

**Goal:** Deploy to Vercel free tier with all services configured.

| Step      | Task                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------ |
| 7.7.1     | Create `vercel.json` with cron configuration for email reminders                                 |
| ~~7.7.2~~ | ~~Configure Vercel Blob~~ — **Not needed**: uploads processed in-memory, only OCR data persisted |
| ~~7.7.3~~ | ~~Update upload service for Vercel Blob~~ — **Removed**: no file storage needed                  |
| 7.7.4     | Replace `node-cron` with Vercel Cron → hits `POST /api/email` on schedule                        |
| 7.7.5     | Configure serverless function settings (max duration for OCR: 60s)                               |
| 7.7.6     | Set all env vars in Vercel dashboard                                                             |
| 7.7.7     | Deploy and verify all features work                                                              |
| 7.7.8     | Configure custom domain (optional)                                                               |
| 7.7.9     | Enable Vercel Analytics (free)                                                                   |

**`vercel.json`:**

```json
{
    "crons": [
        {
            "path": "/api/cron/email-reminder",
            "schedule": "30 3 1 * *"
        }
    ]
}
```

**New API route:** `src/app/api/cron/email-reminder/route.ts`

- Vercel Cron sends GET request
- Verify `CRON_SECRET` header for security
- Loop through users, send reminders

---

### 7.8 — Testing & Documentation

**Goal:** Cover all new features with tests, create deployment guide.

#### Tests to Write

| File                                              | Count (est.) | Coverage                             |
| ------------------------------------------------- | ------------ | ------------------------------------ |
| `tests/e2e/onboarding.spec.ts`                    | 8            | Wizard flow                          |
| `tests/e2e/feature-tour.spec.ts`                  | 5            | Tour start/complete                  |
| `tests/e2e/empty-states.spec.ts`                  | 8            | All pages empty state rendering      |
| `tests/e2e/error-states.spec.ts`                  | 6            | API failures, network errors         |
| `tests/e2e/landing.spec.ts`                       | 3            | Landing page renders, CTAs work      |
| `tests/unit/analytics/yoy-calculator.test.ts`     | 8            | YoY calculations                     |
| `tests/unit/utils/password-strength.test.ts`      | 10           | Password scoring                     |
| `tests/integration/api/category-deepdive.test.ts` | 8            | Category analytics endpoint          |
| `tests/integration/api/forgot-password.test.ts`   | 6            | Token generation, validation, expiry |
| `tests/integration/api/bulk-operations.test.ts`   | 6            | Bulk delete, re-categorize           |
| `tests/integration/api/rate-limiting.test.ts`     | 5            | Rate limit enforcement               |
| `tests/integration/api/audit-log.test.ts`         | 6            | Audit logging                        |
| `tests/integration/api/cascade-delete.test.ts`    | 4            | User/data deletion                   |
| `tests/integration/api/error-handling.test.ts`    | 10           | Malformed inputs, edge cases         |
| **Total estimated**                               | **~93**      |                                      |

**Expected final test count:** 616 (current) + ~93 = **~709 tests**

#### Documentation

| File                  | Purpose                                                   |
| --------------------- | --------------------------------------------------------- |
| `DEPLOYMENT-GUIDE.md` | Step-by-step 3rd party service setup wiki                 |
| `SECURITY-AUDIT.md`   | Security findings, fixes implemented, remaining risks     |
| `PHASE-7-HANDOFF.md`  | Phase 7 completion handoff (created after implementation) |

---

## Implementation Order (Recommended)

Sub-agents should execute in this order due to dependencies:

```
7.1  Database Migration (Neon Postgres)     ← FIRST: everything depends on this
  ↓
7.2  React Query Migration                  ← Simplifies all subsequent UI work
  ↓
7.6  Security Hardening                     ← Before new features, lock down existing
  ↓
7.3  Onboarding & Feature Tour              ← Core UX gap
  ↓
7.4  UI/UX Polish                           ← Transitions, skeletons, toasts
  ↓
7.5  Missing Spec'd Features                ← New features (largest sub-phase)
  ↓
7.7  Vercel Deployment                      ← Deploy everything
  ↓
7.8  Testing & Documentation               ← Final sweep (tests written alongside each sub-phase)
```

**Note:** 7.8 (testing) should happen continuously — each sub-phase writes its own tests. The final step is an audit sweep.

---

## Acceptance Criteria

Phase 7 is complete when:

1. **All 700+ tests pass** (Vitest + Playwright)
2. **0 lint errors**, Prettier formatted
3. **App deployed on Vercel** and accessible via URL
4. **New user flow works end-to-end:** Register → Onboarding Wizard → Feature Tour → Dashboard with data
5. **Security headers present** in production response
6. **Rate limiting active** on login and API endpoints
7. **Forgot password flow** sends email and resets password
8. **Investment toggle** filters dashboard correctly
9. **Category deep-dive** page renders with historical data
10. **YoY and heatmap** charts render on analytics page
11. **DEPLOYMENT-GUIDE.md** enables someone to deploy from scratch
12. **SECURITY-AUDIT.md** documents all findings and remediation

---

## Risk Register

| Risk                                                | Impact | Mitigation                                                 |
| --------------------------------------------------- | ------ | ---------------------------------------------------------- |
| Neon Postgres migration breaks existing tests       | HIGH   | Migrate incrementally, test after each schema change       |
| Matched page transitions don't work with App Router | MEDIUM | Fall back to directional fade+slide                        |
| Tesseract.js exceeds Vercel function timeout        | MEDIUM | Increase max duration to 60s, optimize image preprocessing |
| Vercel free tier limits hit (bandwidth, functions)  | LOW    | Personal use only (2 users), well within limits            |
| React Query migration introduces regressions        | MEDIUM | Migrate one page at a time, compare behavior               |

---

## Appendix A: Page-Level UI/UX Audit

> Based on visual audit of all 7 application pages. Each recommendation is tagged with
> the sub-phase it belongs to for implementation tracking.

---

### A1. Expenses Page (`/expenses`)

**What's working:** Clean table, source badges, total row, export buttons, filters.

| #   | Issue                                                               | Severity  | Recommendation                                                                   | Sub-Phase |
| --- | ------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------- | --------- |
| E1  | Action buttons (edit/delete) are ~20px — too small for touch        | 🔴 High   | Increase to 32×32px min. On mobile, use swipe-to-delete.                         | 7.4       |
| E2  | No bulk selection / bulk actions                                    | 🔴 High   | Add checkbox column, floating action bar for "Delete Selected" / "Re-categorize" | 7.5.7     |
| E3  | No category color indicators in table                               | 🟡 Medium | Show colored dot (from category settings) next to category name                  | 7.5.8     |
| E4  | No visual weight differentiation on amounts                         | 🟡 Medium | Scale font size or color intensity by relative magnitude                         | 7.4       |
| E5  | Filter dropdowns show "all / all" with no label                     | 🟡 Medium | Label as "Category: All" and "Source: All". Add a text search input.             | 7.4       |
| E6  | "Notes" column shows "Imported from Excel" on every row — low value | 🟡 Medium | Make Notes collapsible or hide when all identical. On mobile, hide entirely.     | 7.4       |
| E7  | No inline editing — must open dialog for every change               | 🟡 Medium | Allow double-click on amount or category for inline edit                         | 7.4       |
| E8  | No sort indicators on column headers                                | 🟡 Medium | Make columns sortable (click to sort). Show ▲/▼ arrows.                          | 7.4       |
| E9  | No row hover highlight                                              | 🟢 Low    | Add `hover:bg-muted/30` on table rows                                            | 7.4       |

**Mobile transformation:** Table → stacked card layout. Each expense as a card: category + color dot, amount (large), date + source badge, swipe-left for delete. Tap card to edit.

---

### A2. Analytics Page (`/analytics`)

**What's working:** Donut chart, horizontal bar chart, MoM comparison, tooltip on hover.

| #   | Issue                                                                    | Severity  | Recommendation                                                                                            | Sub-Phase |
| --- | ------------------------------------------------------------------------ | --------- | --------------------------------------------------------------------------------------------------------- | --------- |
| A1  | Category names truncated ("Investment...", "Electricit...") in bar chart | 🔴 High   | Allow text wrapping, use abbreviations with full name on hover, or switch to horizontal label positioning | 7.4       |
| A2  | Charts are non-interactive — no drill-down on click                      | 🔴 High   | Click category in donut/bar → navigate to `/analytics/category/[id]`                                      | 7.5.4     |
| A3  | Donut legend is tiny and detached                                        | 🟡 Medium | Integrate labels into donut slices or use a side-legend with larger swatches                              | 7.4       |
| A4  | MoM chart doesn't color-code direction                                   | 🟡 Medium | Green bars when spending down vs previous, red when up. Currently both amber/grey.                        | 7.4       |
| A5  | No insight callouts between charts                                       | 🟡 Medium | Add auto-generated text: "Investments dominate at 57%", "Rent up 41% MoM"                                 | 7.4       |
| A6  | Color palette hard to distinguish in dark mode                           | 🟡 Medium | Use the category colors from Settings. Ensure contrast separation.                                        | 7.5.8     |
| A7  | "6-Month Category Trends" below fold                                     | 🟡 Medium | Consider tabbed layout: [Breakdown \| MoM \| Trends \| Heatmap]                                           | 7.4       |
| A8  | No time-range selector beyond single month                               | 🟡 Medium | Add: "This Month", "Last 3 Months", "YTD", "Custom Range"                                                 | 7.4       |
| A9  | No chart animation on month change                                       | 🟢 Low    | Enable Recharts `isAnimationActive` with smooth transitions                                               | 7.4       |
| A10 | No loading skeletons for charts                                          | 🟢 Low    | Placeholder chart outlines while data loads                                                               | 7.4.3     |
| A11 | Missing: YoY comparison chart                                            | 🟡 Medium | Add grouped bar chart comparing same month across years                                                   | 7.5.3     |
| A12 | Missing: Category heatmap (12-month grid)                                | 🟡 Medium | Color-intensity grid: months × categories                                                                 | 7.5.2     |

**Mobile transformation:** Single-column layout. Charts as swipeable tabs (Breakdown → MoM → Trends → Heatmap). Legend as horizontal scrollable pills below each chart. Full-width donut.

---

### A3. Persona Page (`/persona`)

**What's working:** Strong persona identity (name + emoji + description), 4 metric tiles, insight sentiment borders, timeline with pagination.

| #   | Issue                                                                 | Severity    | Recommendation                                                                                                                                                                   | Sub-Phase |
| --- | --------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| P1  | "No recommendations for this month" when persona is "The Red Flagger" | 🔴 Critical | **Bug:** Red Flagger = spending > income, but 0 budgets means recommendation engine has nothing to suggest. Fix: add income-based fallback recommendations even without budgets. | 7.4 (bug) |
| P2  | Metric tiles all look identical — no visual emphasis                  | 🟡 Medium   | Color-code backgrounds: red for negative savings rate, green for positive, amber for MoM increase, blue/neutral for budget status                                                | 7.4       |
| P3  | Insights have flat hierarchy                                          | 🟡 Medium   | Critical insight (spending > income) should be visually larger/bolder than informational ones. Size + border intensity by severity.                                              | 7.4       |
| P4  | Timeline cards are too small to read                                  | 🟡 Medium   | Increase card size. Show emoji larger, add key metric (e.g., savings rate) under persona name.                                                                                   | 7.4       |
| P5  | No persona comparison across months                                   | 🟢 Low      | "Compare with..." dropdown to see side-by-side                                                                                                                                   | 7.5       |

**Mobile transformation:** Metric tiles → 2×2 grid. Insights and recommendations → full-width stacked cards. Timeline → horizontal swipeable strip (no pagination buttons — gesture-based).

**Critical fix (P1) detail:** In `src/lib/persona/recommendations.ts`, the `generateRecommendations()` function only generates `cut_back` when `percentUsed > 120%` of budget. With 0 budgets, there are 0 statuses to evaluate. Add a new recommendation path:

```
IF savingsRate < 0:
  → "Your spending exceeded income by ₹X. Review top categories: [top 3 by amount]"
IF MoM increase > 20% on any category:
  → "Watch out: [category] spending jumped [X]% this month"
IF totalExpenses > totalIncome * 0.9 AND budgets.length === 0:
  → "Consider setting budget targets to track spending limits"
```

---

### A4. Settings / Categories Page (`/settings`)

**What's working:** Clean 4-column grid, categories grouped by type (Expense/Investment), color dots, "+ Add" button.

| #   | Issue                                                           | Severity  | Recommendation                                                                                                               | Sub-Phase |
| --- | --------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------- | --------- |
| S1  | Categories are not visually interactive — hover/actions unclear | 🔴 High   | Show edit/delete actions on hover (desktop) / long-press (mobile). Currently only "Gift" shows a delete icon — inconsistent. | 7.4       |
| S2  | No icons on categories — just colored dots                      | 🟡 Medium | Allow emoji/Lucide icon picker per category. Icons carry through to expenses, analytics, dashboard.                          | 7.5.8     |
| S3  | Color dots are ~8px — too small                                 | 🟡 Medium | Increase to 12px, or use a colored left-border stripe on each card                                                           | 7.4       |
| S4  | No usage stats on category cards                                | 🟡 Medium | Show entry count: "Groceries · 45 entries" or mini spend bar. Turns config page into informative view.                       | 7.4       |
| S5  | "Budget Targets" link card feels misplaced at top               | 🟡 Medium | Consider tabbed layout: [Categories \| Budgets \| Profile \| Email] within Settings. Reduces sidebar clutter.                | 7.4       |
| S6  | Empty space below categories — wasted                           | 🟢 Low    | Show category usage summary: "Most used: Groceries, Least used: Flight"                                                      | 7.4       |
| S7  | No drag-to-reorder                                              | 🟢 Low    | Allow reordering to control display priority across the app                                                                  | 7.5       |
| S8  | No category merge capability                                    | 🟢 Low    | "Merge into..." for handling accidental duplicates                                                                           | 7.5       |

**Mobile transformation:** Grid collapses to 2 columns on tablet, 1 column on mobile. Each card taller with larger tap target. Swipe-left for delete.

---

### A5. Income Page (`/settings/income`)

**What's working:** Clean list, source badges with emoji, paystub upload zone, pagination, running total.

| #   | Issue                                     | Severity  | Recommendation                                                                                       | Sub-Phase |
| --- | ----------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------- | --------- |
| I1  | No edit action — only delete (trash icon) | 🔴 High   | Add edit button per row. What if the extracted amount from PDF was wrong?                            | 7.4       |
| I2  | No income trend visualization             | 🔴 High   | Add sparkline or small bar chart at top showing income over time. Users want "is my income growing?" | 7.4       |
| I3  | Upload zone takes ~120px even when empty  | 🟡 Medium | Collapse to slim bar: "📄 Upload Paystub PDF" → expands on click/tap                                 | 7.4       |
| I4  | Running total is all-time — not segmented | 🟡 Medium | Show: "2026 Total: ¥X" + "Monthly Average: ¥Y" instead of/alongside all-time total                   | 7.4       |
| I5  | No year grouping headers                  | 🟡 Medium | Add visual separators: "── 2026 ──" and "── 2025 ──" between year groups                             | 7.4       |
| I6  | Filter dropdown unlabeled                 | 🟢 Low    | Change "all" to "Source: All"                                                                        | 7.4       |
| I7  | No recurring income suggestion            | 🟢 Low    | If salary is same source/similar amount monthly, offer "Auto-fill next month"                        | 7.5       |

**Mobile transformation:** Table → card stack. Each card: period (large), source badge, amount (right-aligned, monospace). Swipe-left for delete. Upload zone → collapsible slim strip at top.

---

### A6. Budget Targets Page (`/settings/budgets`)

**What's working:** Has a basic empty state with icon + message. "+ Add Budget" button visible.

| #   | Issue                                           | Severity  | Recommendation                                                                                                     | Sub-Phase |
| --- | ----------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------ | --------- |
| B1  | Empty state doesn't sell the feature            | 🔴 High   | Explain WHY budgets matter: "Budgets power your dashboard alerts, persona insights, and spending recommendations." | 7.4.2     |
| B2  | No data-driven budget suggestions               | 🔴 High   | Query last 3 months spending per category. Suggest: "Rent: avg ¥44,415 → Set ¥50,000?" Pre-populate form.          | 7.4.2     |
| B3  | No ghost/preview of what budget cards look like | 🟡 Medium | Show a greyed-out example budget card: "Groceries ¥8,000/¥10,000 [████████░░] 80%"                                 | 7.4.2     |
| B4  | No batch setup                                  | 🟡 Medium | "Set budgets for all categories" → multi-row form instead of one-by-one dialog                                     | 7.4       |
| B5  | No connection to other pages explained          | 🟡 Medium | Add: "Your dashboard will show alerts when you exceed limits" with link                                            | 7.4.2     |
| B6  | When budgets ARE set: need progress bars        | 🟡 Medium | Color-coded: green (<80%), amber (80-100%), red (>100%). Trend arrow (↑/↓ vs last month).                          | 7.4       |

**Mobile transformation:** Same layout works since it's full-width content. Budget suggestion cards should stack vertically.

**Recommendation engine dependency:** This empty budget page directly causes the "No recommendations" bug on the Persona page (P1). The onboarding wizard (7.3.1 step 4) should strongly encourage setting at least 3-5 budgets, with data-driven pre-fills.

---

### A7. Email Settings Page (`/settings/email`)

**What's working:** Clear 3-section layout (SMTP Config → Test Email → Email Log), status indicators, inline env var instructions, email log with status badge.

| #   | Issue                                                                          | Severity  | Recommendation                                                                                                                                      | Sub-Phase |
| --- | ------------------------------------------------------------------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| EM1 | "Not configured" / "Not connected" use red error styling before user has tried | 🟡 Medium | Use neutral grey/blue for "Not yet configured" state. Reserve red for "Configured but failing."                                                     | 7.4       |
| EM2 | Email log shows "Failed" with no error detail                                  | 🔴 High   | Make rows expandable — click to see error message (e.g., "SMTP auth failed", "Connection timeout")                                                  | 7.4       |
| EM3 | SMTP config shows raw env vars — developer-facing                              | 🟡 Medium | Either: (a) provide a form-based SMTP setup that saves to DB, or (b) link to DEPLOYMENT-GUIDE.md with step-by-step instructions instead of raw vars | 7.4       |
| EM4 | No email preview before sending                                                | 🟡 Medium | "Preview Reminder" → modal showing the HTML email template as it would appear                                                                       | 7.4       |
| EM5 | No toggle to enable/disable reminders                                          | 🟡 Medium | Add: "Monthly Reminders: ON/OFF" toggle. Allow disabling without removing SMTP config.                                                              | 7.4       |
| EM6 | Test email buttons give no feedback                                            | 🟡 Medium | Show loading spinner → success toast or inline status after click                                                                                   | 7.4.4     |
| EM7 | No retry on failed emails                                                      | 🟢 Low    | "Retry" button per failed log entry                                                                                                                 | 7.4       |
| EM8 | Cron schedule not user-configurable                                            | 🟢 Low    | Allow choosing day-of-month and time for reminders                                                                                                  | 7.5       |

**Mobile transformation:** Stack all sections vertically (already mostly works). Email log table → card layout on mobile with status badge prominent.

---

### Appendix A Summary: Priority Matrix

Total issues found: **54**

| Priority         | Count | Key Items                                                                                                                                                            |
| ---------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🔴 Critical/High | 14    | Persona recommendations bug (P1), budget empty state (B1-B2), expense actions too small (E1), bulk actions (E2), analytics drill-down (A2), income edit missing (I1) |
| 🟡 Medium        | 30    | Chart labels (A1), filter labeling (E5, I6), color consistency (A6, E3), metric tile emphasis (P2), email error details (EM2)                                        |
| 🟢 Low           | 10    | Row hover (E9), drag reorder (S7), email retry (EM7), cron config (EM8)                                                                                              |

### Cross-Page Systemic Issues

| Issue                                     | Affects                                                  | Recommendation                                                              | Sub-Phase |
| ----------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------- | --------- |
| Tables not responsive on mobile           | Expenses, Income, Email Log                              | Card-based layout below 768px breakpoint                                    | 7.4       |
| Inconsistent card shadow depth            | All pages                                                | Standardize to `shadow-[3px_3px_0px_0px] shadow-border/50` everywhere       | 7.4       |
| No cross-page navigation links            | All pages                                                | Add contextual "See X →" links between related pages                        | 7.4       |
| Category colors not carried through       | Expenses, Analytics, Dashboard                           | Use category color from Settings in all category displays                   | 7.5.8     |
| Toast notifications inconsistent          | All CRUD pages                                           | Audit all operations for sonner toast feedback                              | 7.4.4     |
| Empty states inconsistent quality         | Budgets (basic), Persona recs (broken), others (unknown) | Standardized `<EmptyState>` component with icon + title + description + CTA | 7.4.2     |
| No loading skeletons for data-heavy pages | Analytics, Expenses, Dashboard                           | Skeleton cards/charts matching exact dimensions                             | 7.4.3     |
