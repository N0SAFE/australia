"use client";

import { useEffect } from "react";

/**
 * Bridges service worker update events to a custom window event that our
 * UpdateNotification component listens for.
 */
export function ServiceWorkerUpdateBridge() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let isMounted = true;

    const notifyUpdate = () => {
      if (!isMounted) return;
      window.dispatchEvent(new Event("sw-update-available"));
    };

    const setupUpdateListener = async () => {
      const registration = await navigator.serviceWorker.ready;

      // If an update is already waiting when we mount, notify immediately.
      if (registration.waiting) {
        notifyUpdate();
      }

      const handleInstallingChange = (worker: ServiceWorker | null) => {
        if (!worker) return;

        worker.addEventListener("statechange", () => {
          if (
            worker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            notifyUpdate();
          }
        });
      };

      const onUpdateFound = () => {
        handleInstallingChange(registration.installing);
      };

      registration.addEventListener("updatefound", onUpdateFound);

      // Handle current installing worker if present
      handleInstallingChange(registration.installing);

      return () => {
        registration.removeEventListener("updatefound", onUpdateFound);
      };
    };

    const cleanupPromise = setupUpdateListener();

    return () => {
      isMounted = false;
      // Ensure we detach the updatefound listener when the component unmounts
      cleanupPromise.then((cleanup) => cleanup?.());
    };
  }, []);

  return null;
}
