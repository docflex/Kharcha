# Phase 7 — Agent Prompts

> **How to use:** Copy-paste each prompt into a new Cascade/agent session.
> Execute agents **in order** — each depends on the previous one's output.
> After each agent completes, verify with `/verify` workflow before starting the next.

---

## Execution Order

```
Agent 1  →  Agent 2  →  Agent 3  →  Agent 4
                                       ↓
                              ┌─── Agent 5a ───┐
                              ├─── Agent 5b ───┤  (parallel)
                              └─── Agent 5c ───┘
                                       ↓
                              ┌─── Agent 6a ───┐  (parallel)
                              └─── Agent 6b ───┘
                                       ↓
                                   Agent 7  →  Agent 8
```

---

## Agent 1 — Database Migration (Neon Postgres)

```
You are implementing Phase 7.1 of the Kharcha (खर्चा) expense tracker application.

## Your Mission
Migrate the database from SQLite (better-sqlite3) to Neon Postgres. The app currently uses Drizzle ORM with better-sqlite3. You must swap the driver to @neondatabase/serverless while keeping the Drizzle schema layer intact. All existing 593+ Vitest and 23 Playwright tests must pass after migration.

## Read These Files First (in order)
1. `PHASE-7-SPEC.md` — read ONLY section "7.1 — Database Migration"
2. `src/lib/db/index.ts` — current DB connection (better-sqlite3)
3. `src/lib/db/schema.ts` — full Drizzle schema (13+ tables)
4. `src/lib/db/test-utils.ts` — test DB setup (createTestDb, seedTestUser, etc.)
5. `drizzle.config.ts` — Drizzle Kit config
6. `package.json` — current dependencies
7. `.env.example` — current env vars
8. `next.config.ts` — serverExternalPackages list
9. `Dockerfile` — current Docker setup

## What to Do (Step by Step)
1. Install `@neondatabase/serverless` and `drizzle-orm/neon-http` (or `drizzle-orm/neon-serverless`)
2. Rewrite `src/lib/db/index.ts` to connect to Neon Postgres via the serverless driver
3. Migrate the Drizzle schema from SQLite types to Postgres types:
   - `sqliteTable` → `pgTable`
   - `integer` → `integer` or `serial`
   - `text` → `text` or `varchar`
   - `real` → `doublePrecision` or `numeric`
   - Any `text` used as JSON → `jsonb` where appropriate
   - Date/time fields → `timestamp`
4. Update `drizzle.config.ts` for Postgres dialect
5. Rewrite `src/lib/db/test-utils.ts` — for tests, you have two options:
   - Option A: Use a separate Neon test database (branch)
   - Option B: Use `pg-mem` for fast in-memory Postgres tests
   - The key requirement: `createTestDb()`, `seedTestUser()`, `seedTestCategory()` must still work
6. Remove `better-sqlite3` and `@types/better-sqlite3` from dependencies
7. Update `next.config.ts` — remove `better-sqlite3` from `serverExternalPackages`
8. Update `.env.example` with Postgres connection string format
9. Update `Dockerfile` — remove SQLite native build deps (`python3 make g++` may still be needed for other packages)
10. Update `scripts/ingest-excel.ts` and `scripts/ingest-paystubs.cjs` to work with Postgres
11. Run full test suite and fix any failures

## Critical Constraints
- Follow existing patterns in `.windsurf/workflows/`
- shadcn/ui v4 uses `render` prop, NOT `asChild`
- Next.js 16: `params` and `searchParams` are Promises (must await)
- Zod v4: import from `"zod/v4"` not `"zod"`
- Postgres uses `$1, $2` params vs SQLite's `?` — Drizzle handles this, but check for any raw SQL
- `better-sqlite3` is synchronous, Neon is async — verify no sync DB patterns exist
- DO NOT modify any UI files, API route logic, or service business logic
- ONLY change database connection, schema types, and test infrastructure

## Acceptance Criteria
- [ ] `npm install` succeeds with no `better-sqlite3` dependency
- [ ] `npx drizzle-kit push` creates all tables in Neon
- [ ] All 593+ Vitest tests pass
- [ ] All 23 Playwright tests pass
- [ ] `npx eslint src/` — 0 errors
- [ ] `npm run format:check` — passes
- [ ] `.env.example` updated with `DATABASE_URL=postgres://...` format

## Output When Done
1. List every file created/modified
2. New Vitest + Playwright test counts
3. Output of `npx vitest run 2>&1 | tail -5`
```

---

## Agent 2 — React Query Migration

````
You are implementing Phase 7.2 of the Kharcha (खर्चा) expense tracker application.

## Your Mission
Replace all manual `fetch` + `useState` + `useEffect` + `AbortController` data-fetching patterns with @tanstack/react-query. This gives us caching, deduplication, retry, and optimistic updates across all pages.

## Read These Files First
1. `PHASE-7-SPEC.md` — read ONLY section "7.2 — React Query Migration"
2. `src/app/(app)/layout.tsx` — app layout (add QueryClientProvider here)
3. `src/app/(app)/dashboard/page.tsx` — has 3 useEffects to replace
4. `src/app/(app)/expenses/page.tsx` — fetch + CRUD mutations
5. `src/app/(app)/analytics/page.tsx` — fetch analytics data
6. `src/app/(app)/persona/page.tsx` — fetch persona data
7. `src/app/(app)/upload/page.tsx` — upload + commit mutations
8. `src/app/(app)/settings/page.tsx` — categories CRUD
9. `src/app/(app)/settings/budgets/page.tsx` — budgets CRUD
10. `src/app/(app)/settings/income/page.tsx` — income CRUD
11. `src/app/(app)/settings/email/page.tsx` — email config + test send
12. `src/app/(app)/settings/profile/page.tsx` — profile + password
13. `package.json` — add dependency

## What to Do
1. Install `@tanstack/react-query`
2. Create `src/providers/query-provider.tsx` — `QueryClientProvider` with default options:
   - `staleTime: 5 * 60 * 1000` (5 min)
   - `retry: 1`
   - `refetchOnWindowFocus: false`
3. Wrap app in `QueryClientProvider` in `src/app/(app)/layout.tsx`
4. Create `src/lib/api-client.ts` — typed fetch wrapper:
   ```typescript
   async function apiGet<T>(url: string): Promise<T>
   async function apiPost<T>(url: string, body: unknown): Promise<T>
   async function apiPatch<T>(url: string, body: unknown): Promise<T>
   async function apiDelete(url: string): Promise<void>
