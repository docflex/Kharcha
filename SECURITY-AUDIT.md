# Kharcha — Security Audit Report

> **Audit Date:** July 1, 2026
> **Scope:** Full application audit — auth, API, data, headers, dependencies
> **Baseline:** Phase 6 codebase (593 Vitest + 23 Playwright tests)

---

## Executive Summary

Kharcha has a **solid security foundation**: auth guards on all 26 API handlers, bcrypt password hashing (cost 12), Zod input validation, Drizzle ORM (prevents SQL injection), and userId-scoped queries for data isolation.

However, there are **critical gaps** that need remediation before production deployment:

- No rate limiting on any endpoint (brute-force risk)
- No security headers configured
- No session invalidation on password change
- No forgot password flow (forces manual recovery)
- File upload validation is incomplete

This document details all findings and the remediation plan implemented in Phase 7.

---

## OWASP Top 10 Assessment

### A01: Broken Access Control — ✅ PASS

| Check                          | Status | Notes                                                |
| ------------------------------ | ------ | ---------------------------------------------------- |
| Auth guard on all API routes   | ✅     | All 26 handlers check `session?.user?.id`            |
| userId scoping on all queries  | ✅     | Drizzle queries filter by `eq(table.userId, userId)` |
| Cross-user data isolation      | ✅     | 20 dedicated isolation tests                         |
| Cascade delete on user removal | ✅     | FK constraints with ON DELETE CASCADE                |
| Admin-only endpoints           | N/A    | No admin functionality exists                        |
| Path traversal                 | ✅     | File paths are server-generated UUIDs                |

### A02: Cryptographic Failures — ✅ PASS

| Check                  | Status | Notes                                          |
| ---------------------- | ------ | ---------------------------------------------- |
| Password hashing       | ✅     | bcryptjs cost 12                               |
| JWT signing            | ✅     | AUTH_SECRET from env                           |
| Secrets in code        | ✅     | All secrets in `.env.local` (gitignored)       |
| HTTPS in production    | ✅     | Vercel enforces HTTPS                          |
| Sensitive data in logs | ⚠️     | Need audit — verify no passwords/tokens logged |

### A03: Injection — ✅ PASS

| Check             | Status | Notes                                            |
| ----------------- | ------ | ------------------------------------------------ |
| SQL injection     | ✅     | Drizzle ORM uses parameterized queries           |
| NoSQL injection   | N/A    | No NoSQL used                                    |
| XSS (stored)      | ✅     | React auto-escapes, no `dangerouslySetInnerHTML` |
| XSS (reflected)   | ✅     | No URL params rendered without escaping          |
| Command injection | ✅     | No shell commands executed                       |

### A04: Insecure Design — 🟡 NEEDS WORK

| Finding                   | Severity  | Remediation                                 |
| ------------------------- | --------- | ------------------------------------------- |
| No rate limiting on login | 🔴 High   | Phase 7.6.1: Rate limiter middleware        |
| No account lockout        | 🟡 Medium | Phase 7.6.1: 10 failed attempts → lock      |
| No forgot password        | 🟡 Medium | Phase 7.5.5: Email-based reset flow         |
| Weak password policy      | 🟡 Medium | Phase 7.6.3: Complexity requirements        |
| No session invalidation   | 🔴 High   | Phase 7.6.4: Invalidate on password change  |
| Sign-out via GET          | 🟡 Medium | Phase 7.6.7: Switch to POST via `signOut()` |

### A05: Security Misconfiguration — 🟡 NEEDS WORK

| Finding                              | Severity  | Remediation                                  |
| ------------------------------------ | --------- | -------------------------------------------- |
| No Content-Security-Policy           | 🟡 Medium | Phase 7.6.2: Add CSP header                  |
| No X-Frame-Options                   | 🟡 Medium | Phase 7.6.2: DENY                            |
| No X-Content-Type-Options            | 🟢 Low    | Phase 7.6.2: nosniff                         |
| No Referrer-Policy                   | 🟢 Low    | Phase 7.6.2: strict-origin-when-cross-origin |
| No Permissions-Policy                | 🟢 Low    | Phase 7.6.2: Disable unused features         |
| Default error pages expose framework | 🟢 Low    | Custom 404/500 pages exist                   |

### A06: Vulnerable and Outdated Components — ❓ NEEDS AUDIT

