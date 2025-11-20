"use client";

import { useEffect, useState } from "react";
import { CloudOff, CloudUpload } from "lucide-react";
import { getPendingSyncTaskCount } from "@/lib/pwa/background-sync";

/**
 * Component to display sync status and pending tasks
 * Shows when there are offline actions waiting to sync
 */
export function SyncStatus() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine);

    // Update pending count
    const updateCount = () => {
      setPendingCount(getPendingSyncTaskCount());
    };

    updateCount();

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      updateCount();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // Listen for sync complete events
    const handleSyncComplete = () => {
      updateCount();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("sync-complete", handleSyncComplete);

    // Check periodically
    const interval = setInterval(updateCount, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("sync-complete", handleSyncComplete);
      clearInterval(interval);
    };
  }, []);

  // Don't show if online and no pending tasks
  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-40">
      <div className="rounded-lg border bg-card p-3 shadow-lg">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <CloudUpload className="h-4 w-4 text-primary" />
          ) : (
            <CloudOff className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">
            {!isOnline && "Offline"}
            {isOnline && pendingCount > 0 && `Syncing ${pendingCount} item${pendingCount > 1 ? "s" : ""}...`}
          </span>
        </div>
      </div>
    </div>
  );
}
