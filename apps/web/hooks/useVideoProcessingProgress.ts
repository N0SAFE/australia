import { useCallback, useRef } from 'react'

interface ProcessingProgress {
  progress: number
  status: 'processing' | 'completed' | 'failed'
  message?: string
}

type ProgressCallback = (progress: ProcessingProgress) => void
type UnsubscribeFunction = () => void

/**
 * Hook to manage video processing progress updates for Tiptap video nodes
 * This hook provides methods to subscribe/unsubscribe to progress updates
 * and enable/disable progress display for specific videos
 */
export function useVideoProcessingProgress() {
  // Store callbacks for each video by ID
  const callbacksRef = useRef<Map<string, Set<ProgressCallback>>>(new Map())
  
  // Store enabled state for each video
  const enabledRef = useRef<Map<string, boolean>>(new Map())

  /**
   * Subscribe to processing progress updates for a specific video
   * @param videoId - The video identifier (srcUrlId or src)
   * @param callback - Function to call with progress updates
   * @returns Unsubscribe function
   */
  const onProgressUpdate = useCallback((videoId: string, callback: ProgressCallback): UnsubscribeFunction => {
    // Get or create the set of callbacks for this video
    if (!callbacksRef.current.has(videoId)) {
      callbacksRef.current.set(videoId, new Set())
    }
    
    const callbacks = callbacksRef.current.get(videoId)!
    callbacks.add(callback)
    
    // Return unsubscribe function
    return () => {
      callbacks.delete(callback)
      if (callbacks.size === 0) {
        callbacksRef.current.delete(videoId)
      }
    }
  }, [])

  /**
   * Enable progress bar display for a specific video
   */
  const enableProgress = useCallback((videoId: string) => {
    enabledRef.current.set(videoId, true)
  }, [])

  /**
   * Disable progress bar display for a specific video
   */
  const disableProgress = useCallback((videoId: string) => {
    enabledRef.current.set(videoId, false)
  }, [])

  /**
   * Update progress for a specific video (call this when you receive progress updates)
   * @param videoId - The video identifier
   * @param progress - The progress data
   */
  const updateProgress = useCallback((videoId: string, progress: ProcessingProgress) => {
    const callbacks = callbacksRef.current.get(videoId)
    if (callbacks) {
      callbacks.forEach(callback => callback(progress))
    }
  }, [])

  /**
   * Check if progress is enabled for a specific video
   */
  const isProgressEnabled = useCallback((videoId: string): boolean => {
    return enabledRef.current.get(videoId) ?? false
  }, [])

  return {
    onProgressUpdate,
    enableProgress,
    disableProgress,
    updateProgress,
    isProgressEnabled,
  }
}
