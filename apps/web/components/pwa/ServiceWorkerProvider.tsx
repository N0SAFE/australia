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
      window.workbox !== undefined
    ) {
      const wb = window.workbox;

      // A common UX pattern for progressive web apps is to show a banner when a service worker has updated and waiting to install.
      wb.addEventListener("controlling", () => {
        window.location.reload();
      });

      wb.register();
    }
  }, []);

  return <>{children}</>;
}
