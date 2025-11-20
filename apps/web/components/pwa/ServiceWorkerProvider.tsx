"use client";

import { useEffect } from "react";
import { Serwist } from "@serwist/next/worker";

declare global {
  interface Window {
    serwist: Serwist | undefined;
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
      const registerSW = async () => {
        try {
          const registration = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
          });

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

          console.log("Service Worker registered successfully");
        } catch (error) {
          console.error("Service Worker registration failed:", error);
        }
      };

      registerSW();
    }
  }, []);

  return <>{children}</>;
}