Run `npm audit` and remediate:

```bash
npm audit
npm audit fix
```

**Action items:**

- [ ] Run `npm audit` and fix all high/critical vulnerabilities
- [ ] Update any packages with known CVEs
- [ ] Pin dependency versions in `package.json`

### A07: Identification and Authentication Failures — 🟡 NEEDS WORK

| Finding                             | Severity  | Remediation                            |
| ----------------------------------- | --------- | -------------------------------------- |
| No brute-force protection           | 🔴 High   | Rate limiting (7.6.1)                  |
| No MFA option                       | 🟢 Low    | Google OAuth provides MFA via Google   |
| Weak password policy                | 🟡 Medium | Complexity requirements (7.6.3)        |
| Session doesn't expire              | 🟢 Low    | NextAuth JWT has default 30-day expiry |
| OAuth user can access password form | 🟡 Medium | Hide form for OAuth-only users (7.6.8) |

### A08: Software and Data Integrity Failures — ✅ PASS

| Check            | Status | Notes                              |
| ---------------- | ------ | ---------------------------------- |
| Input validation | ✅     | Zod schemas on all API inputs      |
| File integrity   | ⚠️     | Need magic byte validation (7.6.6) |
| CI/CD integrity  | ✅     | GitHub → Vercel pipeline           |

### A09: Security Logging and Monitoring Failures — 🟡 NEEDS WORK

| Finding                       | Severity  | Remediation                      |
| ----------------------------- | --------- | -------------------------------- |
| No audit logging              | 🟡 Medium | Phase 7.6.5: audit_log table     |
| No failed login logging       | 🟡 Medium | Phase 7.6.5: Log failed attempts |
| No suspicious activity alerts | 🟢 Low    | Out of scope for Phase 7         |
| Email send logging            | ✅        | email_log table exists           |

### A10: Server-Side Request Forgery (SSRF) — ✅ PASS

| Check                | Status | Notes                                     |
| -------------------- | ------ | ----------------------------------------- |
| Outbound requests    | ✅     | Only to Frankfurter API (forex) and SMTP  |
| User-controlled URLs | N/A    | No user-supplied URLs fetched server-side |

---

## Detailed Findings

### Finding 1: No Rate Limiting (CRITICAL)

**Location:** All API routes in `src/app/api/`

**Risk:** An attacker can:

- Brute-force login credentials (unlimited attempts)
- Flood any API endpoint (DoS)
- Enumerate valid email addresses via registration/login response differences

**Current state:** Zero rate limiting on any endpoint.

**Remediation (Phase 7.6.1):**

```
Login: 5 attempts / 15 minutes per IP
API: 100 requests / minute per authenticated user
Registration: 3 attempts / hour per IP
```

Implementation: In-memory sliding window counter in `src/lib/middleware/rate-limit.ts`, applied via Next.js middleware.

**Verification test:** `tests/integration/api/rate-limiting.test.ts`

---

### Finding 2: Missing Security Headers (MEDIUM)

**Location:** `next.config.ts` — no `headers()` config

**Risk:**

- Clickjacking (no X-Frame-Options)
- MIME sniffing attacks (no X-Content-Type-Options)
- Script injection (no CSP)
- Information leakage (no Referrer-Policy)

**Remediation (Phase 7.6.2):** Add headers in `next.config.ts`.

