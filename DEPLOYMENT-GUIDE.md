# Kharcha — Deployment Guide

> Step-by-step guide to set up all 3rd party services and deploy Kharcha to Vercel.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Neon Postgres Setup](#2-neon-postgres-setup)
3. [Google OAuth Setup](#3-google-oauth-setup)
4. [Gmail App Password Setup](#4-gmail-app-password-setup)
5. [Vercel Deployment](#5-vercel-deployment)
6. [Vercel Cron (Email Scheduler)](#6-vercel-cron-email-scheduler)
7. [Environment Variables Reference](#7-environment-variables-reference)
8. [Post-Deployment Verification](#8-post-deployment-verification)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Prerequisites

- **Node.js 20+** installed locally
- **npm 10+** installed
- **Git** installed
- A **GitHub** account (for Vercel integration)
- A **Google account** (for OAuth + Gmail SMTP)
- Code pushed to a **GitHub repository** (public or private)

---

## 2. Neon Postgres Setup

Neon provides free serverless Postgres with 512MB storage — perfect for this project.

### Step 2.1: Create Account

1. Go to [neon.tech](https://neon.tech)
2. Click "Sign Up" → sign in with GitHub (easiest)
3. You'll land on the Neon Console dashboard

### Step 2.2: Create a Project

1. Click **"New Project"**
2. **Name:** `kharcha`
3. **Region:** Choose closest to your users (e.g., `ap-south-1` for India, `us-east-1` for US)
4. **Postgres version:** 16 (default)
5. Click **"Create Project"**

### Step 2.3: Get Connection String

1. After project creation, you'll see a connection dialog
2. Select **"Pooled connection"** (better for serverless)
3. Copy the connection string. It looks like:
    ```
    postgres://username:password@ep-xyz-123.region.aws.neon.tech/kharcha?sslmode=require
    ```
4. **Save this** — you'll need it for `DATABASE_URL`

### Step 2.4: Create a Branch for Development (Optional)

Neon supports database branching (like git branches):

1. Go to **Branches** in the sidebar
2. Click **"Create Branch"**
3. Name: `dev`
4. This gives you an isolated copy of your DB for local development
5. Get the dev branch connection string separately

### Step 2.5: Configure Locally

In your `.env.local`:

```env
DATABASE_URL=postgres://username:password@ep-xyz-123.region.aws.neon.tech/kharcha?sslmode=require
```

### Step 2.6: Push Schema

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/push-schema.mjs
```

This creates all 14 tables and indexes in your Neon database. The script uses the HTTP-based Neon driver (no WebSocket/`ws` dependency needed).

> **Note:** `drizzle-kit push` may hang due to WebSocket issues in corporate/restricted networks. The `push-schema.mjs` script bypasses this by using Neon's HTTP API.

### Step 2.7: Seed Data (Optional)

If you have historical data to import:

```bash
npx tsx --tsconfig tsconfig.json scripts/ingest-excel.ts
npx node scripts/ingest-paystubs.cjs
```

---

## 3. Google OAuth Setup

### Step 3.1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click the project dropdown (top-left) → **"New Project"**
3. **Name:** `Kharcha`
4. Click **"Create"**
5. Make sure the new project is selected in the dropdown

### Step 3.2: Enable OAuth Consent Screen

1. In the sidebar: **APIs & Services** → **OAuth consent screen**
2. Click **"Get started"** (or "Configure consent screen")
3. **App name:** `Kharcha`
4. **User support email:** your email
5. **Audience:** External (if you want anyone to sign in) or Internal (if only your Google Workspace)
6. Click **"Create"**

### Step 3.3: Add Scopes

1. After creating, go to **"Data Access"** (or Scopes)
2. Add scopes:
    - `openid`
    - `email`
    - `profile`
3. Click **"Save"**

### Step 3.4: Create OAuth Credentials

1. **APIs & Services** → **Credentials**
2. Click **"+ Create Credentials"** → **"OAuth client ID"**
3. **Application type:** Web application
4. **Name:** `Kharcha Web`
5. **Authorized JavaScript origins:**
    - `http://localhost:3000` (for local dev)
    - `https://your-app.vercel.app` (your Vercel URL — add after deployment)
6. **Authorized redirect URIs:**
    - `http://localhost:3000/api/auth/callback/google`
    - `https://your-app.vercel.app/api/auth/callback/google`
7. Click **"Create"**
8. **Copy** the Client ID and Client Secret

### Step 3.5: Configure Locally

In your `.env.local`:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

### Step 3.6: Publish the App (Required for External Users)

1. Go to **OAuth consent screen** → **"Audience"** (or Publishing status)
2. Click **"Publish App"**
3. This moves it from "Testing" (limited to 100 test users) to "In production"
4. For personal use, Google won't require verification

---

## 4. Gmail App Password Setup

Gmail SMTP is used for sending email notifications. Requires a Google App Password.

### Step 4.1: Enable 2-Step Verification

1. Go to [myaccount.google.com/security](https://myaccount.google.com/security)
2. Under "How you sign in to Google", click **"2-Step Verification"**
3. Follow the setup process (phone/authenticator)
4. **This is required** — App Passwords only work with 2FA enabled

### Step 4.2: Generate App Password

1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
    - If you don't see this page, search "App Passwords" in your Google Account settings
2. **App name:** `Kharcha`
3. Click **"Create"**
4. Google generates a **16-character password** (e.g., `abcd efgh ijkl mnop`)
5. **Copy this immediately** — you won't see it again

### Step 4.3: Configure Locally

In your `.env.local`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=abcdefghijklmnop
EMAIL_FROM="Kharcha <your-email@gmail.com>"
```

### Step 4.4: Verify Connection

1. Start the dev server: `npm run dev`
2. Go to `/settings/email`
3. The SMTP status card should show "Connected"
4. Click "Send Test Email" to verify

---

## 5. Vercel Deployment

### Step 5.1: Push Code to GitHub

```bash
git add -A
git commit -m "Phase 7: Ready for Vercel deployment"
git push origin main
```

### Step 5.2: Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Sign up with **GitHub** (recommended for auto-deploy)

### Step 5.3: Import Project

1. Click **"Add New..."** → **"Project"**
2. Select your GitHub repository (`kharcha`)
3. Vercel auto-detects Next.js
4. **Framework Preset:** Next.js (auto-detected)
5. **Root Directory:** leave as `/` (or set to `kharcha/` if it's in a subdirectory)

### Step 5.4: Configure Environment Variables

Before deploying, add all env vars in the Vercel dashboard:

| Variable               | Value                                                     |
| ---------------------- | --------------------------------------------------------- |
| `DATABASE_URL`         | Your Neon connection string                               |
| `AUTH_SECRET`          | Generate: `openssl rand -base64 32`                       |
| `AUTH_URL`             | `https://your-app.vercel.app` (update after first deploy) |
| `GOOGLE_CLIENT_ID`     | From Google Cloud Console                                 |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console                                 |
| `SMTP_HOST`            | `smtp.gmail.com`                                          |
| `SMTP_PORT`            | `587`                                                     |
| `SMTP_USER`            | Your Gmail address                                        |
| `SMTP_PASS`            | Your 16-char App Password                                 |
| `EMAIL_FROM`           | `Kharcha <your-email@gmail.com>`                          |
| `CRON_SECRET`          | Generate: `openssl rand -base64 32`                       |

### Step 5.5: Deploy

1. Click **"Deploy"**
2. Wait for build to complete (~2-3 minutes)
3. Your app is live at `https://your-project.vercel.app`

### Step 5.6: Update Auth URL

After the first deployment:

1. Go to **Settings** → **Environment Variables**
2. Update `AUTH_URL` to your actual Vercel URL
3. Go to Google Cloud Console → update redirect URIs with your Vercel URL
4. Redeploy: **Deployments** → **...** → **Redeploy**

### Step 5.7: Configure Custom Domain (Optional)

1. In Vercel: **Settings** → **Domains**
2. Add your domain (e.g., `kharcha.yourdomain.com`)
3. Update DNS records as instructed by Vercel
4. Update `AUTH_URL`, Google OAuth redirect URIs

---

## 6. Vercel Cron (Email Scheduler)

Replaces `node-cron` for production. Free tier: 2 cron jobs.

### Step 7.1: Configure vercel.json

Already configured in the codebase:

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

This runs on the 1st of every month at 3:30 AM UTC (9:00 AM IST).

### Step 7.2: Verify

After deployment:

1. Go to Vercel dashboard → **Settings** → **Cron Jobs**
2. You should see the configured cron
3. Click **"Trigger"** to test manually

### Step 7.3: Security

The cron endpoint verifies the `CRON_SECRET` header to prevent unauthorized triggers:

```
Authorization: Bearer <CRON_SECRET>
```

---

## 7. Environment Variables Reference

| Variable               | Required         | Where Used             | Example                                        |
| ---------------------- | ---------------- | ---------------------- | ---------------------------------------------- |
| `DATABASE_URL`         | Yes              | DB connection          | `postgres://user:pass@host/db?sslmode=require` |
| `AUTH_SECRET`          | Yes              | NextAuth JWT signing   | `openssl rand -base64 32`                      |
| `AUTH_URL`             | Yes              | NextAuth callback URLs | `https://kharcha.vercel.app`                   |
| `GOOGLE_CLIENT_ID`     | Yes (for OAuth)  | Google sign-in         | `123...apps.googleusercontent.com`             |
| `GOOGLE_CLIENT_SECRET` | Yes (for OAuth)  | Google sign-in         | `GOCSPX-...`                                   |
| `SMTP_HOST`            | No               | Email sending          | `smtp.gmail.com`                               |
| `SMTP_PORT`            | No               | Email sending          | `587`                                          |
| `SMTP_USER`            | No               | Email sending          | `you@gmail.com`                                |
| `SMTP_PASS`            | No               | Email sending          | `abcdefghijklmnop`                             |
| `EMAIL_FROM`           | No               | Email from address     | `Kharcha <you@gmail.com>`                      |
| `CRON_SECRET`          | No (Vercel only) | Cron auth              | `openssl rand -base64 32`                      |

---

> **Note:** Vercel Blob (`BLOB_READ_WRITE_TOKEN`) is **not needed**. Uploaded screenshots are processed in-memory via OCR and never stored to disk or blob storage. Only the extracted text and expense data are persisted to the database.

---

## 8. Post-Deployment Verification

After deploying, verify everything works:

### Checklist

- [ ] Landing page loads at root URL
- [ ] Google OAuth sign-in works
- [ ] Email/password registration works
- [ ] Onboarding wizard triggers for new users
- [ ] Dashboard loads with data (or empty state)
- [ ] Upload page accepts screenshots
- [ ] OCR processes successfully (may be slower on Vercel — up to 30s)
- [ ] Expenses CRUD works
- [ ] Analytics charts render
- [ ] Persona generates correctly
- [ ] Export downloads work (Excel/CSV)
- [ ] Email settings page shows SMTP status
- [ ] Dark/light mode toggle works
- [ ] Mobile responsive layout works
- [ ] Currency selector works
- [ ] Security headers present (check via [securityheaders.com](https://securityheaders.com))

### Quick Smoke Test

```bash
# Test the deployed URL
curl -I https://your-app.vercel.app
# Should see 200 OK with security headers

curl https://your-app.vercel.app/api/auth/providers
# Should return Google + Credentials providers
```

---

## 9. Troubleshooting

### "Module not found: better-sqlite3"

You're still importing SQLite. Make sure the Neon migration is complete and no imports of `better-sqlite3` remain.

### "Function execution timed out" (OCR)

Tesseract.js can be slow on serverless. In `vercel.json`, increase max duration:

```json
{
    "functions": {
        "src/app/api/uploads/[id]/process/route.ts": {
            "maxDuration": 60
        }
    }
}
```

### "Too many connections" (Neon)

Use the **pooled** connection string (with `-pooler` in the hostname). Neon's free tier allows 5 concurrent connections.

### Google OAuth "redirect_uri_mismatch"

Make sure the redirect URI in Google Cloud Console **exactly** matches:
`https://your-app.vercel.app/api/auth/callback/google`
(no trailing slash, correct protocol).

### "SMTP connection failed"

1. Verify 2FA is enabled on your Google account
2. Verify the App Password is correct (16 chars, no spaces)
3. Some networks block port 587 — try port 465 with `secure: true`

### Build fails with "sharp" error

Vercel natively supports sharp. If issues arise, add to `next.config.ts`:

```typescript
experimental: {
    serverComponentsExternalPackages: ['sharp'],
}
```
