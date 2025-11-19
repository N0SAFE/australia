import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { validateEnvPath } from '#/env'
import { orpc } from '@/lib/orpc'
import { useQuery } from '@tanstack/react-query'

type UploadProgress = {
  loaded: number
  total: number
  percentage: number
}

type PresentationUploadResult = {
  id: string
  filename: string
  filePath: string
  mimeType: string
  size: number
  duration: number | null
  width: number | null
  height: number | null
  thumbnailPath: string | null
  uploadedAt: string
  updatedAt: string
  url: string
}

type UploadState = {
  isUploading: boolean
  progress: UploadProgress | null
  error: Error | null
  data: PresentationUploadResult | null
}

/**
 * Hook to upload presentation video with progress tracking using XMLHttpRequest
 * Matches the TanStack Query mutation API for easy integration
 */
export function useUploadPresentation() {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: null,
    error: null,
    data: null,
  })

  const mutateAsync = useCallback(async ({ file }: { file: File }) => {
    return new Promise<PresentationUploadResult>((resolve, reject) => {
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
      
      const url = `${apiUrl}/presentation/upload`
      
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
          
          console.log(`[usePresentation] Upload progress: ${e.loaded}/${e.total} (${progress.percentage.toFixed(2)}%)`)
        }
      })
      
      // Handle completion
      xhr.addEventListener('load', () => {
        console.log('[usePresentation] Upload complete, status:', xhr.status)
        
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText) as PresentationUploadResult
            
            setState({
              isUploading: false,
              progress: { loaded: 100, total: 100, percentage: 100 },
              error: null,
              data: result,
            })
            
            toast.success(`Presentation uploaded successfully: ${result.filename}`)
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
        console.error('[usePresentation] Upload error')
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
        console.log('[usePresentation] Upload aborted')
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
      console.log('[usePresentation] Starting upload:', file.name)
      xhr.send(formData)
    })
  }, [])

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
    reset,
    isPending: state.isUploading,
    uploadProgress: state.progress?.percentage ?? 0,
    error: state.error,
    data: state.data,
  }
}

type ProcessingProgress = {
  progress: number
  status: 'processing' | 'completed' | 'failed'
  message: string
  metadata?: Record<string, unknown>
  timestamp: string
  isProcessed: boolean
  error: string | null
}

/**
 * Hook to subscribe to video processing progress updates
 * Uses ORPC experimental_liveOptions with TanStack Query for real-time SSE updates
 */
export function useSubscribeProcessingProgress(enabled: boolean = false) {
  const query = useQuery(
    orpc.presentation.subscribeProcessingProgress.experimental_liveOptions({
      input: {},
      enabled,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    })
  )
  
  return query
}

/**
 * Composite hook for all presentation operations
 */
export function usePresentation() {
  const uploadPresentation = useUploadPresentation()

  return {
    // Upload
    mutateAsync: uploadPresentation.mutateAsync,
    reset: uploadPresentation.reset,
    
    // States
    isPending: uploadPresentation.isPending,
    uploadProgress: uploadPresentation.uploadProgress,
    error: uploadPresentation.error,
    data: uploadPresentation.data,
  }
}
