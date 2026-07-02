# Vercel Deployment Checklist

> Follow every step in order. Do not skip ahead.

---

## Phase 1: Third-Party Services Setup

### 1.1 — Neon Postgres Database

- [ ] Create account at [neon.tech](https://neon.tech) (sign up with GitHub)
- [ ] Create project: name `kharcha`, region `ap-south-1` (India) or closest to you
- [ ] Copy the **pooled** connection string (hostname contains `-pooler`)
  ```
  postgres://user:pass@ep-xyz-123-pooler.ap-south-1.aws.neon.tech/kharcha?sslmode=require
  ```
- [ ] Save locally in `.env.local` as `DATABASE_URL`
- [ ] Push schema to Neon:
  ```bash
  NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/push-schema.mjs
  ```
- [ ] Verify all 16 tables + indexes created (check Neon Console → SQL Editor → `\dt`)

> **Known gap:** `audit_log` table is missing from `push-schema.mjs`. You must add it manually before deploying, or run this SQL in Neon Console:
> ```sql
> CREATE TABLE IF NOT EXISTS "audit_log" (
>     "id" text PRIMARY KEY,
>     "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
>     "action" text NOT NULL,
>     "details" text,
>     "ip_address" text,
>     "created_at" timestamp NOT NULL DEFAULT now()
> );
> ```

### 1.2 — Google OAuth

- [ ] Go to [Google Cloud Console](https://console.cloud.google.com) → create project `Kharcha`
- [ ] Enable **OAuth consent screen**: External, app name `Kharcha`
- [ ] Add scopes: `openid`, `email`, `profile`
- [ ] Create **OAuth client ID** (Web application):
  - Authorized JS origins: `http://localhost:3000`
  - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
  - *(You'll add the Vercel URL to both after first deploy)*
- [ ] Copy **Client ID** and **Client Secret**
- [ ] Save in `.env.local`:
  ```env
  GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
  GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
  ```
- [ ] Publish the app (OAuth consent screen → Audience → Publish)

### 1.3 — Gmail SMTP (for email notifications)

- [ ] Enable 2-Step Verification on your Google Account
- [ ] Generate App Password at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
  - App name: `Kharcha`
  - Copy the 16-char password immediately
- [ ] Save in `.env.local`:
  ```env
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=your-email@gmail.com
  SMTP_PASS=abcdefghijklmnop
  EMAIL_FROM="Kharcha <your-email@gmail.com>"
  ```

### 1.4 — Generate Secrets

- [ ] Generate `AUTH_SECRET`:
  ```bash
  openssl rand -base64 32
  ```
- [ ] Generate `CRON_SECRET`:
  ```bash
  openssl rand -base64 32
  ```
- [ ] Save both in `.env.local`

---

## Phase 2: Local Verification (Before Deploying)

### 2.1 — Tests

- [ ] Run Vitest (expect 847+ passing):
  ```bash
  NODE_TLS_REJECT_UNAUTHORIZED=0 npx vitest run
  ```
- [ ] Run ESLint (expect 0 errors):
  ```bash
  npx eslint src/
  ```
- [ ] Run Prettier check:
  ```bash
  npm run format:check
  ```

### 2.2 — Local Build

- [ ] Verify build succeeds with production env vars:
  ```bash
  npm run build
  ```
  If it fails, fix errors before proceeding.

### 2.3 — Local Smoke Test (Against Neon)

- [ ] Start dev server: `npm run dev`
- [ ] Register a test user via email/password
- [ ] Verify Google OAuth login works
- [ ] Add a category + expense manually
- [ ] Check Dashboard, Analytics, Persona pages load
- [ ] Test dark/light mode toggle
- [ ] Go to `/settings/email` → verify SMTP status shows "Connected"

---

## Phase 3: GitHub Setup

### 3.1 — Repository

- [ ] Initialize git (if not already): `git init`
- [ ] Ensure `.gitignore` excludes: `.env*`, `node_modules/`, `.next/`, `/data/`, `/uploads/`
- [ ] Verify no secrets in tracked files:
  ```bash
  git grep -i "password\|secret\|smtp_pass" -- ':!*.md' ':!*.example' ':!*.test.*'
  ```
- [ ] Create GitHub repo (public or private)
- [ ] Push:
  ```bash
  git add -A
  git commit -m "Ready for Vercel deployment"
  git push -u origin main
  ```

### 3.2 — CI Pipeline (Optional but Recommended)

- [ ] Verify `.github/workflows/ci.yml` exists (lint + Vitest + Playwright + build)
- [ ] After first push, check GitHub Actions tab → CI should run and pass

---

## Phase 4: Vercel Deployment

### 4.1 — Account & Import

- [ ] Create account at [vercel.com](https://vercel.com) (sign up with GitHub)
- [ ] Click **"Add New..."** → **"Project"**
- [ ] Select your `kharcha` GitHub repository
- [ ] Framework: Next.js (auto-detected)
- [ ] Root directory: `/` (or `kharcha/` if in a monorepo)

### 4.2 — Environment Variables

Add ALL of these in the Vercel dashboard **before clicking Deploy**:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgres://...neon.tech/kharcha?sslmode=require` | Use **pooled** connection string |
| `AUTH_SECRET` | *(from step 1.4)* | |
| `AUTH_URL` | `https://your-project.vercel.app` | Will update after first deploy |
| `GOOGLE_CLIENT_ID` | *(from step 1.2)* | |
| `GOOGLE_CLIENT_SECRET` | *(from step 1.2)* | |
| `SMTP_HOST` | `smtp.gmail.com` | |
| `SMTP_PORT` | `587` | |
| `SMTP_USER` | `your-email@gmail.com` | |
| `SMTP_PASS` | *(16-char app password)* | |
| `EMAIL_FROM` | `Kharcha <your-email@gmail.com>` | |
| `CRON_SECRET` | *(from step 1.4)* | |

- [ ] All 11 env vars added
- [ ] Env vars set for **Production** environment (and optionally Preview/Development)

### 4.3 — First Deploy

- [ ] Click **"Deploy"**
- [ ] Wait for build (~2-3 min)
- [ ] Note your Vercel URL: `https://your-project.vercel.app`

### 4.4 — Post-Deploy URL Updates (Critical)

These must be done immediately after first deploy:

- [ ] **Vercel env vars**: Update `AUTH_URL` to your actual Vercel URL
- [ ] **Google Cloud Console**: Add Vercel URL to OAuth client:
  - Authorized JS origins: `https://your-project.vercel.app`
  - Authorized redirect URIs: `https://your-project.vercel.app/api/auth/callback/google`
- [ ] **Redeploy** from Vercel dashboard: Deployments → latest → `...` → Redeploy

---

## Phase 5: Post-Deployment Verification

### 5.1 — Infrastructure Checks

- [ ] Landing page loads: `https://your-project.vercel.app`
- [ ] Security headers present:
  ```bash
  curl -I https://your-project.vercel.app
  ```
  Expect: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy`
- [ ] Auth providers respond:
  ```bash
  curl https://your-project.vercel.app/api/auth/providers
  ```
  Expect JSON with `google` and `credentials`

### 5.2 — Auth Flows

- [ ] Register with email/password → onboarding wizard appears
- [ ] Log out → log back in with email/password
- [ ] Log out → sign in with Google OAuth
- [ ] Forgot password flow sends email (check inbox)

### 5.3 — Core Features

- [ ] Create categories
- [ ] Add expenses manually
- [ ] Upload a screenshot → OCR processes (may take 20-30s on serverless)
- [ ] Dashboard shows data
- [ ] Analytics charts render
- [ ] Persona page generates persona
- [ ] Budgets page works
- [ ] Income page works
- [ ] Export Excel/CSV downloads correctly
- [ ] Currency switcher works (INR → USD etc.)

### 5.4 — Mobile & UI

- [ ] Mobile responsive layout (test in DevTools or real phone)
- [ ] Dark/light mode toggle
- [ ] Feature tour ("Take a Tour" button on Dashboard)

### 5.5 — Email & Cron

- [ ] Go to `/settings/email` → SMTP status shows "Connected"
- [ ] Send test email from Settings
- [ ] In Vercel dashboard: Settings → Cron Jobs → verify `email-reminder` cron is listed
- [ ] Trigger cron manually: Settings → Cron Jobs → Trigger

### 5.6 — Security

- [ ] Test at [securityheaders.com](https://securityheaders.com/?q=your-project.vercel.app)
- [ ] Rate limiting: try 6 login attempts rapidly → 6th should be blocked
- [ ] Profile → Danger Zone UI visible
- [ ] Verify Neon dashboard: connections < 5 (pooled limit)

---

## Phase 6: Custom Domain (Optional)

- [ ] In Vercel: Settings → Domains → add your domain
- [ ] Configure DNS (CNAME or A record as Vercel instructs)
- [ ] Wait for SSL provisioning (automatic, ~5 min)
- [ ] Update `AUTH_URL` env var to `https://yourdomain.com`
- [ ] Update Google OAuth redirect URIs to `https://yourdomain.com/api/auth/callback/google`
- [ ] Redeploy

---

## Phase 7: Ongoing Maintenance

- [ ] Monitor Neon storage usage (free tier: 512MB)
- [ ] Monitor Vercel usage:
  - Serverless function invocations (Hobby: 100K/month)
  - Bandwidth (Hobby: 100GB/month)
  - Build minutes (Hobby: 6,000 min/month)
- [ ] Cron job runs on 1st of every month at 3:30 AM UTC (9:00 AM IST)
- [ ] Neon DB auto-suspends after 5 min inactivity (cold start ~1-2s on first request)
- [ ] Keep dependencies updated: `npm outdated` → `npm update`

---

## Quick Troubleshooting Reference

| Problem | Fix |
|---------|-----|
| `redirect_uri_mismatch` | Add exact Vercel URL to Google OAuth redirect URIs (no trailing slash) |
| `Function execution timed out` (OCR) | Already configured: 60s max in `vercel.json` |
| `Too many connections` (Neon) | Use the **pooled** connection string (hostname has `-pooler`) |
| `SMTP connection failed` | Verify 2FA enabled, App Password correct (16 chars, no spaces) |
| `sharp` build error | Already handled: `serverExternalPackages: ["sharp"]` in `next.config.ts` |
| `Module not found: better-sqlite3` | Grep codebase — all imports should use `@neondatabase/serverless` |
| Cold start slow | Normal for Neon free tier — first request after inactivity takes ~1-2s |
| Build fails on Vercel | Run `npm run build` locally first to catch errors |

---

## Environment Variables Quick Reference

```bash
# Required (app won't work without these)
DATABASE_URL=postgres://...
AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=https://your-project.vercel.app

# Required for Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Required for email features
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=<16-char app password>
EMAIL_FROM="Kharcha <you@gmail.com>"

# Required for Vercel cron security
CRON_SECRET=<openssl rand -base64 32>
```
