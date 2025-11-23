'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'
import type { FileUploadProgressEvent } from '@/lib/orpc/withFileUploads'

/**
 * Video processing event data from the contract
 */
export interface VideoProcessingEvent {
  progress: number
  message: string
  metadata?: {
    duration: number
    width: number
    height: number
    codec: string
  }
  timestamp: string
}

/**
 * Mutation hook to upload an image file
 * Uses ORPC with onProgress context for upload tracking
 */
export function useUploadImage() {
  const [uploadProgress, setUploadProgress] = useState(0)

  const mutation = useMutation({
    mutationFn: async (variables: { file: File }) => {
      setUploadProgress(0)
      return await orpc.storage.uploadImage.call(variables, {
        context: {
          onProgress: (progressEvent: FileUploadProgressEvent) => {
            setUploadProgress(progressEvent.percentage)
          }
        }
      })
    },
    onSuccess: (data) => {
      toast.success(`Image uploaded successfully: ${data.filename}`)
      setUploadProgress(100)
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload image: ${error.message}`)
      setUploadProgress(0)
    },
  })

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    uploadProgress,
    error: mutation.error,
    data: mutation.data,
    reset: () => {
      mutation.reset()
      setUploadProgress(0)
    },
  }
}

/**
 * Mutation hook to upload a video file
 * Uses ORPC with onProgress context for upload tracking
 */
export function useUploadVideo() {
  const [uploadProgress, setUploadProgress] = useState(0)

  const mutation = useMutation({
    mutationFn: async (variables: { file: File }) => {
      setUploadProgress(0)
      return await orpc.storage.uploadVideo.call(variables, {
        context: {
          onProgress: (progressEvent: FileUploadProgressEvent) => {
            setUploadProgress(progressEvent.percentage)
          }
        }
      })
    },
    onSuccess: (data) => {
      toast.success(`Video uploaded successfully: ${data.filename}`)
      setUploadProgress(100)
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload video: ${error.message}`)
      setUploadProgress(0)
    },
  })

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    uploadProgress,
    error: mutation.error,
    data: mutation.data,
    reset: () => {
      mutation.reset()
      setUploadProgress(0)
    },
  }
}

/**
 * Mutation hook to upload an audio file
 * Uses ORPC with onProgress context for upload tracking
 */
export function useUploadAudio() {
  const [uploadProgress, setUploadProgress] = useState(0)

  const mutation = useMutation({
    mutationFn: async (variables: { file: File }) => {
      setUploadProgress(0)
      return await orpc.storage.uploadAudio.call(variables, {
        context: {
          onProgress: (progressEvent: FileUploadProgressEvent) => {
            setUploadProgress(progressEvent.percentage)
          }
        }
      })
    },
    onSuccess: (data) => {
      toast.success(`Audio uploaded successfully: ${data.filename}`)
      setUploadProgress(100)
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload audio: ${error.message}`)
      setUploadProgress(0)
    },
  })

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    uploadProgress,
    error: mutation.error,
    data: mutation.data,
    reset: () => {
      mutation.reset()
      setUploadProgress(0)
    },
  }
}

/**
 * Hook to subscribe to video processing progress events
 * 
 * @param fileId - The video ID to track
 * @param options - Configuration options
 * @returns Current progress state and control functions
 */
export function useVideoProcessing(
  fileId: string | undefined,
  options: {
    enabled?: boolean
    onComplete?: (data: VideoProcessingEvent) => void
    onProgress?: (data: VideoProcessingEvent) => void
  } = {}
) {
  return useQuery(
    orpc.storage.subscribeVideoProcessing.experimental_liveOptions({
      input: { fileId: fileId ?? '' },
      enabled: options.enabled && !!fileId,
      refetchOnMount: true, // Always refetch when component mounts
      refetchOnReconnect: true, // Refetch when network reconnects
      refetchOnWindowFocus: true, // Refetch when window regains focus
      onData: (data: VideoProcessingEvent) => {
        console.log('[useStorage] Processing progress:', data)
        
        // Call progress callback for every update
        options.onProgress?.(data)
        
        // Call complete callback when progress reaches 100%
        if (data.progress >= 100) {
          options.onComplete?.(data)
        }
      },
    })
  )
}

/**
 * Combined hook for uploading video with automatic progress tracking
 * 
 * @param options - Configuration options
 * @returns Upload mutation and progress tracking state
 */
export function useUploadVideoWithProgress(options: {
  onUploadProgress?: (progress: number) => void
  onUploadSuccess?: (result: any) => void
  onProcessingProgress?: (data: VideoProcessingEvent) => void
  onProcessingComplete?: (data: VideoProcessingEvent) => void
} = {}) {
  const [fileId, setVideoId] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const uploadMutation = useMutation({
    mutationFn: async (variables: { file: File }) => {
      setUploadProgress(0)
      return await orpc.storage.uploadVideo.call(variables, {
        context: {
          onProgress: (progressEvent: FileUploadProgressEvent) => {
            setUploadProgress(progressEvent.percentage)
            options.onUploadProgress?.(progressEvent.percentage)
          }
        }
      })
    },
    onSuccess: (result) => {
      toast.success(`Video uploaded successfully: ${result.filename}`)
      setUploadProgress(100)
      
      // Store fileId to trigger progress tracking
      setVideoId(result.fileId)
      
      options.onUploadSuccess?.(result)
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload video: ${error.message}`)
      setUploadProgress(0)
    },
  })

  // Track progress after upload
  const processingQuery = useVideoProcessing(
    fileId ?? undefined,
    {
      enabled: !!fileId,
      onProgress: options.onProcessingProgress,
      onComplete: options.onProcessingComplete,
    }
  )

  // Reset state when processing is complete (progress reaches 100%)
  useEffect(() => {
    const isComplete = (processingQuery.data?.progress ?? 0) >= 100
    
    if (isComplete) {
      // Keep the result for a moment before clearing
      const timer = setTimeout(() => {
        setVideoId(null)
        setUploadProgress(0)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [processingQuery.data?.progress])

  return {
    // Upload mutation
    upload: uploadMutation.mutate,
    uploadAsync: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    uploadProgress,
    uploadError: uploadMutation.error,
    uploadData: uploadMutation.data,
    
    // Processing state
    processingProgress: processingQuery.data?.progress ?? 0,
    processingMessage: processingQuery.data?.message,
    processingMetadata: processingQuery.data?.metadata,
    processingError: processingQuery.error,
    isProcessing: !!fileId && (processingQuery.data?.progress ?? 0) < 100,
    isCompleted: (processingQuery.data?.progress ?? 0) >= 100,
    
    // Combined state
    isBusy: uploadMutation.isPending || (!!fileId && (processingQuery.data?.progress ?? 0) < 100),
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
    
    // Upload progress (0-100 percentage)
    uploadProgress: {
      image: uploadImage.uploadProgress,
      video: uploadVideo.uploadProgress,
      audio: uploadAudio.uploadProgress,
    },
    
    // Reset functions
    reset: {
      image: uploadImage.reset,
      video: uploadVideo.reset,
      audio: uploadAudio.reset,
    },
    
    // Error states
    errors: {
      image: uploadImage.error,
      video: uploadVideo.error,
      audio: uploadAudio.error,
    },
    
    // Upload data (results)
    data: {
      image: uploadImage.data,
      video: uploadVideo.data,
      audio: uploadAudio.data,
    },
  }
}