````

All methods: parse JSON, extract `.data`, throw on error 5. Create custom hooks in `src/hooks/`:

- `use-analytics.ts` — `useAnalytics(year, month)`, `useSparkline(year, month)`, `useTrends(year, month)`
- `use-expenses.ts` — `useExpenses(filters)`, `useCreateExpense()`, `useUpdateExpense()`, `useDeleteExpense()`
- `use-categories.ts` — `useCategories()`, `useCreateCategory()`, `useDeleteCategory()`
- `use-budgets.ts` — `useBudgets()`, `useCreateBudget()`, `useUpdateBudget()`, `useDeleteBudget()`
- `use-income.ts` — `useIncome(filters)`, `useCreateIncome()`, `useDeleteIncome()`
- `use-persona.ts` — `usePersona(year, month)`, `usePersonaHistory()`
- `use-uploads.ts` — `useUploadScreenshots()`, `useCommitExpenses()`
- `use-profile.ts` — `useProfile()`, `useUpdateProfile()`, `useChangePassword()`
- `use-email.ts` — `useEmailConfig()`, `useEmailLog()`, `useSendTestEmail()`

6. Migrate each page to use the hooks — remove `useState` for data/loading/error, remove `useEffect` for fetching, remove `AbortController`
7. Add optimistic updates for expense create/edit/delete
8. Add global error handler on `QueryClient` — show `sonner` toast on any query error

## Critical Constraints

- shadcn/ui v4 uses `render` prop, NOT `asChild`
- Next.js 16: `params` and `searchParams` are Promises
- Zod v4: import from `"zod/v4"`
- DO NOT change any API route logic, service logic, or database code
- DO NOT change any visual styling or layout — only data-fetching patterns
- Keep all existing UI behavior identical — just swap the fetching mechanism
- Maintain the `fetchTrigger` counter pattern if used for manual refetch — replace with `queryClient.invalidateQueries()`

## Acceptance Criteria

- [ ] No `useEffect` + `fetch` patterns remain in any page component
- [ ] All pages load data via `useQuery` hooks
- [ ] All mutations use `useMutation` with cache invalidation
- [ ] `QueryClientProvider` wraps the app layout
- [ ] `src/lib/api-client.ts` exists with typed methods
- [ ] All existing Vitest + Playwright tests pass
- [ ] `npx eslint src/` — 0 errors
- [ ] `npm run format:check` — passes

## Output When Done

1. List every file created/modified
2. New test counts
3. Verify command output

```

---

## Agent 3 — Security Hardening

```

You are implementing Phase 7.6 of the Kharcha (खर्चा) expense tracker application.

## Your Mission

Harden the application's security: rate limiting, security headers, password policy, session invalidation on password change, audit logging, file upload validation, and sign-out fix.

## Read These Files First

1. `PHASE-7-SPEC.md` — read ONLY section "7.6 — Security Hardening"
2. `SECURITY-AUDIT.md` — full audit findings
3. `src/lib/auth/config.ts` — NextAuth configuration
4. `src/lib/utils/validators.ts` — Zod schemas for password, profile
5. `src/app/api/user/password/route.ts` — password change endpoint
6. `src/lib/services/upload-service.ts` — file upload handling
7. `src/components/layout/sidebar.tsx` — sign-out via GET (line ~262)
8. `next.config.ts` — add security headers here
9. `src/lib/db/schema.ts` — need to add audit_log table
10. `.windsurf/workflows/new-api-route.md` — API route patterns
11. `.windsurf/workflows/new-service.md` — service patterns

## What to Do

### 7.6.1 — Rate Limiting

1. Create `src/lib/middleware/rate-limit.ts` — in-memory sliding window counter
    - `createRateLimiter(options: { windowMs, maxRequests })` → middleware function
    - Returns 429 with `Retry-After` header when exceeded
2. Create `src/middleware.ts` (Next.js middleware) — apply rate limits:
    - `/api/auth/*` — 5 requests / 15 min per IP
    - `/api/*` — 100 requests / min per user
    - `/api/auth/register` — 3 requests / hour per IP
3. Write tests: `tests/integration/api/rate-limiting.test.ts`

### 7.6.2 — Security Headers

1. Add `headers()` config to `next.config.ts`:
    - `X-Frame-Options: DENY`
    - `X-Content-Type-Options: nosniff`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
    - `Content-Security-Policy` — allow self, inline styles (Tailwind), Neon DB, Frankfurter API, Google fonts

