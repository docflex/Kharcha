# Kharcha Cache Architecture — Yearly Snapshot Design

## Problem Statement

Every page refresh triggers 4-6 API calls, each hitting Neon DB over a corporate proxy (600ms–3s per query). Total dashboard load: **5-10 seconds**. For a single-user personal tracker with ~1MB/year of data, this is absurd.

### Current flow (bad)

```
Page Refresh
  → React Query memory cache: EMPTY (lost on refresh)
  → API calls fire: analytics, sparkline, profile, categories, forex
  → Server LRU cache: often expired (5-min TTL)
  → Neon DB: 4-6 round trips × 1-3s each = 5-10s total
```

### Desired flow (good)

```
Page Refresh
  → React Query restores from localStorage: INSTANT render
  → Background version check: single lightweight DB query
  → If version unchanged: done, no further DB hits
  → If version bumped: fetch only changed data, merge into cache
```

---

## Design Principles

1. **The client IS the cache.** DB is just persistence.
2. **Single-user, single-device.** No multi-device sync, no cross-user cache invalidation.
3. **Eventual consistency.** Client can be stale for seconds; conflicts are resolved on next sync.
4. **Yearly granularity.** Expenses are immutable-ish per month. A "year snapshot" covers 12 months of expenses, income, categories, budgets.
5. **Write-through.** Every mutation persists to DB AND patches local cache. No refetch needed.

---

## Architecture: Three-Layer Cache

### Layer 1: Client (React Query + localStorage)

- **Persistence**: `@tanstack/react-query-persist-client` + `createSyncStoragePersister`
- **Max age**: 7 days (re-hydrate on every page load)
- **staleTime**: Historical months = `Infinity` (past months never change unless manual edit). Current month = 30 minutes.
- **On refresh**: Instant render from localStorage, then background version check.
- **Buster**: A `dataVersion` number stored alongside. If server's version is higher → refetch.

### Layer 2: Server (LRU in-memory)

- **TTL boost**: `SHORT: 5min → 4hrs`, `MEDIUM: 10min → 8hrs`, `LONG: 30min → 24hrs`
- **Version-gated**: Each cache entry stores `dataVersion`. If user mutates, entries are invalidated.
- **Cold start**: First request after deploy fetches from DB. All subsequent requests served from memory.

### Layer 3: Database (Neon Postgres)

- **Source of truth.** Always consistent.
- **Hit frequency target**: Cold start only + writes + daily background sync.

---

## Version Tracking

### Schema change

```sql
ALTER TABLE users ADD COLUMN data_version INTEGER NOT NULL DEFAULT 0;
```

### Bump on every write

Every mutation (create/update/delete expense, income, category, budget) increments `data_version`:

```sql
UPDATE users SET data_version = data_version + 1 WHERE id = $userId;
```

### Version check endpoint

```
GET /api/version
Response: { "version": 42 }
```

Single-column SELECT on primary key — sub-10ms even on Neon.

### Client flow

```
1. Page loads → restore React Query from localStorage
2. Render immediately with stale data
3. Background: fetch /api/version
4. Compare with locally stored version
5. If equal → done, no further fetches
6. If server > local → invalidate stale queries, refetch
```

---

## Yearly Snapshot API

### Endpoint

```
GET /api/snapshot?year=2026
```

### Response

```json
{
  "data": {
    "year": 2026,
    "version": 42,
    "expenses": [...],       // All expenses for year
    "income": [...],         // All income entries for year
    "categories": [...],     // All categories (global, not per-year)
    "budgets": [...]         // All active budgets
  }
}
```

### Server implementation

```typescript
// Single DB call with parallel queries
const [expenses, income, categories, budgets] = await Promise.all([
    getExpenses(db, userId, { year }),
    getIncome(db, userId, { year }),
    getCategories(db, userId),
    getBudgets(db, userId),
]);
```

### Cache strategy

- Server caches for 24 hours with tag `["snapshot", userId, String(year)]`
- Client caches with `staleTime: Infinity` for past years, `staleTime: 30 * 60 * 1000` for current year
- Invalidated on any write via version bump

---

## Client-Side Analytics Computation

Currently, analytics are computed server-side by 5 parallel DB queries. With the snapshot cached client-side, we can compute them locally:

### Move to client-side

- `getMonthSummary()` → filter snapshot.expenses by month, group by category
- `getMoMComparison()` → diff current vs previous month from snapshot
- `calculateSavings()` → sum income - sum expenses from snapshot
- `getBudgetOverview()` → compare expense totals to budget limits
- `getTopCategories()` → sort categories by total amount

### Keep server-side (for now)

- Persona generation (complex logic, rarely called)
- Forex rates (external API)
- Email sending

