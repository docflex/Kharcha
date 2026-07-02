# Kharcha — Server-Side Cache Strategy

> **Goal:** Reduce Neon Postgres query volume by 60-80% via a two-tier caching layer.
> Neon free tier gives 0.25 vCPU, 191.9 compute hours/month — every query costs real compute.

---

## Current Problem

### Dashboard page load (single visit) fires **7 API calls → ~25+ DB queries**

| API Route                  | DB Queries | Latency (observed) | Notes                                                                     |
| -------------------------- | ---------- | ------------------ | ------------------------------------------------------------------------- |
| `GET /api/user/profile`    | 1          | ~500ms             | Same result on every page load                                            |
| `GET /api/categories`      | 1          | ~350ms             | Changes only on category CRUD                                             |
| `GET /api/analytics`       | 5×         | ~1.7s              | 5 parallel analytics functions, each queries                              |
| `GET /api/analytics/spark` | **12×**    | ~4.5s              | 6 months × 2 queries (expense + income) — **worst offender**              |
| `GET /api/expenses`        | 1          | ~370ms             | Per month, but paginated lists are large                                  |
| `GET /api/forex`           | 7×         | ~3s (cold)         | One DB check per currency (already has DB-level cache, but still queries) |

**Total per page load: ~25 DB queries, ~10s combined latency**

A user navigating Dashboard → Expenses → Analytics → back = **75+ queries** in a single session, mostly redundant.

---

## Two-Tier Cache Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Browser (React Query)                                    │
│  staleTime: 5min — prevents duplicate API calls           │
│  Already implemented ✅                                   │
└──────────────┬───────────────────────────────────────────┘
               │ API calls (only when stale)
┌──────────────▼───────────────────────────────────────────┐
│  Server Cache (NEW — module-scope LRU + TTL)              │
│  Lives in Node.js process memory                          │
│  Survives across requests in same serverless instance     │
│  Evicted on cold start (safe — DB is source of truth)     │
└──────────────┬───────────────────────────────────────────┘
               │ Cache miss only
┌──────────────▼───────────────────────────────────────────┐
│  Neon Postgres (HTTP)                                     │
│  Source of truth — only hit on cache miss or mutation      │
└──────────────────────────────────────────────────────────┘
```

---

## Cache Tiers by Data Type

| Data             | Volatility  | Cache TTL | Invalidation Trigger              | Estimated Hit Rate |
| ---------------- | ----------- | --------- | --------------------------------- | ------------------ |
| **User Profile** | Very Low    | 10 min    | `updateProfile`, `changePassword` | ~95%               |
| **Categories**   | Very Low    | 10 min    | Category CRUD                     | ~98%               |
| **Forex Rates**  | Low (daily) | 24 hours  | Already cached in DB; add memory  | ~99%               |
| **Expenses**     | Medium      | 5 min     | Expense CRUD, upload commit       | ~70%               |
| **Analytics**    | Medium      | 5 min     | Expense CRUD (same month)         | ~80%               |
| **Sparkline**    | Low         | 10 min    | Expense CRUD, income CRUD         | ~90%               |
| **Budgets**      | Low         | 10 min    | Budget CRUD                       | ~95%               |
| **Income**       | Low         | 10 min    | Income CRUD                       | ~95%               |
| **Persona**      | Very Low    | 30 min    | Regeneration only                 | ~99%               |

---

## Implementation Plan

### File: `src/lib/cache/index.ts`

A lightweight, zero-dependency, module-scope cache with:

- **LRU eviction** (max 500 entries to cap memory at ~5MB)
- **TTL per entry** (configurable per data type)
- **User-scoped keys** (no cross-user data leakage)
- **Tag-based invalidation** (e.g., invalidate all keys tagged `["expenses", userId]`)

```typescript
// Key format: "entity:userId:params"
// Examples:
//   "profile:abc123"
//   "categories:abc123"
//   "expenses:abc123:2026:7"
//   "analytics:abc123:2026:7"
//   "sparkline:abc123:6:2026:7"
//   "forex:INR"
```

### API

```typescript
import { cache } from "@/lib/cache";

