/**
 * Background Sync API utilities for offline data synchronization
 * Allows queuing actions when offline that will be executed when connection is restored
 */

export interface SyncTask {
  id: string;
  type: string;
  data: any;
  timestamp: number;
}

const SYNC_QUEUE_KEY = "pwa-sync-queue";

/**
 * Add a task to the background sync queue
 */
export async function addToSyncQueue(task: Omit<SyncTask, "id" | "timestamp">) {
  const syncTask: SyncTask = {
    ...task,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  };

  // Store in localStorage as fallback
  const queue = getSyncQueue();
  queue.push(syncTask);
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));

  // Try to register background sync if available
  if ("serviceWorker" in navigator && "sync" in (self as any).registration) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register(`sync-${syncTask.id}`);
      console.log("Background sync registered:", syncTask.id);
    } catch (error) {
      console.error("Failed to register background sync:", error);
    }
  }

  return syncTask;
}

/**
 * Get all tasks in the sync queue
 */
export function getSyncQueue(): SyncTask[] {
  try {
    const queue = localStorage.getItem(SYNC_QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch (error) {
    console.error("Failed to get sync queue:", error);
    return [];
  }
}

/**
 * Remove a task from the sync queue
 */
export function removeFromSyncQueue(taskId: string) {
  const queue = getSyncQueue();
  const filtered = queue.filter((task) => task.id !== taskId);
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered));
}

/**
 * Clear all tasks from the sync queue
 */
export function clearSyncQueue() {
  localStorage.removeItem(SYNC_QUEUE_KEY);
}

/**
 * Process a sync task
 */
export async function processSyncTask(task: SyncTask): Promise<boolean> {
  try {
    // This is where you would implement the actual sync logic
    // For example, retrying a failed API call
    console.log("Processing sync task:", task);

    // Example: You might have different handlers based on task type
    switch (task.type) {
      case "upload-photo":
        // Handle photo upload
        break;
      case "post-comment":
        // Handle comment posting
        break;
      default:
        console.warn("Unknown task type:", task.type);
    }

    // Remove from queue on success
    removeFromSyncQueue(task.id);
    return true;
  } catch (error) {
    console.error("Failed to process sync task:", error);
    return false;
  }
}

/**
 * Process all pending sync tasks
 */
export async function processPendingSyncTasks() {
  const queue = getSyncQueue();

  for (const task of queue) {
    await processSyncTask(task);
  }
}

/**
 * Hook to check if there are pending sync tasks
 */
export function hasPendingSyncTasks(): boolean {
  return getSyncQueue().length > 0;
}

/**
 * Hook to get the count of pending sync tasks
 */
export function getPendingSyncTaskCount(): number {
  return getSyncQueue().length;
}