**Verification:** Check headers with `curl -I` or [securityheaders.com](https://securityheaders.com).

---

### Finding 3: No Session Invalidation on Password Change (HIGH)

**Location:** `src/app/api/user/password/route.ts`

**Risk:** After a user changes their password (possibly because of compromise), all existing sessions remain valid. An attacker with a stolen session can continue accessing the account.

**Current state:** Password change updates bcrypt hash but doesn't invalidate active JWT sessions.

**Remediation (Phase 7.6.4):** Add `passwordChangedAt` column to `users` table. In the NextAuth JWT callback, compare `token.iat` against `user.passwordChangedAt`. Reject tokens issued before the password change.

---

### Finding 4: Sign-Out via GET Request (MEDIUM)

**Location:** `src/components/layout/sidebar.tsx:262`

```typescript
window.location.href = "/api/auth/signout";
```

**Risk:** CSRF — an attacker can embed `<img src="/api/auth/signout">` in a page to force sign-out. Low severity (no data loss) but poor practice.

**Remediation (Phase 7.6.7):** Use `signOut()` from `next-auth/react` which issues a POST request with CSRF token.

---

### Finding 5: File Upload Validation Incomplete (MEDIUM)

**Location:** `src/lib/services/upload-service.ts`

**Risk:** A malicious file with a `.png` extension but containing executable content could be stored. While the server doesn't execute uploads, it's a defense-in-depth concern.

**Current state:** Checks file extension and size limit (10MB). Does NOT validate file content (magic bytes).

**Remediation (Phase 7.6.6):**

```
PNG magic bytes: 89 50 4E 47 (first 4 bytes)
JPEG magic bytes: FF D8 FF (first 3 bytes)
PDF magic bytes: 25 50 44 46 (first 4 bytes)
```

Reject any file whose content doesn't match its claimed type.

---

### Finding 6: Weak Password Policy (MEDIUM)

**Location:** `src/lib/utils/validators.ts`

**Current policy:** Minimum 8 characters. No complexity requirements.

**Risk:** Weak passwords are easily guessed or cracked.

**Remediation (Phase 7.6.3):**

```
Minimum 8 characters
At least 1 uppercase letter
At least 1 lowercase letter
At least 1 digit
At least 1 special character (!@#$%^&*...)
```

Add password strength indicator UI component on registration and password change forms.

---

### Finding 7: OAuth User Password Edge Case (MEDIUM)

**Location:** `src/app/(app)/settings/profile/page.tsx`

**Risk:** A user who registered via Google OAuth has no password hash. The password change form appears for them, and the API may behave unexpectedly.

**Remediation (Phase 7.6.8):**

- Profile API returns `hasPassword: boolean` field
- UI hides password change form for OAuth-only users
- Shows "Signed in via Google" badge instead
- API returns `400` if OAuth user attempts password change

---

### Finding 8: No Audit Logging (MEDIUM)

**Location:** N/A — no audit logging exists

**Risk:** Cannot trace security-relevant actions for incident response.

**Remediation (Phase 7.6.5):**

New table `audit_log`:

```sql
CREATE TABLE audit_log (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

Actions to log:

- `password_change` — user changed password
- `profile_update` — user updated profile
- `data_export` — user downloaded data
- `data_delete` — user deleted all data
- `account_delete` — user deleted account
- `login_failed` — failed login attempt (log email + IP)
- `login_success` — successful login (log IP)

---

## Items Already Secure (No Action Needed)

| Item                     | Implementation                                    |
| ------------------------ | ------------------------------------------------- |
| SQL injection prevention | Drizzle ORM parameterized queries                 |
| XSS prevention           | React auto-escaping, no `dangerouslySetInnerHTML` |
| CSRF on mutations        | NextAuth handles CSRF tokens on auth routes       |
| Password hashing         | bcryptjs cost 12                                  |
| Data isolation           | userId scoping + 20 isolation tests               |
| HTTPS                    | Vercel enforces TLS                               |
| Secret management        | `.env.local` (gitignored), env vars in Vercel     |
| Input validation         | Zod schemas on all API endpoints                  |
| Auth on all routes       | `auth()` guard on all 26 handlers                 |

---

## Risk Acceptance

The following low-severity items are **accepted** and NOT addressed in Phase 7:

| Item                                   | Reason                                                      |
| -------------------------------------- | ----------------------------------------------------------- |
| No MFA beyond Google OAuth             | Personal app, 2 users. Google provides MFA.                 |
| No IP-based suspicious activity alerts | Over-engineering for personal use. Audit log is sufficient. |
| No data retention policy               | Users manage their own data. "Delete Account" covers this.  |
| No penetration testing                 | Cost prohibitive for a personal project.                    |
| SQLite file permissions (dev)          | Moving to Neon Postgres eliminates this.                    |

---

## Remediation Summary

| Phase 7 Step | Security Finding          | Status       |
| ------------ | ------------------------- | ------------ |
| 7.6.1        | Rate limiting             | To implement |
| 7.6.2        | Security headers          | To implement |
| 7.6.3        | Password policy           | To implement |
| 7.6.4        | Session invalidation      | To implement |
| 7.6.5        | Audit logging             | To implement |
| 7.6.6        | File upload validation    | To implement |
| 7.6.7        | Sign-out via POST         | To implement |
| 7.6.8        | OAuth user password guard | To implement |