### Impact

- Dashboard load: 0 API calls (all computed from cached snapshot)
- Month navigation: 0 API calls (just re-filter the snapshot)
- Only the initial snapshot load hits the DB

---

## Write-Through Mutations

### Current pattern (refetch after write)

```typescript
onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
    queryClient.invalidateQueries({ queryKey: ["analytics"] });
    queryClient.invalidateQueries({ queryKey: ["sparkline"] });
};
```

Each invalidation triggers a refetch → 3 DB round trips.

### New pattern (patch in place)

```typescript
onSuccess: (newExpense) => {
    // 1. Patch snapshot in React Query cache
    queryClient.setQueryData(["snapshot", year], (old) => ({
        ...old,
        expenses: [...old.expenses, newExpense],
        version: old.version + 1,
    }));

    // 2. Recompute derived data locally
    queryClient.invalidateQueries({ queryKey: ["analytics"] });
    // analytics hook re-runs, computing from updated snapshot — no API call

    // 3. Update localStorage version
    localStorage.setItem("kharcha:version", String(old.version + 1));
};
```

### Delete pattern

```typescript
onMutate: async (id) => {
    // Optimistic: remove from snapshot immediately
    queryClient.setQueryData(["snapshot", year], (old) => ({
        ...old,
        expenses: old.expenses.filter(e => e.id !== id),
    }));
},
onError: () => {
    // Rollback: restore snapshot from previous value
},
onSettled: () => {
    // No refetch needed — snapshot is already updated
}
```

---

## Conflict Resolution

Since this is single-user, single-device, conflicts are rare. But they can happen:

- Tab left open overnight, user logs in on phone (hypothetical future)
- Serverless cold start drops server cache while client has stale data

### Resolution strategy

1. **Version wins.** Server version is authoritative.
2. **On version mismatch**, client does a full snapshot refetch (one DB call).
3. **No partial merges.** The snapshot is small (~1MB/year). Full replace is fast and correct.
4. **No offline support.** If offline, mutations fail. We don't queue writes.

---

## Implementation Plan

### Phase 1: Quick wins (immediate impact, low risk)

1. Boost server TTLs in `src/lib/cache/index.ts`
2. Add React Query `persistQueryClient` with localStorage in `query-provider.tsx`
3. Increase `staleTime` for historical data in hooks

### Phase 2: Version tracking

1. Add `data_version` column to users table
2. Create `/api/version` endpoint
3. Bump version on every mutation (in all write API routes)
4. Client-side version check on mount

### Phase 3: Yearly snapshot

1. Create `/api/snapshot` endpoint
2. Create `useSnapshot(year)` hook
3. Refactor dashboard/analytics/expenses pages to use snapshot
4. Compute analytics client-side from snapshot
5. Remove redundant per-entity API calls from pages that use snapshot

### Phase 4: Write-through mutations

1. Refactor all mutation hooks to patch snapshot in place
2. Remove `invalidateQueries` calls for refetch-based invalidation
3. Add optimistic updates for all delete operations

---

## Expected Impact

| Metric                  | Before                  | After                            |
| ----------------------- | ----------------------- | -------------------------------- |
| Dashboard load (warm)   | 2-5s                    | **<100ms** (from localStorage)   |
| Dashboard load (cold)   | 5-10s                   | **1-2s** (single snapshot fetch) |
| Month navigation        | 1-3s                    | **0ms** (client-side filter)     |
| DB queries per refresh  | 4-6                     | **0** (version check only)       |
| DB queries per mutation | 4-7 (write + refetches) | **2** (write + version bump)     |
| Data freshness          | Real-time               | Eventual (seconds)               |

---

## Files to Create/Modify

### New files

- `src/app/api/snapshot/route.ts` — yearly snapshot endpoint
- `src/app/api/version/route.ts` — version check endpoint
- `src/hooks/use-snapshot.ts` — snapshot hook + client-side analytics
- `src/lib/utils/client-analytics.ts` — analytics computation from snapshot

### Modified files

- `src/lib/db/schema.ts` — add `dataVersion` column
- `src/lib/cache/index.ts` — boost TTLs
- `src/providers/query-provider.tsx` — add persistence
- `src/hooks/use-analytics.ts` — switch to snapshot-based
- `src/hooks/use-expenses.ts` — write-through mutations
- `src/hooks/use-income.ts` — write-through mutations
- `src/hooks/use-categories.ts` — write-through mutations
- `src/hooks/use-budgets.ts` — write-through mutations
- All write API routes — add `data_version` bump

### Migration

- `ALTER TABLE users ADD COLUMN data_version INTEGER NOT NULL DEFAULT 0`
