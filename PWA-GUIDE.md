# Kharcha → PWA Conversion Guide

> Turn the existing Next.js app into an installable Progressive Web App.

---

## Prerequisites

- App is deployed on Vercel (HTTPS required for service workers)
- Node 20+, npm 11+

---

## Tier 1 — Basic Installable PWA (~1.5 hours)

### 1.1 Install `@serwist/next`

```bash
npm install @serwist/next serwist
```

`@serwist/next` is the actively maintained successor to `next-pwa`. It auto-generates a service worker and precaches the app shell.

### 1.2 Create App Icons

Generate from the existing logo or create new ones. You need at minimum:

| File                                | Size    | Purpose                  |
| ----------------------------------- | ------- | ------------------------ |
| `public/icons/icon-192.png`         | 192×192 | Android home screen      |
| `public/icons/icon-512.png`         | 512×512 | Android splash / install |
| `public/icons/apple-touch-icon.png` | 180×180 | iOS home screen          |
| `public/icons/favicon.ico`          | 32×32   | Browser tab              |

Tools: [realfavicongenerator.net](https://realfavicongenerator.net) or [pwa-asset-generator](https://github.com/nicedoc/pwa-asset-generator).

### 1.3 Create `public/manifest.json`

```json
{
    "name": "Kharcha — Expense Tracker",
    "short_name": "Kharcha",
    "description": "Track expenses, income, and spending patterns with OCR-powered uploads",
    "start_url": "/dashboard",
    "display": "standalone",
    "background_color": "#0a0a0a",
    "theme_color": "#f59e0b",
    "orientation": "portrait-primary",
    "icons": [
        {
            "src": "/icons/icon-192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any maskable"
        },
        {
            "src": "/icons/icon-512.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "any maskable"
        }
    ]
}
```

> Adjust `background_color` and `theme_color` for light mode if needed. The amber `#f59e0b` matches the app's primary color.

### 1.4 Add Meta Tags to `src/app/layout.tsx`

Inside the `<head>` (or via the `metadata` export):

```tsx
// src/app/layout.tsx
export const metadata: Metadata = {
    title: "Kharcha",
    description: "Expense tracker with OCR-powered uploads",
    manifest: "/manifest.json",
    themeColor: "#f59e0b",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "Kharcha",
    },
    icons: {
        icon: "/icons/favicon.ico",
        apple: "/icons/apple-touch-icon.png",
    },
    viewport: {
        width: "device-width",
        initialScale: 1,
        maximumScale: 1,
        userScalable: false, // prevents zoom on input focus
    },
};
```

### 1.5 Create the Service Worker

Create `src/app/sw.ts`:

```ts
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
    interface WorkerGlobalScope extends SerwistGlobalConfig {
        __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,
    runtimeCaching: defaultCache,
});

serwist.addEventListeners();
```

### 1.6 Update `next.config.ts`

```ts
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
    swSrc: "src/app/sw.ts",
    swDest: "public/sw.js",
    disable: process.env.NODE_ENV === "development", // only enable in prod
});

const nextConfig = {
    // ... existing config
};

export default withSerwist(nextConfig);
```

### 1.7 Add Offline Fallback Page

Create `src/app/offline/page.tsx`:

```tsx
export default function OfflinePage() {
    return (
        <div className="flex min-h-screen items-center justify-center p-6">
            <div className="text-center space-y-4">
                <h1 className="text-3xl font-black uppercase">You're Offline</h1>
                <p className="text-muted-foreground font-mono text-sm">
                    Check your connection and try again.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="rounded-lg border-2 border-border bg-card px-6 py-3 font-bold shadow-[3px_3px_0px_0px] shadow-border/50 hover:border-primary transition-colors"
                >
                    Retry
                </button>
            </div>
        </div>
    );
}
```

### 1.8 Update `.gitignore`

```gitignore
# PWA service worker (auto-generated)
public/sw.js
public/sw.js.map
public/swe-worker-*.js
```

### 1.9 Test

```bash
npm run build && npm start
```

1. Open in Chrome → DevTools → Application tab → check "Manifest" and "Service Workers"
2. Run a Lighthouse audit → PWA section should pass
3. On Android Chrome: the "Install app" prompt should appear
4. On iOS Safari: tap Share → "Add to Home Screen"

---

## Tier 2 — Offline Data & Better UX (~3 hours)

### 2.1 Runtime Caching Strategies

Update `src/app/sw.ts` to add API-specific caching:

```ts
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from "serwist";

const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,
    runtimeCaching: [
        // Cache API responses (expenses, categories, analytics)
        {
            urlPattern: /\/api\/(expenses|categories|analytics|persona|income)/,
            handler: new NetworkFirst({
                cacheName: "api-data",
                networkTimeoutSeconds: 5,
                plugins: [
                    {
                        cacheableResponse: { statuses: [0, 200] },
                    },
                ],
            }),
        },
        // Cache static assets aggressively
        {
            urlPattern: /\.(js|css|woff2?|png|jpg|svg|ico)$/,
            handler: new CacheFirst({
                cacheName: "static-assets",
            }),
        },
        // Default: network first
        ...defaultCache,
    ],
});
```

> React Query's `persistQueryClient` already caches data in localStorage. The service worker cache acts as a second layer for the raw API responses.

### 2.2 Background Sync for Offline Writes

When the user adds an expense while offline, queue it:

```ts
// In your expense creation hook / API call:
if (!navigator.onLine) {
    // Store in IndexedDB queue
    await addToSyncQueue({ type: "CREATE_EXPENSE", payload: data });
    return;
}
```

In the service worker:

```ts
import { BackgroundSyncPlugin } from "serwist";

// Register sync for POST /api/expenses
{
    urlPattern: /\/api\/expenses$/,
    method: "POST",
    handler: new NetworkOnly({
        plugins: [
            new BackgroundSyncPlugin("expense-queue", {
                maxRetentionTime: 24 * 60, // 24 hours
            }),
        ],
    }),
}
```

### 2.3 Custom Install Prompt

```tsx
// src/components/pwa/install-prompt.tsx
"use client";

import { useState, useEffect } from "react";

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [show, setShow] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShow(true);
        };
        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    if (!show) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 z-50 md:hidden">
            <div className="rounded-lg border-2 border-primary bg-card p-4 shadow-[4px_4px_0px_0px] shadow-primary/30">
                <p className="font-bold text-sm">Install Kharcha</p>
                <p className="text-xs text-muted-foreground mb-3">
                    Add to your home screen for quick access
                </p>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            deferredPrompt?.prompt();
                            setShow(false);
                        }}
                        className="rounded-md bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground"
                    >
                        Install
                    </button>
                    <button
                        onClick={() => setShow(false)}
                        className="rounded-md border border-border px-4 py-1.5 text-xs"
                    >
                        Not now
                    </button>
                </div>
            </div>
        </div>
    );
}
```

Add `<InstallPrompt />` to `src/app/(app)/layout.tsx`.

### 2.4 iOS Splash Screens (Optional)

Apple requires specific splash images per device. Use [pwa-asset-generator](https://github.com/nicedoc/pwa-asset-generator):

```bash
npx pwa-asset-generator public/icons/icon-512.png public/splash \
  --background "#0a0a0a" --splash-only --type png
```

Then add the generated `<link>` tags to `layout.tsx`.

---

## Tier 3 — Native-Feel Features (~3 hours)

### 3.1 Push Notifications

Requires a push service (e.g., [web-push](https://www.npmjs.com/package/web-push)):

1. Generate VAPID keys: `npx web-push generate-vapid-keys`
2. Store keys in env vars
3. Subscribe in client: `navigator.serviceWorker.ready` → `pushManager.subscribe()`
4. Send from your cron job (`/api/cron/email-reminder`) — push in addition to email

Use cases:

- "You haven't uploaded this month's screenshots"
- "Budget alert: Food is at 90%"

### 3.2 Share Target

Add to `manifest.json`:

```json
{
    "share_target": {
        "action": "/upload",
        "method": "POST",
        "enctype": "multipart/form-data",
        "params": {
            "files": [
                {
                    "name": "screenshots",
                    "accept": ["image/png", "image/jpeg"]
                }
            ]
        }
    }
}
```

This lets users "Share" screenshots directly to the Kharcha upload page from their gallery or other apps.

---

## Checklist

- [ ] **Tier 1**: Install `@serwist/next` + `serwist`
- [ ] **Tier 1**: Create app icons (192, 512, apple-touch)
- [ ] **Tier 1**: Create `public/manifest.json`
- [ ] **Tier 1**: Add meta tags to `layout.tsx`
- [ ] **Tier 1**: Create `src/app/sw.ts`
- [ ] **Tier 1**: Update `next.config.ts` with Serwist wrapper
- [ ] **Tier 1**: Create offline fallback page
- [ ] **Tier 1**: Update `.gitignore`
- [ ] **Tier 1**: Test with Lighthouse PWA audit
- [ ] **Tier 2**: Add runtime caching strategies for API routes
- [ ] **Tier 2**: Add background sync for offline expense creation
- [ ] **Tier 2**: Add custom install prompt component
- [ ] **Tier 2**: Add iOS splash screens
- [ ] **Tier 3**: Push notifications with VAPID
- [ ] **Tier 3**: Share target for screenshot uploads

---

## Notes

- **Vercel auto-serves HTTPS** — no extra config needed for service workers
- **React Query persistence** already gives you offline reads; the SW adds offline navigation
- **`display: "standalone"`** hides the browser chrome — your bottom nav becomes the only navigation
- **iOS limitations**: no push notifications on iOS < 16.4, no background sync; but install + standalone work fine
- Service worker is disabled in dev (`process.env.NODE_ENV === "development"`) to avoid caching issues during development
