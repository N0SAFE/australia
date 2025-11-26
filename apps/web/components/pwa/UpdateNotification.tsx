"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Listen for custom SW update event
      const handleUpdateAvailable = () => {
        navigator.serviceWorker.ready.then((reg) => {
          setRegistration(reg);
          setShowUpdate(true);
        });
      };

      window.addEventListener("sw-update-available", handleUpdateAvailable);

      return () => {
        window.removeEventListener("sw-update-available", handleUpdateAvailable);
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
    } else {
      // Fallback: just reload
      window.location.reload();
    }

    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-sm animate-in slide-in-from-top-4 duration-300">
      <div className="rounded-xl border border-pink-medium/30 bg-card p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-light">
            <Gift className="h-5 w-5 text-pink-dark" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-script text-xl text-pink-dark">Nouveautés !</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Une nouvelle version est disponible avec des améliorations.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={updateServiceWorker}
                className="flex-1 bg-pink-dark text-white hover:bg-pink-dark/90"
                size="sm"
              >
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Actualiser
              </Button>
              <Button
                onClick={() => setShowUpdate(false)}
                variant="outline"
                size="sm"
              >
                Plus tard
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
