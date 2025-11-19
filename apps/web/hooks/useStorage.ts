import { useQuery, useMutation } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { toast } from 'sonner'
import { useEffect, useState, useCallback } from 'react'
import { validateEnvPath } from '#/env'

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
 * Upload progress tracking
 */
type UploadProgress = {
  loaded: number
  total: number
  percentage: number
}

/**
 * Generic file upload result
 */
type FileUploadResult = {
  filename: string
  path: string
  size: number
  mimeType: string
  url?: string
  fileId?: string
  videoId?: string
  isProcessed?: boolean
  message?: string
}

/**
 * Upload state for XMLHttpRequest-based uploads
 */
type UploadState = {
  isUploading: boolean
  progress: UploadProgress | null
  error: Error | null
  data: FileUploadResult | null
}

/**
 * Generic XMLHttpRequest-based file upload hook
 */
function useXHRUpload(endpoint: string, successMessage: string) {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: null,
    error: null,
    data: null,
  })

  const mutateAsync = useCallback(async (
    file: File,
    onProgress?: (event: { progress: number }) => void
  ) => {
    return new Promise<FileUploadResult>((resolve, reject) => {
      // Reset state
      setState({
        isUploading: true,
        progress: null,
        error: null,
        data: null,
      })

      // Create XMLHttpRequest
      const xhr = new XMLHttpRequest()
      
      // Get API URL
      const apiUrl = typeof window === 'undefined'
        ? validateEnvPath(process.env.API_URL ?? '', 'API_URL')
        : validateEnvPath(process.env.NEXT_PUBLIC_API_URL ?? '', 'NEXT_PUBLIC_API_URL')
      
      const url = `${apiUrl}${endpoint}`
      
      xhr.open('POST', url)
      
      // Set headers for credentials
      xhr.withCredentials = true
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress: UploadProgress = {
            loaded: e.loaded,
            total: e.total,
            percentage: (e.loaded / e.total) * 100,
          }
          
          setState(prev => ({
            ...prev,
            progress,
          }))
          
          // Call the external progress callback if provided
          onProgress?.({ progress: progress.percentage })
          
          console.log(`[useStorage] Upload progress: ${e.loaded}/${e.total} (${progress.percentage.toFixed(2)}%)`)
        }
      })
      
      // Handle completion
      xhr.addEventListener('load', () => {
        console.log(`[useStorage] Upload complete, status: ${xhr.status}`)
        
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText) as FileUploadResult
            
            // Add URL if not present - construct full API URL
            // Server will handle subdirectory lookup based on filename prefix
            if (!result.url) {
              result.url = `${apiUrl}/storage/files/${result.filename}`
            }
            
            setState({
              isUploading: false,
              progress: { loaded: 100, total: 100, percentage: 100 },
              error: null,
              data: result,
            })
            
            toast.success(`${successMessage}: ${result.filename}`)
            resolve(result)
          } catch (err) {
            const error = new Error('Failed to parse server response')
            setState({
              isUploading: false,
              progress: null,
              error,
              data: null,
            })
            toast.error('Failed to parse server response')
            reject(error)
          }
        } else {
          let errorMessage = 'Upload failed'
          try {
            const errorResponse = JSON.parse(xhr.responseText)
            errorMessage = errorResponse.message || errorMessage
          } catch {
            errorMessage = xhr.statusText || errorMessage
          }
          
          const error = new Error(errorMessage)
          setState({
            isUploading: false,
            progress: null,
            error,
            data: null,
          })
          toast.error(`Upload failed: ${errorMessage}`)
          reject(error)
        }
      })
      
      // Handle errors
      xhr.addEventListener('error', () => {
        console.error('[useStorage] Upload error')
        const error = new Error('Network request failed')
        setState({
          isUploading: false,
          progress: null,
          error,
          data: null,
        })
        toast.error('Network request failed')
        reject(error)
      })
      
      // Handle abort
      xhr.addEventListener('abort', () => {
        console.log('[useStorage] Upload aborted')
        const error = new Error('Upload cancelled')
        setState({
          isUploading: false,
          progress: null,
          error,
          data: null,
        })
        toast.error('Upload cancelled')
        reject(error)
      })
      
      // Create FormData and append file
      const formData = new FormData()
      formData.append('file', file)
      
      // Send the request
      console.log(`[useStorage] Starting upload: ${file.name}`)
      xhr.send(formData)
    })
  }, [endpoint, successMessage])

  const reset = useCallback(() => {
    setState({
      isUploading: false,
      progress: null,
      error: null,
      data: null,
    })
  }, [])

  return {
    mutateAsync,
    mutate: (file: File, onProgress?: (event: { progress: number }) => void) => { 
      mutateAsync(file, onProgress).catch(() => {}) 
    },
    reset,
    isPending: state.isUploading,
    uploadProgress: state.progress?.percentage ?? 0,
    error: state.error,
    data: state.data,
  }
}

/**
 * Mutation hook to upload an image file
 */
export function useUploadImage() {
  return useXHRUpload('/storage/upload/image', 'Image uploaded successfully')
}

/**
 * Mutation hook to upload a video file
 */
export function useUploadVideo() {
  return useXHRUpload('/storage/upload/video', 'Video uploaded successfully')
}

/**
 * Mutation hook to upload an audio file
 */
export function useUploadAudio() {
  return useXHRUpload('/storage/upload/audio', 'Audio uploaded successfully')
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
  return useQuery(
    orpc.storage.subscribeVideoProcessing.experimental_liveOptions({
      input: { videoId: videoId ?? '' },
      enabled: options.enabled && !!videoId,
      onData: (data) => {
        if (data.status === 'completed') {
          options.onComplete?.(data)
        } else if (data.status === 'failed') {
          options.onError?.(data)
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