// Read-through pattern
const profile = await cache.get(
    "profile",
    userId,
    async () => {
        return getProfile(db, userId);
    },
    { ttl: 10 * 60 * 1000 }
); // 10 min

// Invalidate on mutation
cache.invalidate("profile", userId);

// Invalidate by tag (e.g., all expense-related caches for a user)
cache.invalidateByTags(["expenses", userId]);

// Bulk invalidate on expense CRUD
cache.invalidateByTags(["expenses", userId]);
cache.invalidateByTags(["analytics", userId]);
cache.invalidateByTags(["sparkline", userId]);
```

---

## Route-Level Integration

### Reads (cache-first)

| Route                      | Cache Key Pattern                | TTL    | Tags                     |
| -------------------------- | -------------------------------- | ------ | ------------------------ |
| `GET /api/user/profile`    | `profile:{userId}`               | 10 min | `["profile", userId]`    |
| `GET /api/categories`      | `categories:{userId}:{type?}`    | 10 min | `["categories", userId]` |
| `GET /api/expenses`        | `expenses:{userId}:{y}:{m}`      | 5 min  | `["expenses", userId]`   |
| `GET /api/analytics`       | `analytics:{userId}:{y}:{m}`     | 5 min  | `["analytics", userId]`  |
| `GET /api/analytics/spark` | `sparkline:{userId}:{n}:{y}:{m}` | 10 min | `["sparkline", userId]`  |
| `GET /api/budgets`         | `budgets:{userId}`               | 10 min | `["budgets", userId]`    |
| `GET /api/income`          | `income:{userId}:{y?}:{m?}`      | 10 min | `["income", userId]`     |
| `GET /api/persona`         | `persona:{userId}:{y}:{m}`       | 30 min | `["persona", userId]`    |
| `GET /api/forex`           | `forex:{base}`                   | 24 hr  | `["forex"]`              |

### Writes (invalidate related caches)

| Mutation                     | Invalidates Tags                                                         |
| ---------------------------- | ------------------------------------------------------------------------ |
| Create/Update/Delete Expense | `["expenses", userId]`, `["analytics", userId]`, `["sparkline", userId]` |
| Create/Update/Delete Budget  | `["budgets", userId]`, `["analytics", userId]`                           |
| Create/Update/Delete Income  | `["income", userId]`, `["sparkline", userId]`, `["analytics", userId]`   |
| Create/Delete Category       | `["categories", userId]`                                                 |
| Update Profile               | `["profile", userId]`                                                    |
| Upload Commit                | `["expenses", userId]`, `["analytics", userId]`, `["sparkline", userId]` |
| Persona Regeneration         | `["persona", userId]`                                                    |

---

## Sparkline Optimization (High Impact)

The sparkline route is the worst offender: **12 sequential queries** (6 months × 2 tables).

### Fix: Single aggregated query

Replace the N+1 loop with two grouped queries:

```sql
-- Before: 12 queries (one per month per table)
SELECT SUM(amount) FROM expenses WHERE user_id = ? AND year = ? AND month = ?
-- × 6 months × 2 tables = 12 queries

-- After: 2 queries total
SELECT year, month, SUM(amount) as total
FROM expenses
WHERE user_id = ? AND (year, month) IN ((2026,2), (2026,3), ...)
GROUP BY year, month;

SELECT year, month, SUM(amount) as total
FROM monthly_income
WHERE user_id = ? AND (year, month) IN ((2026,2), (2026,3), ...)
GROUP BY year, month;
```

**Impact: 12 queries → 2 queries (83% reduction on this route alone)**

---

## Forex Optimization (High Impact)

Currently: one DB read per currency target (7 queries for 7 currencies).

### Fix: Single batch read

```sql
-- Before: 7 queries
SELECT * FROM forex_rates WHERE base = 'INR' AND target = 'USD';
SELECT * FROM forex_rates WHERE base = 'INR' AND target = 'EUR';
-- ... × 7