### 7.6.3 — Password Policy

1. Update `changePasswordSchema` and registration schema in validators.ts:
    - Min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit, 1 special char
2. Create `src/lib/utils/password-strength.ts` — scoring function (weak/fair/strong)
3. Create `src/components/ui/password-strength.tsx` — visual strength indicator
4. Add to registration and password change forms
5. Write tests: `tests/unit/utils/password-strength.test.ts`

### 7.6.4 — Session Invalidation on Password Change

1. Add `passwordChangedAt` column to users table in schema
2. In NextAuth JWT callback: compare `token.iat` against `user.passwordChangedAt`
3. If password was changed after token was issued → force re-auth
4. Update password change API to set `passwordChangedAt`

### 7.6.5 — Audit Logging

1. Add `audit_log` table to schema: `id, userId, action, details (jsonb), ipAddress, createdAt`
2. Create `src/lib/services/audit-service.ts` — `logAction(db, userId, action, details, ip)`
3. Log events: password_change, profile_update, data_export, login_failed, login_success
4. Create `GET /api/user/audit-log` — returns recent events for current user
5. Write tests: `tests/integration/api/audit-log.test.ts`

### 7.6.6 — File Upload Validation

1. In upload service: validate magic bytes before accepting files:
    - PNG: `89 50 4E 47` (first 4 bytes)
    - JPEG: `FF D8 FF` (first 3 bytes)
    - PDF: `25 50 44 46` (first 4 bytes)
2. Reject files that don't match their claimed content-type
3. Sanitize filenames: `filename.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 100)`

### 7.6.7 — Sign-Out via POST

1. In `src/components/layout/sidebar.tsx`: replace `window.location.href = "/api/auth/signout"` with `signOut()` from `next-auth/react`
2. Same fix in header component if applicable

### 7.6.8 — OAuth User Password Guard

1. In profile API: add `hasPassword: boolean` to profile response
2. In profile page: hide password change form if `hasPassword === false`
3. Show "Signed in via Google" badge instead
4. In password change API: return 400 if user has no existing password hash

## Critical Constraints

- Follow the `/new-api-route` and `/new-service` workflow patterns
- TDD: write tests FIRST for rate limiting, audit logging, password strength
- shadcn/ui v4 uses `render` prop, NOT `asChild`
- Next.js 16: `params` and `searchParams` are Promises
- Zod v4: import from `"zod/v4"`
- DO NOT modify any existing UI layouts, analytics, or persona code
- ONLY touch security-related code

## Acceptance Criteria

- [ ] Rate limiting works (test with rapid requests)
- [ ] Security headers present in response (curl -I)
- [ ] Password change requires complexity
- [ ] Password strength indicator shows on forms
- [ ] Old sessions invalidated after password change
- [ ] Audit log records security events
- [ ] File uploads validate magic bytes
- [ ] Sign-out uses POST
- [ ] OAuth users can't access password change
- [ ] All existing tests still pass + new security tests added
- [ ] `npx eslint src/` — 0 errors
- [ ] `npm run format:check` — passes

## Output When Done

1. List every file created/modified
2. New test counts (estimated ~30 new tests)
3. Verify command output

```

---

## Agent 4 — Onboarding & Feature Tour

```

You are implementing Phase 7.3 of the Kharcha (खर्चा) expense tracker application.

## Your Mission

Build a first-run onboarding wizard for new users AND a driver.js guided feature tour.

## Read These Files First

1. `PHASE-7-SPEC.md` — read ONLY section "7.3 — Onboarding & Feature Tour"
2. `src/app/(app)/layout.tsx` — app layout
3. `src/app/(app)/dashboard/page.tsx` — dashboard (tour destination)
4. `src/components/layout/sidebar.tsx` — sidebar (tour target)
5. `src/components/layout/bottom-nav.tsx` — mobile nav (tour target)
6. `src/hooks/` — existing hooks (use React Query hooks from Agent 2)
7. `src/lib/services/income-service.ts` — income creation for wizard
8. `src/lib/services/budget-service.ts` — budget creation for wizard
9. `package.json` — add driver.js dependency

## What to Do

### 7.3.1 — First-Run Wizard (`/onboarding`)

**Trigger logic:** After login, check if user has 0 expenses AND 0 income entries. If so, redirect to `/onboarding`. Store `onboardingComplete` flag in user profile or localStorage.

**Create these files:**

1. `src/app/(app)/onboarding/page.tsx` — multi-step wizard container
2. `src/components/onboarding/welcome-step.tsx` — "Welcome to Kharcha!" + user name
3. `src/components/onboarding/income-step.tsx` — "What's your monthly take-home?" input
4. `src/components/onboarding/import-step.tsx` — optional Excel upload (reuse existing dropzone)
5. `src/components/onboarding/budget-step.tsx` — show top categories with suggested budgets based on spending history. Allow skip.
6. `src/components/onboarding/complete-step.tsx` — confetti 🎉 + "Dashboard is ready" CTA

**Wizard UX:**

- Progress indicator (dots or step numbers) at top
- "Next" / "Back" / "Skip" buttons per step
- Animate step transitions (slide left/right with Framer Motion)
- Income step: single numeric input, currency symbol prefix
- Budget step: query user's average spending per category, pre-fill suggestions. Show: "Rent: avg ₹44,415 → Budget: [₹50,000]". User can adjust or skip.
- Complete step: celebratory animation, then redirect to dashboard

### 7.3.2 — Feature Tour (driver.js)

