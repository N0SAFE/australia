"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    workbox: any;
  }
}

export function ServiceWorkerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      // Register our custom service worker
      navigator.serviceWorker
        .register("/sw-custom.js", { scope: "/" })
        .then((registration) => {
          console.log("Service Worker registered:", registration);

          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000); // Check every hour

          // Listen for updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (
                  newWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  // New service worker available
                  window.dispatchEvent(new Event("sw-update-available"));
                }
              });
            }
          });

          // Handle controller change (new SW activated)
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            window.location.reload();
          });
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });

      // Also check if workbox is available (for next-pwa compatibility)
      if (window.workbox !== undefined) {
        const wb = window.workbox;
        wb.addEventListener("controlling", () => {
          window.location.reload();
        });
        wb.register();
      }
    }
  }, []);

  return <>{children}</>;
}
