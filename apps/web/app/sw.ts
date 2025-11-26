import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { addEventListeners, createSerwist, RuntimeCache } from "serwist";

// This declares the value of `injectionPoint` to TypeScript.
// `injectionPoint` is the string that will be replaced by the
// actual precache manifest. By default, this string is set to
// `"self.__SW_MANIFEST"`.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

// ServiceWorkerGlobalScope extends WorkerGlobalScope
declare const self: WorkerGlobalScope & typeof globalThis;

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
    new RuntimeCache(defaultCache, {
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