1. Install `driver.js`
2. Create `src/lib/tour/config.ts` — tour step definitions for desktop and mobile
3. Create `src/lib/tour/index.ts` — `startTour()`, `hasCompletedTour()` (localStorage), `markTourComplete()`
4. Create `src/components/onboarding/feature-tour.tsx` — component that triggers tour

**Desktop tour stops (7 steps):**

1. Sidebar nav → "Navigate between sections"
2. Dashboard bento grid → "Your spending at a glance"
3. Month selector → "Switch between months"
4. Upload button (sidebar) → "Upload Buddy screenshots for automatic extraction"
5. Sparkline cards → "See 6-month trends inline"
6. Currency selector → "View amounts in any currency"
7. Theme toggle → "Switch between dark and light mode"

**Mobile tour stops (3 steps):**

1. Bottom nav → "Tap to navigate"
2. Dashboard cards → "Your spending overview"
3. FAB button → "Tap to add expenses quickly"

**Trigger:** After onboarding wizard completes → auto-start tour. Also add "Take a Tour" button in Settings.

### Tests

- `tests/e2e/onboarding.spec.ts` — wizard flow: renders, steps navigate, income saves, completes
- `tests/e2e/feature-tour.spec.ts` — tour starts, steps render, tour completes

## Critical Constraints

- Use existing React Query hooks for data fetching (from Agent 2)
- Neo-brutalist styling: 2px borders, hard shadows, font-black uppercase headings
- Framer Motion for step transitions
- shadcn/ui v4: `render` prop, NOT `asChild`
- Zod v4: import from `"zod/v4"`
- Must work on both desktop and mobile viewports

## Acceptance Criteria

- [ ] New user → redirected to `/onboarding`
- [ ] Wizard has 5 steps, all functional
- [ ] Income can be set in wizard
- [ ] Budget suggestions show based on spending data
- [ ] Confetti animation on completion
- [ ] driver.js tour starts after wizard
- [ ] Tour has 7 desktop steps, 3 mobile steps
- [ ] "Take a Tour" button in Settings works
- [ ] Tour completion persisted in localStorage
- [ ] Returning users skip wizard and tour
- [ ] All existing tests pass + new E2E tests added
- [ ] `npx eslint src/` — 0 errors

## Output When Done

1. List every file created/modified
2. New test counts (estimated ~13 new tests)
3. Verify command output

```

---

## Agent 5a — UI Polish: Tables & Data Pages

```

You are implementing part of Phase 7.4 of the Kharcha (खर्चा) expense tracker application. Your scope is polishing the data-heavy pages: Expenses, Income, and Email Settings.

## Your Mission

Fix UI issues on the Expenses, Income, and Email Settings pages based on the audit in PHASE-7-SPEC.md Appendix A (sections A1, A5, A7).

## Read These Files First

1. `PHASE-7-SPEC.md` — read Appendix A sections: A1 (Expenses), A5 (Income), A7 (Email)
2. `src/app/(app)/expenses/page.tsx`
3. `src/components/expenses/expense-table.tsx`
4. `src/components/expenses/expense-filters.tsx`
5. `src/components/expenses/expense-form.tsx`
6. `src/app/(app)/settings/income/page.tsx`
7. `src/app/(app)/settings/email/page.tsx`

## Issues to Fix

### Expenses (E1-E9)

- E1: Increase action button hit targets to 32×32px
- E4: Add visual weight to amounts (scale by magnitude)
- E5: Label filter dropdowns "Category: All", "Source: All". Add search input.
- E6: Make Notes column collapsible. Hide on mobile.
- E7: Add inline editing (double-click on amount/category)
- E8: Sortable column headers with ▲/▼ indicators
- E9: Add `hover:bg-muted/30` row highlight
- **Mobile:** Create card-based layout below 768px. Card: category + color dot, amount (large), date + source badge. Swipe-left to delete.

### Income (I1-I7)

- I1: Add edit action per row (currently only delete exists)
- I2: Add income trend sparkline/chart at top of page
- I3: Collapse upload zone to slim bar when empty, expand on click
- I4: Show yearly total + monthly average (not just all-time total)
- I5: Add year grouping headers between years
- I6: Label filter as "Source: All"
- **Mobile:** Card-based layout. Each card: period, source badge, amount.

### Email (EM1-EM8)

- EM1: Neutral grey/blue for "Not yet configured" state (not red)
- EM2: Expandable email log rows — click to see error details
- EM3: Link to DEPLOYMENT-GUIDE.md instead of raw env vars
- EM4: Email preview modal before sending
- EM5: On/off toggle for monthly reminders
- EM6: Loading spinner + toast feedback on test email buttons
- EM7: Retry button on failed email entries
- **Mobile:** Stack sections vertically. Email log table → card layout.

## Critical Constraints

- Neo-brutalist styling: 2px borders, `shadow-[3px_3px_0px_0px] shadow-border/50`, font-black uppercase headings
- Use React Query hooks (from `src/hooks/`) for data — NOT raw fetch
- shadcn/ui v4: `render` prop, NOT `asChild`
- Framer Motion for animations
- Use `sonner` toast for all CRUD feedback
- All touch targets ≥ 44×44px on mobile
- Use Tailwind responsive prefixes: `md:` for desktop, default for mobile

## Acceptance Criteria

