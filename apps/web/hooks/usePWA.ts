"use client";

import { useEffect, useState } from "react";
import { addToSyncQueue, type SyncTask } from "@/lib/pwa/background-sync";

/**
 * Hook for PWA functionality
 * Provides install state, online status, and sync capabilities
 */
export function usePWA() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // Check if running as installed PWA
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsInstalled(isStandalone);

    // Check online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check if app can be installed
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  /**
   * Queue an action for background sync
   */
  const queueSync = async (task: Omit<SyncTask, "id" | "timestamp">) => {
    return addToSyncQueue(task);
  };

  return {
    isInstalled,
    isOnline,
    canInstall,
    queueSync,
  };
}
