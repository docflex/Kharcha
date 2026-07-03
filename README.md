<div align="center">

# Kha₹cha

### See Where Your Money Flows

A privacy-first personal expense tracker that turns your spending app screenshots into structured financial data using OCR — no manual entry, no cloud AI, no data selling.

[![Live Demo](https://img.shields.io/badge/Live-khrcha.vercel.app-F59E0B?style=for-the-badge&logo=vercel&logoColor=white)](https://khrcha.vercel.app)
[![Tests](https://img.shields.io/badge/Tests-713%20Passing-22c55e?style=for-the-badge&logo=vitest&logoColor=white)](#testing)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](#tech-stack)

</div>

---

## The Problem

Millions of Indians track spending through apps like CRED, Buddy, or Fi — but those apps don't let you export your data. You're stuck screenshotting monthly summaries and manually entering numbers into spreadsheets.

**Kharcha automates the entire workflow.** Upload a screenshot, and the OCR engine extracts every category and amount — no internet connection required, no data leaves your browser.

## Features

### Core

- **📸 Screenshot OCR** — Upload spending screenshots from any app (CRED, Buddy, Fi, etc.). Tesseract.js extracts categories and amounts entirely in-browser — offline, free, private
- **💰 Expense Management** — Full CRUD with search, date/category filters, pagination, and bulk actions (delete, recategorize)
- **📊 Analytics Dashboard** — Month-over-month comparisons, savings rate, top categories, trend analysis with interactive Recharts visualizations
- **📋 Budget Tracking** — Set per-category monthly limits with visual progress bars and over-budget alerts

### Smart

- **🧠 Persona Engine** — 9 spending archetypes (Saver, Splurger, Red Flagger, etc.) with personalized monthly insights and actionable recommendations
- **💼 Income Management** — Manual entry or automatic PDF paystub parsing for accurate savings calculations
- **📧 Email Notifications** — Automated monthly upload reminders and dashboard-ready summaries via Gmail SMTP

### Quality of Life

- **📤 Export** — Download your data as Excel (.xlsx) or CSV anytime
- **🔐 Multi-User** — Full data isolation, Google OAuth + email/password auth, profile management
- **🌗 Dark/Light Mode** — System preference detection + manual toggle
- **📱 PWA** — Installable on mobile, share screenshots directly from your gallery to Kharcha
- **🎨 Neo-Brutalist UI** — Bold borders, hard shadows, and smooth Framer Motion animations

## Tech Stack

| Layer        | Technology                                  |
| ------------ | ------------------------------------------- |
| Framework    | Next.js 16 (App Router)                     |
| Language     | TypeScript (strict)                         |
| Styling      | TailwindCSS 4                               |
| Components   | shadcn/ui v4 (Base UI)                      |
| Database     | Neon Postgres (serverless)                  |
| ORM          | Drizzle ORM                                 |
| Auth         | NextAuth.js v5 (Google OAuth + Credentials) |
| OCR          | Tesseract.js (WASM, fully offline)          |
| Charts       | Recharts                                    |
| Data Fetching| TanStack React Query + localStorage persist |
| Email        | Nodemailer + node-cron                      |
| Animations   | Framer Motion (motion/react)                |
| Testing      | Vitest (713 unit/integration) + Playwright (23 E2E) |
| Deployment   | Vercel + Docker                             |

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- A [Neon](https://neon.tech) Postgres database (free tier works)

### Setup

```bash
# Clone the repo
git clone https://github.com/your-username/kharcha.git
cd kharcha

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Push schema to database
npm run db:push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and create an account.

### Environment Variables

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `DATABASE_URL` | ✅ | Neon Postgres connection string |
| `AUTH_SECRET` | ✅ | Session secret — `openssl rand -base64 32` |
| `AUTH_URL` | ✅ | Your app URL (e.g. `http://localhost:3000`) |
| `GOOGLE_CLIENT_ID` | ❌ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ❌ | Google OAuth client secret |
| `SMTP_HOST` | ❌ | SMTP server (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | ❌ | SMTP port (e.g. `587`) |
| `SMTP_USER` | ❌ | SMTP username |
| `SMTP_PASS` | ❌ | SMTP password / app password |
| `EMAIL_FROM` | ❌ | Sender address |
| `CRON_SECRET` | ❌ | Secret for Vercel cron jobs |

## Testing

```bash
# Unit + integration tests (713+ tests)
npm test

# E2E tests (23+ tests)
npm run test:e2e

# Lint
npm run lint

# Format check
npm run format:check
```

## Docker

```bash
# Build and run
docker build -t kharcha .
docker run -p 3000:3000 --env-file .env.local kharcha
```

## Project Structure

```
src/
├── app/
│   ├── (app)/              # Authenticated pages
│   │   ├── dashboard/      # Bento grid with analytics overview
│   │   ├── expenses/       # Expense table with filters + bulk actions
│   │   ├── analytics/      # Charts: donut, bar, MoM, trends
│   │   ├── upload/         # OCR screenshot upload + review
│   │   ├── persona/        # Monthly spending persona + insights
│   │   └── settings/       # Categories, budgets, income, email, profile
│   ├── api/                # 26 API routes (all auth-guarded)
│   └── auth/               # Login, register, forgot/reset password
├── components/
│   ├── layout/             # Sidebar, header, mobile bottom nav
│   ├── expenses/           # Table, filters, form components
│   ├── persona/            # Persona card, insights, recommendations
│   ├── upload/             # Dropzone, review table
│   └── ui/                 # shadcn/ui + custom components
├── hooks/                  # TanStack Query hooks
├── providers/              # React Query + theme providers
└── lib/
    ├── ocr/                # 5-stage pipeline: preprocess → recognize → parse → match → dedup
    ├── analytics/          # MoM, savings, budget, trends calculators
    ├── persona/            # 9 archetypes, insight generator, recommendations
    ├── services/           # Business logic (expenses, categories, budgets, income, uploads, users)
    ├── email/              # SMTP client, HTML templates, scheduler
    ├── export/             # Excel + CSV generators
    ├── auth/               # NextAuth v5 config
    ├── cache/              # Server-side LRU cache
    ├── db/                 # Drizzle schema, Neon connection, test utilities
    └── utils/              # Zod validators, currency formatting, date helpers
```

## How the OCR Works

```
Screenshot → Sharp preprocessing → Tesseract.js WASM recognition
         → Multi-strategy parser (6 regex patterns + chart header fallback)
         → Fuzzy category matcher (Levenshtein + alias dictionary)
         → Duplicate detection → Review UI → Save to DB
```

All processing happens **server-side in Node.js** — no external APIs, no cloud AI, no data exfiltration. The trained data file ships with the app.

## License

MIT