- [ ] All E1-E9 issues addressed
- [ ] All I1-I7 issues addressed
- [ ] All EM1-EM7 issues addressed
- [ ] Mobile card layouts work below 768px on all three pages
- [ ] Toast notifications on all CRUD actions
- [ ] All existing tests pass
- [ ] `npx eslint src/` — 0 errors
- [ ] `npm run format:check` — passes

## Output When Done

1. List every file created/modified
2. Test counts
3. Verify command output

```

---

## Agent 5b — UI Polish: Charts & Visualization

```

You are implementing part of Phase 7.4 of the Kharcha (खर्चा) expense tracker application. Your scope is polishing the Analytics and Persona pages.

## Your Mission

Fix UI issues on Analytics and Persona pages based on PHASE-7-SPEC.md Appendix A (sections A2, A3).

## Read These Files First

1. `PHASE-7-SPEC.md` — read Appendix A sections: A2 (Analytics), A3 (Persona)
2. `src/app/(app)/analytics/page.tsx`
3. `src/app/(app)/persona/page.tsx`
4. `src/components/persona/persona-card.tsx`
5. `src/components/persona/insights-list.tsx`
6. `src/components/persona/recommendations.tsx`
7. `src/lib/persona/recommendations.ts` — **has the P1 bug**
8. `src/lib/persona/insights.ts`
9. `src/lib/analytics/` — analytics engine

## Issues to Fix

### Analytics (A1-A10)

- A1: Fix truncated category names in bar chart — allow wrapping or abbreviate
- A3: Improve donut legend — larger swatches, integrate into chart or side-legend
- A4: Color-code MoM bars — green when spending down, red when up
- A5: Add auto-generated insight callouts between charts
- A7: Consider tabbed layout for chart sections (Breakdown | MoM | Trends)
- A8: Add time-range selector (This Month, Last 3 Months, YTD)
- A9: Enable Recharts animation on month change
- A10: Add loading skeleton placeholders for charts
- **Mobile:** Single-column, swipeable tabs, full-width charts, scrollable legend pills

### Persona (P1-P5)

- **P1 (CRITICAL BUG):** Fix recommendation engine — when 0 budgets exist, generate income-based fallback recommendations:
    ```
    IF savingsRate < 0 → "Spending exceeded income by ₹X. Review: [top 3 categories]"
    IF MoM increase > 20% on any category → "Watch out: [category] jumped X%"
    IF totalExpenses > totalIncome * 0.9 AND no budgets → "Consider setting budget targets"
    ```
    Modify `src/lib/persona/recommendations.ts` to add these fallback paths.
- P2: Color-code metric tile backgrounds (red=negative savings, green=positive, amber=MoM increase)
- P3: Size insights by severity — critical = larger card, info = normal
- P4: Increase timeline card size, show emoji larger, add key metric under name
- **Mobile:** Metric tiles → 2×2, timeline → horizontal swipeable strip

## Critical Constraints

- Recharts library for charts — check existing usage patterns
- Neo-brutalist styling consistency
- Use React Query hooks for data
- The P1 fix is in the backend logic (`src/lib/persona/recommendations.ts`), not just UI
- Write unit tests for the new recommendation fallback paths
- shadcn/ui v4: `render` prop
- Framer Motion for animations

## Acceptance Criteria

- [ ] All A1-A10 issues addressed
- [ ] All P1-P5 issues addressed
- [ ] P1 bug fixed: Red Flagger persona always shows recommendations
- [ ] New unit tests for fallback recommendations
- [ ] Charts animate on month change
- [ ] Loading skeletons show while charts load
- [ ] Mobile layouts work (single column, swipeable)
- [ ] All existing tests pass + new tests added
- [ ] `npx eslint src/` — 0 errors

## Output When Done

1. List every file created/modified
2. Test counts (estimated ~8 new tests for recommendation fallback)
3. Verify command output

```

---

## Agent 5c — UI Polish: Config Pages & Systemic Issues

```

You are implementing part of Phase 7.4 of the Kharcha (खर्चा) expense tracker application. Your scope is polishing Settings, Budgets, and fixing cross-page systemic issues.

## Your Mission

Fix UI issues on Settings and Budgets pages, plus address all cross-page systemic issues from PHASE-7-SPEC.md Appendix A (sections A4, A6, and the systemic issues table).

## Read These Files First

1. `PHASE-7-SPEC.md` — read Appendix A sections: A4 (Settings), A6 (Budgets), Cross-Page Systemic Issues
2. `src/app/(app)/settings/page.tsx` — category management
3. `src/app/(app)/settings/budgets/page.tsx` — budget targets
4. `src/components/layout/loading-skeleton.tsx` — existing skeleton components
5. All page files (for systemic fixes like shadows, toasts, empty states)

## Issues to Fix

### Settings / Categories (S1-S6)

- S1: Show edit/delete actions on hover. Long-press on mobile.
- S3: Increase color dot size to 12px or use colored left-border stripe
- S4: Show usage stats on cards: "Groceries · 45 entries"
- S5: Consider tabbed layout within Settings
- S6: Fill empty space with category usage summary

### Budget Targets (B1-B6)

- B1: Rich empty state — explain WHY budgets matter, how they connect to dashboard/persona
- B2: Data-driven budget suggestions — query last 3 months avg spending, pre-fill
- B3: Ghost/preview budget card when no budgets exist
- B4: Batch setup option — "Set budgets for all categories"
- B5: Add cross-page links: "Dashboard alerts", "Persona insights"
- B6: When budgets exist — progress bars with color coding (green/amber/red)

### Cross-Page Systemic Issues

