import { defaultCache } from "@serwist/turbopack/worker";
import type {
  PrecacheEntry,
  RuntimeCaching,
  SerwistGlobalConfig,
} from "serwist";
import {
  addEventListeners,
  createSerwist,
  NetworkFirst,
  NetworkOnly,
  RuntimeCache,
} from "serwist";

// This declares the value of `injectionPoint` to TypeScript.
// `injectionPoint` is the string that will be replaced by the
// actual precache manifest. By default, this string is set to
// `"self.__SW_MANIFEST"`.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

// Service worker global scope (lib target may not include ServiceWorker types)
type SWGlobalScope = WorkerGlobalScope &
  typeof globalThis & {
    skipWaiting: () => void;
  };
declare const self: SWGlobalScope;

const runtimeCaching: RuntimeCaching[] = [
  // Never cache Server Actions (POST requests)
  {
    matcher: ({ request }) => request.method === "POST",
    handler: new NetworkOnly(),
  },
  // Use NetworkFirst for Next.js data requests to avoid stale action references
  {
    matcher: ({ url }) => /\/\_next\/data\/.+\.json$/.test(url.pathname),
    handler: new NetworkFirst(),
  },
  ...defaultCache,
];

const serwist = createSerwist({
  precache: {
    entries: self.__SW_MANIFEST,
    concurrency: 10,
    cleanupOutdatedCaches: true,
  },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  extensions: [
    new RuntimeCache(runtimeCaching, {
      warmEntries: ["/~offline"],
      fallbacks: {
        entries: [
          {
            url: "/~offline",
            matcher({ request }) {
              return request.destination === "document";
            },
          },
        ],
      },
    }),
  ],
});

addEventListeners(serwist);

self.addEventListener(
  "message",
  (event: MessageEvent & { waitUntil?: (promise: Promise<unknown>) => void }) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();

    // Clear all runtime caches to prevent stale assets / action references
      event.waitUntil?.(
        caches
          .keys()
          .then((cacheNames) =>
            Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))
          )
      );
  }
  }
);