-- After: 1 query
SELECT * FROM forex_rates WHERE base = 'INR';
```

Then check freshness in-memory. Only fetch + write back stale entries.

**Impact: 7 queries → 1 query (86% reduction)**

---

## Projected Impact

### Before (per dashboard page load)

| Route      | DB Queries |
| ---------- | ---------- |
| Profile    | 1          |
| Categories | 1          |
| Analytics  | ~5         |
| Sparkline  | 12         |
| Expenses   | 1          |
| Forex      | 7          |
| **Total**  | **~27**    |

### After (warm cache, no mutations)

| Route      | DB Queries | Reason              |
| ---------- | ---------- | ------------------- |
| Profile    | 0          | Cached (10min TTL)  |
| Categories | 0          | Cached (10min TTL)  |
| Analytics  | 0          | Cached (5min TTL)   |
| Sparkline  | 0          | Cached (10min TTL)  |
| Expenses   | 0          | Cached (5min TTL)   |
| Forex      | 0          | Cached (24hr TTL)   |
| **Total**  | **0**      | All served from RAM |

### After (cold cache / first load)

| Route      | DB Queries | Reason                      |
| ---------- | ---------- | --------------------------- |
| Profile    | 1          | Same                        |
| Categories | 1          | Same                        |
| Analytics  | ~5         | Same (but cached for 5 min) |
| Sparkline  | **2**      | Batched (was 12)            |
| Expenses   | 1          | Same                        |
| Forex      | **1**      | Batched (was 7)             |
| **Total**  | **~11**    | **59% fewer cold queries**  |

### Steady-state estimate

With a single active user browsing for 30 minutes:

- **Before:** ~200-300 DB queries
- **After:** ~20-30 DB queries (**~90% reduction**)

---

## Implementation Order

| Step | Task                                               | Priority | Impact                           |
| ---- | -------------------------------------------------- | -------- | -------------------------------- |
| 1    | Create `src/lib/cache/index.ts` (LRU + TTL + tags) | High     | Foundation                       |
| 2    | Batch sparkline queries (12 → 2)                   | High     | -10 queries/load                 |
| 3    | Batch forex queries (7 → 1)                        | High     | -6 queries/load                  |
| 4    | Cache profile + categories (read-through)          | High     | -2 queries/load, nearly 100% hit |
| 5    | Cache analytics + sparkline + expenses             | Medium   | Eliminates repeated loads        |
| 6    | Wire invalidation into all mutation routes         | Medium   | Correctness                      |
| 7    | Cache persona + budgets + income                   | Low      | Less frequently accessed         |

---

## Constraints & Safety

1. **No stale writes** — Cache is read-only. All writes go directly to DB, then invalidate cache.
2. **User isolation** — Every cache key is scoped to `userId`. No cross-user data leakage possible.
3. **Cold start safe** — Module-scope `Map` resets on serverless cold start. DB is always source of truth.
4. **Memory bounded** — LRU with 500-entry cap (~5MB worst case). Entries expire via TTL regardless.
5. **No external dependencies** — Pure JS `Map` + linked list. No Redis, no Upstash, no extra service.
6. **Test-safe** — Cache disabled or bypassed in test environments (`process.env.NODE_ENV === "test"`).

---

## Client-Side Global State (Zustand)

In addition to the server-side cache, a **Zustand store** (`src/stores/app-store.ts`) provides shared UI state across all pages:

| State         | Before                              | After                                      |
| ------------- | ----------------------------------- | ------------------------------------------ |
| Year/Month    | `useState` per page — resets on nav | Zustand — persists across pages            |
| Initial value | `new Date()` or URL search params   | Store value (URL params override on mount) |

### Pages migrated:

- **Dashboard** — `year`, `month` from store
- **Analytics** — `year`, `month` from store (URL params sync on mount)
- **Expenses** — defaults from store, local override for "all months" filter
- **Persona** — `year`, `month` from store, `prevMonth`/`nextMonth` helpers
- **Upload** — `year`, `month` from store for default month selector

### UX improvement:

Navigate Dashboard (July 2026) → Expenses → back to Dashboard = **still shows July 2026** (was: reset to current month).

---

## Non-Goals

- **No Redis/Upstash** — Adds another paid service. Module-scope memory is sufficient for 1-2 active users.
- **No CDN caching** — API routes return user-specific data; CDN caching would require `Vary` headers and adds complexity.
- **No `unstable_cache`** — Next.js data cache is designed for ISR/SSR, not API route response caching. Module-scope is simpler and more predictable.