1. **Standardize card shadows** — `shadow-[3px_3px_0px_0px] shadow-border/50` everywhere
2. **Create `<EmptyState>` component** — `src/components/ui/empty-state.tsx` with icon + title + description + CTA
3. **Extend loading skeletons** — create chart, card, and table skeleton variants
4. **Toast audit** — ensure every CRUD action across all pages shows sonner toast
5. **Cross-page navigation links** — add "See X →" links between related pages
6. **Sonner Toaster styling** — create `src/components/providers/toast-provider.tsx` with neo-brutalist toast styles

### Mobile

- Settings category grid: 4 cols → 2 cols tablet → 1 col mobile
- Budget suggestion cards: stack vertically on mobile

## Critical Constraints

- Use React Query hooks for budget suggestion data fetch
- Neo-brutalist styling consistency
- shadcn/ui v4: `render` prop
- The `<EmptyState>` component will be reused by other agents — make it generic
- Budget suggestions query: `GET /api/analytics?year=YYYY&month=MM` already returns category spending data

## Acceptance Criteria

- [ ] All S1-S6 issues addressed
- [ ] All B1-B6 issues addressed
- [ ] `<EmptyState>` component created and used on all empty pages
- [ ] Loading skeletons extended (chart, card, table variants)
- [ ] Card shadows standardized across all pages
- [ ] Sonner toasts fire on all CRUD actions (audit every page)
- [ ] Cross-page navigation links added
- [ ] Mobile layouts work for Settings and Budgets
- [ ] All existing tests pass
- [ ] `npx eslint src/` — 0 errors

## Output When Done

1. List every file created/modified
2. Test counts
3. Verify command output

```

---

## Agent 6a — Missing Features: Analytics

```

You are implementing Phase 7.5 (analytics features) of the Kharcha (खर्चा) expense tracker application.

## Your Mission

Build 4 missing spec'd features: Investment Toggle (7.5.1), Category Heatmap (7.5.2), YoY Comparison (7.5.3), and Category Deep-Dive page (7.5.4).

## Read These Files First

1. `PHASE-7-SPEC.md` — sections 7.5.1 through 7.5.4
2. `src/lib/analytics/` — existing analytics engine (mom.ts, savings.ts, budget.ts, trends.ts)
3. `src/app/api/analytics/route.ts` — analytics API
4. `src/app/(app)/analytics/page.tsx` — analytics page
5. `src/app/(app)/dashboard/page.tsx` — dashboard (investment toggle goes here)
6. `.windsurf/workflows/new-api-route.md` — API route patterns
7. `.windsurf/workflows/new-service.md` — service patterns

## What to Build

### 7.5.1 — Investment Toggle

- Add toggle switch to dashboard header (next to month selector)
- When OFF: exclude categories with type "investment" from expense totals
- Store preference in localStorage
- Pass `excludeInvestments=true` query param to analytics API (or filter client-side)

### 7.5.2 — Category Heatmap

- Create `src/lib/analytics/heatmap.ts` — compute 12-month × N-category intensity grid
- Create `src/app/api/analytics/heatmap/route.ts` — `GET ?year=2026`
- Create `src/components/analytics/category-heatmap.tsx` — SVG/Recharts grid
- Color scale: white/light → amber → red (budget exceeded)
- Add to analytics page

### 7.5.3 — YoY Comparison

- Create `src/lib/analytics/yoy.ts` — same month across all available years
- Create `src/app/api/analytics/yoy/route.ts` — `GET ?month=6`
- UI: grouped bar chart on analytics page
- Write tests: `tests/unit/analytics/yoy-calculator.test.ts`

### 7.5.4 — Category Deep-Dive

- Create `src/app/(app)/analytics/category/[id]/page.tsx`
- Create `src/app/api/analytics/category/[id]/route.ts`
- Show: historical trend line, budget adherence timeline, avg/min/max stats, anomaly highlighting
- Make category names clickable throughout the app → link to this page
- Write tests: `tests/integration/api/category-deepdive.test.ts`

## Critical Constraints

- TDD: write tests first
- Next.js 16: `params` are Promises — `const { id } = await params;`
- Use React Query hooks for data fetching
- Follow `/new-api-route` and `/new-service` workflow patterns
- Auth guard on all new API routes
- userId scoping on all queries
- Neo-brutalist styling on new UI components

## Acceptance Criteria

- [ ] Investment toggle works on dashboard
- [ ] Heatmap renders 12-month grid with intensity colors
- [ ] YoY chart shows same month across years
- [ ] Category deep-dive page loads with full history
- [ ] Category names clickable throughout app
- [ ] All new features have tests
- [ ] All existing tests pass
- [ ] `npx eslint src/` — 0 errors

## Output When Done

1. List every file created/modified
2. New test counts (estimated ~25 new tests)
3. Verify command output

```

---

## Agent 6b — Missing Features: Account & CRUD

```

You are implementing Phase 7.5 (account features) of the Kharcha (खर्चा) expense tracker application.

## Your Mission

Build 4 missing spec'd features: Forgot Password (7.5.5), Danger Zone (7.5.6), Bulk Actions (7.5.7), and Category Customization (7.5.8).

## Read These Files First

