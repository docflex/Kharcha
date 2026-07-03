/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkFirst, CacheFirst } from "serwist";

declare global {
    interface WorkerGlobalScope extends SerwistGlobalConfig {
        __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
}

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,
    runtimeCaching: [
        {
            matcher:
                /\/api\/(expenses|categories|analytics|persona|income|snapshot|budgets|version)/,
            handler: new NetworkFirst({
                cacheName: "api-data",
                networkTimeoutSeconds: 5,
            }),
        },
        {
            matcher: /\.(js|css|woff2?|png|jpg|jpeg|svg|ico|webp|avif)$/,
            handler: new CacheFirst({
                cacheName: "static-assets",
            }),
        },
        ...defaultCache,
    ],
});

serwist.addEventListeners();
