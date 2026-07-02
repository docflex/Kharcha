# Kha₹cha

A personal expense tracker built for tracking monthly spending from screenshot ingestion (OCR), with budgets, analytics, persona engine, email notifications, and multi-user support.

## Features

- **Screenshot OCR** — Upload spending screenshots, auto-extract categories and amounts via Tesseract.js
- **Expense Management** — Full CRUD with filters, pagination, and Excel/CSV export
- **Budget Tracking** — Set per-category monthly limits with over-budget alerts
- **Analytics Dashboard** — Month-over-month trends, savings rate, top categories (Recharts)
- **Persona Engine** — 9 spending archetypes with monthly insights and recommendations
- **Income Management** — Manual entry or PDF paystub parsing
- **Email Notifications** — Monthly upload reminders and dashboard-ready emails (Nodemailer + node-cron)
- **Multi-User** — Full data isolation per user, profile management, Google OAuth + credentials auth
- **Dark/Light Mode** — System preference + manual toggle
- **Neo-Brutalist UI** — Bold borders, hard shadows, Framer Motion animations

## Tech Stack

| Layer      | Technology                                  |
| ---------- | ------------------------------------------- |
| Framework  | Next.js 16 (App Router)                     |
| Language   | TypeScript                                  |
| Styling    | TailwindCSS 4                               |
| Components | shadcn/ui v4 (Base UI)                      |
| Database   | Neon Postgres (serverless)                  |
| ORM        | Drizzle ORM (neon-http adapter)             |
| Auth       | NextAuth.js v5 (Google OAuth + Credentials) |
| OCR        | Tesseract.js                                |
| Charts     | Recharts                                    |
| Email      | Nodemailer + node-cron                      |
| Animation  | Framer Motion (motion/react)                |
| Data       | @tanstack/react-query                       |
| Testing    | Vitest + Playwright                         |

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Setup

```bash
# Install dependencies
npm install

# Copy environment file and fill in values
cp .env.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and register an account.

### Environment Variables

See `.env.example` for all required variables:

- `DATABASE_URL` — Neon Postgres connection string
- `NEXTAUTH_SECRET` — Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` — Your app URL
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth credentials
- `SMTP_*` / `EMAIL_FROM` — Email notification config (optional)

## Testing

```bash
# Unit + integration tests (602+ tests)
NODE_TLS_REJECT_UNAUTHORIZED=0 npx vitest run

# E2E tests (23+ tests)
NODE_TLS_REJECT_UNAUTHORIZED=0 npx playwright test --reporter=list

# Lint
npx eslint src/

# Format check
npm run format:check
```

## Docker

```bash
# Build and run
docker compose up --build

# Or build manually
docker build -t kharcha .
docker run -p 3000:3000 --env-file .env.local kharcha
```

## Project Structure

```
src/
├── app/
│   ├── (app)/          # Authenticated pages (dashboard, expenses, analytics, etc.)
│   ├── api/            # API routes (expenses, categories, budgets, uploads, etc.)
│   └── auth/           # Login + register pages
├── components/
│   ├── layout/         # Sidebar, header, bottom nav, error boundary
│   ├── expenses/       # Expense table, filters, form
│   ├── persona/        # Persona card, insights, recommendations
│   ├── upload/         # Dropzone, review table
│   └── ui/             # shadcn/ui components
├── hooks/              # React Query hooks (use-analytics, use-expenses, etc.)
├── providers/          # QueryProvider (React Query)
└── lib/
    ├── analytics/      # MoM, savings, budget, trends calculators
    ├── auth/           # NextAuth config
    ├── db/             # Schema, connection (Neon HTTP), test utils
    ├── email/          # Client, templates, service, scheduler
    ├── export/         # Excel + CSV export
    ├── ocr/            # Preprocessor, recognizer, parser, matcher, dedup
    ├── persona/        # Archetypes, generator, insights, recommendations
    ├── services/       # Category, expense, budget, income, upload, user services
    └── utils/          # Validators, currency, dates
```

## Phased Development

| Phase | Status | Description                                                     |
| ----- | ------ | --------------------------------------------------------------- |
| 1     | ✅     | Foundation — DB schema, auth, category/expense services         |
| 2     | ✅     | OCR Pipeline — Screenshot processing, parser, matcher, dedup    |
| 3     | ✅     | Dashboard & Analytics — Charts, budgets UI, expense CRUD        |
| 4     | ✅     | Persona Engine — 9 archetypes, insights, recommendations        |
| 4.5   | ✅     | Income + Polish — Income management, pagination, month nav      |
| 5     | ✅     | Email & Export — Notifications, Excel/CSV export                |
| 6     | ✅     | Multi-User & Deploy — Data isolation, profile, Docker, security |
| 7     | 🔄     | Polish & Deploy — Neon Postgres, React Query, security, Vercel  |