1. `PHASE-7-SPEC.md` — sections 7.5.5 through 7.5.8
2. `src/lib/db/schema.ts` — database schema (need new table for password reset tokens)
3. `src/lib/auth/config.ts` — NextAuth config
4. `src/lib/email/templates.ts` — email templates (add password reset template)
5. `src/lib/email/service.ts` — email sending service
6. `src/app/(app)/settings/profile/page.tsx` — add danger zone here
7. `src/app/(app)/expenses/page.tsx` — add bulk actions here
8. `src/app/(app)/settings/page.tsx` — add icon/color pickers here
9. `.windsurf/workflows/new-api-route.md` — API patterns
10. `.windsurf/workflows/new-service.md` — service patterns

## What to Build

### 7.5.5 — Forgot Password

- Create `src/app/auth/forgot-password/page.tsx` — email input form
- Create `src/app/auth/reset-password/page.tsx` — new password form (with token from URL)
- Create `POST /api/auth/forgot-password` — generate time-limited token, send email
- Create `POST /api/auth/reset-password` — validate token, update password hash
- Add `password_reset_tokens` table to schema: `id, userId, token (hashed), expiresAt, usedAt`
- Add password reset email template to `src/lib/email/templates.ts`
- Link from login page: "Forgot password?"
- Write tests: `tests/integration/api/forgot-password.test.ts`

### 7.5.6 — Danger Zone

- Add "Danger Zone" section at bottom of profile page
- "Delete All Data" button — deletes expenses, budgets, income, uploads, personas (keeps account)
- "Delete Account" button — deletes everything + user record, signs out
- Both require typing "DELETE" in a confirmation input
- Create `DELETE /api/user/data` — delete user's data only
- Create `DELETE /api/user/account` — delete everything + user
- Write tests: `tests/integration/api/cascade-delete.test.ts`

### 7.5.7 — Bulk Actions on Expenses

- Add checkbox column to expense table
- "Select All" checkbox in table header
- Floating action bar when items selected: "Delete Selected (N)", "Re-categorize"
- Create `POST /api/expenses/bulk-delete` — accepts `{ ids: string[] }`
- Create `POST /api/expenses/bulk-update` — accepts `{ ids: string[], categoryId: string }`
- Write tests: `tests/integration/api/bulk-operations.test.ts`

### 7.5.8 — Category Customization (Icons + Colors)

- Add icon picker to category edit: grid of ~30 common Lucide icons
- Add color picker: preset palette of 12 colors (accessible in both themes)
- Save via existing `PATCH /api/categories/[id]` — add `icon` and `color` columns to categories table if not present
- Display category icons/colors throughout the app:
    - Expense table: colored dot + icon next to category name
    - Analytics: use category colors in charts
    - Dashboard: category-colored indicators
- Create `src/components/ui/icon-picker.tsx`
- Create `src/components/ui/color-picker.tsx`

## Critical Constraints

- TDD: write tests first
- Follow `/new-api-route` and `/new-service` workflows
- Auth guard on all new API routes
- userId scoping on all queries
- Password reset tokens: hash with crypto before storing, 1-hour expiry, single-use
- Cascade delete must respect foreign key relationships
- Neo-brutalist styling on all new UI
- shadcn/ui v4: `render` prop, NOT `asChild`
- Zod v4: import from `"zod/v4"`

## Acceptance Criteria

- [ ] Forgot password: email sent with reset link, link works, password updated
- [ ] Danger zone: "Delete Data" and "Delete Account" work with confirmation
- [ ] Bulk delete: select multiple expenses, delete all at once
- [ ] Bulk re-categorize: change category for multiple expenses
- [ ] Category icons: picker works, icons display everywhere
- [ ] Category colors: picker works, colors display in charts and tables
- [ ] All new features have tests
- [ ] All existing tests pass
- [ ] `npx eslint src/` — 0 errors

## Output When Done

1. List every file created/modified
2. New test counts (estimated ~25 new tests)
3. Verify command output

```

---

## Agent 7 — Vercel Deployment

```

You are implementing Phase 7.7 of the Kharcha (खर्चा) expense tracker application.

## Your Mission

Configure and deploy the application to Vercel's free tier. Set up Vercel Blob for file storage, Vercel Cron for email scheduling, and verify all features work in production.

## Read These Files First

1. `PHASE-7-SPEC.md` — section "7.7 — Vercel Deployment"
2. `DEPLOYMENT-GUIDE.md` — full bootstrapping guide
3. `next.config.ts` — current config
4. `Dockerfile` — existing Docker setup (keep for local)
5. `src/lib/services/upload-service.ts` — needs Vercel Blob integration
6. `src/lib/email/scheduler.ts` — needs Vercel Cron migration
7. `package.json` — add @vercel/blob dependency

## What to Do

### 7.7.1 — Vercel Config

1. Create `vercel.json`:
    ```json
    {
        "crons": [
            {
                "path": "/api/cron/email-reminder",
                "schedule": "30 3 1 * *"
            }
        ],
        "functions": {
            "src/app/api/uploads/*/route.ts": {
                "maxDuration": 60
            }
        }
    }
    ```

### 7.7.2 — Vercel Blob Integration

1. Install `@vercel/blob`
2. Update upload service to detect environment:
    - `process.env.BLOB_READ_WRITE_TOKEN` exists → use Vercel Blob
    - Otherwise → use local filesystem (current behavior)
3. Wrapper: `src/lib/storage/index.ts` with `uploadFile()`, `deleteFile()`, `getFileUrl()`

### 7.7.3 — Vercel Cron

1. Create `src/app/api/cron/email-reminder/route.ts`:
    - Verify `CRON_SECRET` from Authorization header
    - Loop through users, send monthly reminders
    - Return 200 with results
