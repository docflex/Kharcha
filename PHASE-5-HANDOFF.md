# Phase 5: Email & Polish — HANDOFF

## Status: ✅ COMPLETE

### Test Counts

- **556 Vitest** (501 Phase 4.5 + 55 new)
- **22 Playwright** (21 Phase 4.5 + 1 new route)
- **578 total, all passing**
- **0 new lint errors**, Prettier formatted
- Sidebar updated to `v0.5.0 · Phase 5`

---

## What Was Added

### 5.1 Email Client (`src/lib/email/client.ts`)

- Nodemailer transport wrapper with singleton pattern
- `sendEmail()`, `verifyConnection()`, `isEmailConfigured()`, `getEmailConfig()`
- Reads `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` from env
- Tests: `tests/unit/email/email-client.test.ts` — **9 tests**

### 5.2 Email HTML Templates (`src/lib/email/templates.ts`)

- **Upload Reminder** — monthly nudge to upload screenshots, includes previous month stats
- **Dashboard Ready** — month summary with spend, top categories, savings rate, persona teaser
- Neo-brutalist styled emails matching app design (amber accent, hard shadows, monospace amounts)
- INR formatting with `₹` symbol and Indian comma grouping
- Tests: `tests/unit/email/email-templates.test.ts` — **17 tests**

### 5.3 Email Service (`src/lib/email/service.ts`)

- `sendUploadReminder()` — sends reminder + logs to `email_log` table
- `sendDashboardReady()` — sends dashboard summary + logs to `email_log` table
- `getEmailLog()` — query email log with optional type filter
- All emails logged with `sent`/`failed` status
- Tests: `tests/unit/email/email-service.test.ts` — **7 tests**

### 5.4 Email API Route (`src/app/api/email/route.ts`)

- `GET ?action=status` — check SMTP configuration and connection
- `GET ?action=log&type=` — retrieve email log for current user
- `POST { type, year, month }` — trigger upload_reminder or dashboard_ready email
- Auth-guarded with `auth()` session check

### 5.5 Cron Scheduler (`src/lib/email/scheduler.ts`)

- `REMINDER_CRON_EXPRESSION` = `30 3 1 * *` (1st of month, 9:00 AM IST / 3:30 AM UTC)
- `startScheduler()` / `stopScheduler()` / `isSchedulerRunning()` with singleton guard
- Uses `node-cron` with `Asia/Kolkata` timezone
- Tests: `tests/unit/email/scheduler.test.ts` — **7 tests**

### 5.6 Email Settings UI (`src/app/(app)/settings/email/page.tsx`)

- SMTP status card (configured / connected indicators)
- Setup instructions for `.env.local` when not configured
- "Send Test Email" buttons for both reminder and dashboard ready types
- Email log table with type, subject, timestamp, and status badges
- Neo-brutalist design with motion animations

### 5.7 Excel Export (`src/lib/export/excel.ts`)

- `exportToExcel()` — generates `.xlsx` with ExcelJS
- **Sheet 1 "Monthly Input"**: Year | Month | Category | Amount (sorted, amber-styled header)
- **Sheet 2 "Summary"**: Pivot table — categories × months
- Tests: `tests/unit/export/excel-export.test.ts` — **6 tests**

### 5.8 CSV Export (`src/lib/export/csv.ts`)

- `exportToCsv()` — generates CSV string with UTF-8 BOM for Excel compatibility
- Columns: Year, Month, Category, Amount (INR)
- Handles comma escaping, month name conversion, sorted output
- Tests: `tests/unit/export/csv-export.test.ts` — **9 tests**

### 5.9 Export API Route (`src/app/api/export/route.ts`)

- `GET ?format=xlsx|csv&year=&month=` — download expenses as Excel or CSV
- Joins expenses with categories for human-readable category names
- Auth-guarded, returns proper Content-Type and Content-Disposition headers

### 5.9b Export Buttons on Expenses Page

- Excel and CSV download buttons added to expenses page header
- Exports respect current year/month filter selections

### 5.10 Dark/Light Mode

- Already implemented: `ThemeProvider` in root layout with `system` default
- Toggle button in header (Sun/Moon icon transition)
- All new components support dark mode via Tailwind `dark:` utilities

### 5.11 Error Boundary & Loading States

- `ErrorBoundary` class component (`src/components/layout/error-boundary.tsx`)
    - Wraps app layout main content
    - Shows error message + "Try Again" button
- `LoadingSkeleton` / `TableLoadingSkeleton` components (`src/components/layout/loading-skeleton.tsx`)
    - Animated pulse skeletons for cards and tables
- Email settings page has full loading state with Loader2 spinner

---

## Files Created

### Email Module (`src/lib/email/`)

| File           | Purpose                      |
| -------------- | ---------------------------- |
| `client.ts`    | Nodemailer transport wrapper |
| `templates.ts` | HTML email rendering         |
| `service.ts`   | Send + log email functions   |
| `scheduler.ts` | node-cron scheduler          |
| `index.ts`     | Barrel export                |

### Export Module (`src/lib/export/`)

| File       | Purpose                  |
| ---------- | ------------------------ |
| `excel.ts` | ExcelJS .xlsx generation |
| `csv.ts`   | CSV string generation    |
| `index.ts` | Barrel export            |

### API Routes

| Route         | Methods                       |
| ------------- | ----------------------------- |
| `/api/email`  | GET (status/log), POST (send) |
| `/api/export` | GET (download xlsx/csv)       |

### UI Pages & Components

| File                                         | Purpose                     |
| -------------------------------------------- | --------------------------- |
| `src/app/(app)/settings/email/page.tsx`      | Email settings page         |
| `src/components/layout/error-boundary.tsx`   | Error boundary component    |
| `src/components/layout/loading-skeleton.tsx` | Loading skeleton components |

### Tests (55 new)

| File                                       | Count |
| ------------------------------------------ | ----- |
| `tests/unit/email/email-client.test.ts`    | 9     |
| `tests/unit/email/email-templates.test.ts` | 17    |
| `tests/unit/email/email-service.test.ts`   | 7     |
| `tests/unit/email/scheduler.test.ts`       | 7     |
| `tests/unit/export/excel-export.test.ts`   | 6     |
| `tests/unit/export/csv-export.test.ts`     | 9     |

---

## Files Modified

| File                                | Change                                 |
| ----------------------------------- | -------------------------------------- |
| `src/app/(app)/expenses/page.tsx`   | Added Excel/CSV export buttons         |
| `src/app/(app)/layout.tsx`          | Wrapped with ErrorBoundary             |
| `src/components/layout/sidebar.tsx` | Added Email nav item, bumped to v0.5.0 |
| `tests/e2e/console-health.spec.ts`  | Added `/settings/email` route          |

---

## Environment Variables (for email to work)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
EMAIL_FROM="Kharcha <your-email@gmail.com>"
```

---

## Architecture Notes

- **Email client** uses a lazily-initialized singleton transport. Call `resetTransport()` after config changes.
- **Email templates** render self-contained HTML (inline styles, no external CSS) for maximum email client compatibility.
- **Email service** always logs to `email_log` table regardless of send success/failure.
- **Export** uses the same `ExportData` interface for both Excel and CSV, enabling easy format switching.
- **Cron scheduler** is designed to be started by the application entry point (e.g., in a custom server or instrumentation file).
- **Error boundary** uses React class component (required for `getDerivedStateFromError`).

---

## What's Next

Phase 5 completes the core feature set. Remaining work:

- **Phase 6 (if planned)**: Docker deployment, CI/CD, production hardening
- **Immediate polish**: Connect cron scheduler to application startup, add email preference toggles per user
