---
description: Create a new service module with test-first approach and correct DB patterns
---

## New Service Checklist

### Required patterns

1. **Type the DB parameter** — services accept `db` as a parameter (NOT import the singleton):

```typescript
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "../db/schema";
type DB = BetterSQLite3Database<typeof schema>;

export async function myFunction(db: DB, userId: string, ...) {
    // This allows in-memory test DBs to be injected
}
```

2. **Write the test FIRST** — use the shared test DB helper:

```typescript
// @vitest-environment node
import { createTestDb, seedTestUser, seedTestCategory } from "@/lib/db/test-utils";

let testDb: ReturnType<typeof createTestDb>;
let userId: string;

beforeAll(async () => {
    testDb = createTestDb();
    userId = await seedTestUser(testDb.db);
});

afterAll(() => testDb.cleanup());

it("does the thing", async () => {
    const result = await myFunction(testDb.db, userId, ...);
    expect(result).toBeDefined();
});
```

3. **Place files correctly**:
    - Service: `src/lib/services/<name>-service.ts`
    - Test: `tests/integration/api/<name>.test.ts` (or `tests/integration/<name>.test.ts`)

4. **Always scope by userId** — every query must filter by `userId` for multi-tenant safety.

5. **Use `crypto.randomUUID()` or `uuid()` for IDs** — SQLite uses TEXT primary keys, not auto-increment.

### After writing

// turbo 6. Run the new test:

```bash
npx vitest run tests/integration/
```

// turbo 7. Format:

```bash
npm run format
```
