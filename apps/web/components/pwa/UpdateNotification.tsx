"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

export function UpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      window.workbox !== undefined
    ) {
      const wb = window.workbox;

      // Add event listener to detect when the registered service worker has installed but waiting to activate
      const promptNewVersionAvailable = (event: any) => {
        setShowUpdate(true);
        setRegistration(event.sw);
      };

      wb.addEventListener("waiting", promptNewVersionAvailable);
      wb.addEventListener("externalwaiting", promptNewVersionAvailable);

      // Register periodic update checks
      wb.register();

      // Check for updates every hour
      setInterval(() => {
        wb.update();
      }, 60 * 60 * 1000); // 1 hour

      return () => {
        wb.removeEventListener("waiting", promptNewVersionAvailable);
        wb.removeEventListener("externalwaiting", promptNewVersionAvailable);
      };
    }
  }, []);

  const updateServiceWorker = () => {
    if (registration && registration.waiting) {
      // Send SKIP_WAITING message to the waiting service worker
      registration.waiting.postMessage({ type: "SKIP_WAITING" });

      // Reload the page after service worker is activated
      registration.waiting.addEventListener("statechange", (e: Event) => {
        const target = e.target as ServiceWorker;
        if (target.state === "activated") {
          window.location.reload();
        }
      });
    }

    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-slide-up">
      <div className="rounded-lg border bg-card p-4 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <RefreshCw className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold">Update Available</h3>
            <p className="text-sm text-muted-foreground">
              A new version of Gossip Club is available. Refresh to get the
              latest features and improvements.
            </p>
            <div className="flex gap-2">
              <button
                onClick={updateServiceWorker}
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                Refresh Now
              </button>
              <button
                onClick={() => setShowUpdate(false)}
                className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