2. The existing `node-cron` scheduler should be conditionally loaded (only when not on Vercel)

### 7.7.4 — Landing Page

1. Replace the redirect in `src/app/page.tsx` with an actual landing page for unauthenticated users:
    - Hero section: app name, tagline, logo animation
    - Feature highlights: 3-4 bento cards (OCR, Analytics, Persona, Free)
    - CTA: "Get Started" → `/auth/register`
    - Keep redirect to `/dashboard` for authenticated users

### 7.7.5 — Production Optimizations

1. Verify `output: "standalone"` in next.config.ts
2. Add Vercel Analytics (free): `@vercel/analytics` package, add component to layout
3. Update `.env.example` with all Vercel-specific env vars

## Critical Constraints

- Keep Docker deployment working alongside Vercel
- The upload service must work in BOTH environments (local fs + Vercel Blob)
- The cron route must verify CRON_SECRET to prevent unauthorized triggers
- DO NOT modify any existing features, styling, or business logic
- shadcn/ui v4: `render` prop, NOT `asChild`
- Neo-brutalist styling for landing page

## Acceptance Criteria

- [ ] `vercel.json` configured correctly
- [ ] Upload service uses Vercel Blob when token present, local fs otherwise
- [ ] Cron endpoint works and verifies CRON_SECRET
- [ ] Landing page renders for unauthenticated users
- [ ] Authenticated users still redirect to dashboard
- [ ] `.env.example` updated with all Vercel env vars
- [ ] Docker build still works
- [ ] All tests pass
- [ ] `npx eslint src/` — 0 errors

## Output When Done

1. List every file created/modified
2. Test counts
3. Steps to deploy (env vars to set, buttons to click)

```

---

## Agent 8 — Final Test Sweep & Handoff

```

You are performing the final Phase 7.8 of the Kharcha (खर्चा) expense tracker application.

## Your Mission

1. Run the full test audit workflow
2. Fill any test coverage gaps
3. Create the PHASE-7-HANDOFF.md document

## Read These Files First

1. `PHASE-7-SPEC.md` — section "7.8 — Testing & Documentation"
2. `.windsurf/workflows/audit-tests.md` — test audit workflow
3. `.windsurf/workflows/verify.md` — verification workflow
4. All test files in `tests/`
5. All phase handoff docs (PHASE-1 through PHASE-6) for format reference

## What to Do

### Step 1: Run Full Verification

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npx vitest run
NODE_TLS_REJECT_UNAUTHORIZED=0 npx playwright test --reporter=list
npx eslint src/
npm run format:check
```

### Step 2: Audit Test Coverage

Follow `.windsurf/workflows/audit-tests.md`:

1. List all services vs test files — identify gaps
2. Check edge cases: empty inputs, boundary values, duplicate handling, cross-user isolation
3. Write missing tests

### Step 3: Specific Tests to Verify Exist

- [ ] `tests/e2e/onboarding.spec.ts` — wizard flow
- [ ] `tests/e2e/feature-tour.spec.ts` — tour completion
- [ ] `tests/e2e/empty-states.spec.ts` — all pages empty state
- [ ] `tests/e2e/landing.spec.ts` — landing page
- [ ] `tests/unit/analytics/yoy-calculator.test.ts`
- [ ] `tests/unit/utils/password-strength.test.ts`
- [ ] `tests/integration/api/category-deepdive.test.ts`
- [ ] `tests/integration/api/forgot-password.test.ts`
- [ ] `tests/integration/api/bulk-operations.test.ts`
- [ ] `tests/integration/api/rate-limiting.test.ts`
- [ ] `tests/integration/api/audit-log.test.ts`
- [ ] `tests/integration/api/cascade-delete.test.ts`
- [ ] `tests/integration/api/error-handling.test.ts`

If any are missing, create them.

### Step 4: Create PHASE-7-HANDOFF.md

Follow the format of previous handoff docs. Include:

- Phase 7 summary and scope
- All decisions made (Decision Log #14-19)
- Critical gotchas discovered during implementation
- Files created/modified (grouped by sub-phase)
- Final test counts
- Deployment status
- Security audit status
- What's next (if anything)

### Step 5: Update Workflows

- Update `.windsurf/workflows/verify.md` with new expected test counts
- Update `.windsurf/workflows/audit-tests.md` with new test inventory

## Acceptance Criteria

- [ ] 700+ total tests passing (Vitest + Playwright)
- [ ] 0 lint errors
- [ ] Prettier formatted
- [ ] PHASE-7-HANDOFF.md created
- [ ] verify.md updated
- [ ] audit-tests.md updated

## Output When Done

1. Final test counts (exact)
2. Full verification output
3. PHASE-7-HANDOFF.md location

```

---

## Quick Reference: File Dependencies Between Agents

```

Agent 1 creates/modifies:
src/lib/db/index.ts ← Agent 2+ reads
src/lib/db/schema.ts ← Agent 3, 6b reads
src/lib/db/test-utils.ts ← All test-writing agents use

Agent 2 creates:
src/providers/query-provider.tsx ← Agent 4+ uses
src/lib/api-client.ts ← Agent 4+ uses
src/hooks/*.ts ← Agent 4, 5, 6 use

Agent 3 creates:
src/lib/middleware/rate-limit.ts ← standalone
src/middleware.ts ← standalone
src/lib/services/audit-service.ts ← Agent 6b may log to

Agent 5c creates:
src/components/ui/empty-state.tsx ← Agent 4, 6 use

```

```
