---
description: Create a new Next.js 16 API route with correct patterns (async params, auth, error handling)
---

## New API Route Checklist

### Before writing any code

1. Read the Next.js 16 route handler docs (APIs may differ from training data):

```bash
cat node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md
```

### Patterns to follow

2. Every route handler file must use these conventions:

**Auth guard** (all protected routes):

```typescript
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    // ...
}
```

**Dynamic route params are Promises in Next.js 16** — MUST await:

```typescript
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    // ...
}
```

**Error handling** — prefix unused catch var with `_`:

```typescript
} catch (_error) {
    return Response.json({ error: "Failed to ..." }, { status: 500 });
}
```

**Response format** — always wrap in `{ data: ... }` or `{ error: ... }`:

```typescript
return Response.json({ data: result });
return Response.json({ data: result }, { status: 201 });
return Response.json({ error: "Not found" }, { status: 404 });
```

### After writing

3. Run lint on the new file:
   // turbo

```bash
npx eslint src/app/api/
```

4. Run format on the new file:
   // turbo

```bash
npm run format
```
