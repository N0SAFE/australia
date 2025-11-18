import { useMutation } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'

/**
 * Progress state for video processing
 */
export interface VideoProcessingProgress {
  progress: number
  status: 'processing' | 'completed' | 'failed'
  message?: string
  metadata?: any
  timestamp: string
}

/**
 * Mutation hook to upload an image file
 */
export function useUploadImage() {
  return useMutation(orpc.storage.uploadImage.mutationOptions({
    onSuccess: (result) => {
      toast.success(`Image uploaded successfully: ${result.filename}`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload image: ${error.message}`)
    },
  }))
}

/**
 * Mutation hook to upload a video file
 */
export function useUploadVideo() {
  return useMutation(orpc.storage.uploadVideo.mutationOptions({
    onSuccess: (result) => {
      toast.success(`Video uploaded successfully: ${result.filename}`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload video: ${error.message}`)
    },
  }))
}

/**
 * Mutation hook to upload an audio file
 */
export function useUploadAudio() {
  return useMutation(orpc.storage.uploadAudio.mutationOptions({
    onSuccess: (result) => {
      toast.success(`Audio uploaded successfully: ${result.filename}`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload audio: ${error.message}`)
    },
  }))
}

/**
 * Hook to subscribe to video processing progress events
 * 
 * @param videoId - The video ID to track
 * @param options - Configuration options
 * @returns Current progress state and control functions
 */
export function useVideoProcessing(
  videoId: string | undefined,
  options: {
    enabled?: boolean
    onComplete?: (data: VideoProcessingProgress) => void
    onError?: (data: VideoProcessingProgress) => void
  } = {}
) {
  const [progress, setProgress] = useState<VideoProcessingProgress | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Don't connect if videoId is not provided or if explicitly disabled
    if (!videoId || options.enabled === false) {
      return
    }

    let aborted = false
    let iterator: AsyncIterator<VideoProcessingProgress> | null = null

    const connect = async () => {
      try {
        setIsConnected(true)
        setError(null)

        // Call the ORPC subscription with videoId only
        // ABORT strategy handles canceling previous operations on same videoId
        iterator = await orpc.storage.subscribeVideoProcessing.call({ videoId })

        // Process events as they arrive
        for await (const event of iterator) {
          if (aborted) break

          setProgress(event)

          // Handle completion
          if (event.status === 'completed') {
            options.onComplete?.(event)
            toast.success(event.message || 'Video processing completed')
            break
          }

          // Handle failure
          if (event.status === 'failed') {
            options.onError?.(event)
            toast.error(event.message || 'Video processing failed')
            break
          }
        }
      } catch (err) {
        if (!aborted) {
          const errorObj = err instanceof Error ? err : new Error(String(err))
          setError(errorObj)
          toast.error(`Failed to connect to video processing: ${errorObj.message}`)
        }
      } finally {
        if (!aborted) {
          setIsConnected(false)
        }
      }
    }

    connect()

    // Cleanup function
    return () => {
      aborted = true
      setIsConnected(false)
      // Note: ORPC async iterators handle cleanup automatically
    }
  }, [videoId, options.enabled])

  return {
    progress,
    isConnected,
    error,
    isProcessing: progress?.status === 'processing',
    isCompleted: progress?.status === 'completed',
    isFailed: progress?.status === 'failed',
  }
}

/**
 * Combined hook for uploading video with automatic progress tracking
 * 
 * @param options - Configuration options
 * @returns Upload mutation and progress tracking state
 */
export function useUploadVideoWithProgress(options: {
  onUploadSuccess?: (result: any) => void
  onProcessingComplete?: (data: VideoProcessingProgress) => void
  onProcessingError?: (data: VideoProcessingProgress) => void
} = {}) {
  const [videoId, setVideoId] = useState<string | null>(null)

  const uploadMutation = useMutation(orpc.storage.uploadVideo.mutationOptions({
    onSuccess: (result) => {
      toast.success(`Video uploaded successfully: ${result.filename}`)
      
      // Store videoId to trigger progress tracking
      setVideoId(result.videoId)
      
      options.onUploadSuccess?.(result)
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload video: ${error.message}`)
    },
  }))

  // Track progress after upload
  const processingState = useVideoProcessing(
    videoId ?? undefined,
    {
      enabled: !!videoId,
      onComplete: options.onProcessingComplete,
      onError: options.onProcessingError,
    }
  )

  // Reset state when processing is complete or failed
  useEffect(() => {
    if (processingState.isCompleted || processingState.isFailed) {
      // Keep the result for a moment before clearing
      const timer = setTimeout(() => {
        setVideoId(null)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [processingState.isCompleted, processingState.isFailed])

  return {
    // Upload mutation
    upload: uploadMutation.mutate,
    uploadAsync: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    uploadError: uploadMutation.error,
    uploadData: uploadMutation.data,
    
    // Processing state
    ...processingState,
    
    // Combined state
    isBusy: uploadMutation.isPending || processingState.isProcessing,
  }
}

/**
 * Composite hook for all storage operations
 */
export function useStorage() {
  const uploadImage = useUploadImage()
  const uploadVideo = useUploadVideo()
  const uploadAudio = useUploadAudio()

  return {
    // Upload methods
    uploadImage: uploadImage.mutate,
    uploadImageAsync: uploadImage.mutateAsync,
    uploadVideo: uploadVideo.mutate,
    uploadVideoAsync: uploadVideo.mutateAsync,
    uploadAudio: uploadAudio.mutate,
    uploadAudioAsync: uploadAudio.mutateAsync,
    
    // Loading states
    isUploading: {
      image: uploadImage.isPending,
      video: uploadVideo.isPending,
      audio: uploadAudio.isPending,
      any: uploadImage.isPending || uploadVideo.isPending || uploadAudio.isPending,
    },
    
    // Error states
    errors: {
      image: uploadImage.error,
      video: uploadVideo.error,
      audio: uploadAudio.error,
    },
    
    // Upload progress (if available)
    data: {
      image: uploadImage.data,
      video: uploadVideo.data,
      audio: uploadAudio.data,
    },
  }
}
