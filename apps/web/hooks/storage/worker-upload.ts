'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, type UseMutationOptions } from '@tanstack/react-query'
import { toast } from 'sonner'
import { validateEnvPath } from '#/env'
import type {
  UploadWorkerMessage,
  UploadWorkerResponse,
} from '../../workers/upload.worker'

/**
 * Progress state for upload tracking
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
 * Generate unique upload ID
 */
function generateUploadId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Type for ORPC contract route with metadata
 */
type ORPCContractRoute = {
  ['~orpc']?: {
    route?: {
      path?: string
      method?: string
    }
  }
}

/**
 * Extract endpoint path from ORPC contract
 */
function getEndpointFromContract(contract: any): string {
  // Try to access the ORPC metadata
  const orpcMetadata = contract?.['~orpc']
  if (orpcMetadata?.route?.path) {
    return orpcMetadata.route.path
  }
  
  // Fallback: try to infer from the contract structure
  // This is a safety fallback in case the metadata structure is different
  throw new Error('Cannot extract endpoint path from contract. Please ensure you pass a valid ORPC contract route.')
}

/**
 * Get success message from contract or use default
 */
function getSuccessMessage(contract: any): string {
  const orpcMetadata = contract?.['~orpc']
  const summary = orpcMetadata?.route?.summary
  
  if (summary) {
    return summary.replace('Upload', 'Uploaded').replace('upload', 'uploaded')
  }
  
  return 'File uploaded successfully'
}

/**
 * Web Worker-based file upload hook using TanStack Query mutation
 * Handles file uploads in a background thread to prevent blocking the UI
 * Uses ORPC contract to automatically determine the correct endpoint
 * 
 * @param contractRoute - ORPC contract route (e.g., orpc.storage.uploadImage)
 * @param options - TanStack Query mutation options
 * @returns Upload mutation with progress tracking
 * 
 * @example
 * ```typescript
 * import { orpc } from '@/lib/orpc'
 * 
 * const upload = useWorkerUploadFile(orpc.storage.uploadImage, {
 *   onSuccess: (data) => console.log('Uploaded:', data)
 * })
 * 
 * upload.mutate(file)
 * ```
 */
export function useWorkerUploadFile(
  contractRoute: any,
  options?: Omit<UseMutationOptions<FileUploadResult, Error, File>, 'mutationFn'>
) {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const currentUploadIdRef = useRef<string | null>(null)
  const progressCallbackRef = useRef<((event: { progress: number }) => void) | null>(null)

  // Extract endpoint and success message from contract
  const endpoint = getEndpointFromContract(contractRoute)
  const successMessage = getSuccessMessage(contractRoute)

  // Initialize worker on mount
  useEffect(() => {
    // Create worker from inline blob to avoid bundling issues
    const workerCode = `
      const activeRequests = new Map();

      function handleUpload(id, file, url, withCredentials) {
        const xhr = new XMLHttpRequest();
        activeRequests.set(id, xhr);

        xhr.open('POST', url);
        xhr.withCredentials = withCredentials;

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            postMessage({
              type: 'progress',
              id,
              loaded: e.loaded,
              total: e.total,
              percentage: (e.loaded / e.total) * 100,
            });
          }
        });

        xhr.addEventListener('load', () => {
          activeRequests.delete(id);

          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              postMessage({ type: 'success', id, data });
            } catch (err) {
              postMessage({ type: 'error', id, error: 'Failed to parse server response' });
            }
          } else {
            let errorMessage = 'Upload failed';
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              errorMessage = errorResponse.message || errorMessage;
            } catch {
              errorMessage = xhr.statusText || errorMessage;
            }
            postMessage({ type: 'error', id, error: errorMessage });
          }
        });

        xhr.addEventListener('error', () => {
          activeRequests.delete(id);
          postMessage({ type: 'error', id, error: 'Network request failed' });
        });

        xhr.addEventListener('abort', () => {
          activeRequests.delete(id);
          postMessage({ type: 'cancelled', id });
        });

        const formData = new FormData();
        formData.append('file', file);
        xhr.send(formData);
      }

      function handleCancel(id) {
        const xhr = activeRequests.get(id);
        if (xhr) {
          xhr.abort();
          activeRequests.delete(id);
        }
      }

      self.addEventListener('message', (event) => {
        const message = event.data;
        switch (message.type) {
          case 'upload':
            handleUpload(message.id, message.file, message.url, message.withCredentials);
            break;
          case 'cancel':
            handleCancel(message.id);
            break;
        }
      });
    `

    const blob = new Blob([workerCode], { type: 'application/javascript' })
    const workerUrl = URL.createObjectURL(blob)
    workerRef.current = new Worker(workerUrl)

    // Handle messages from worker
    workerRef.current.onmessage = (
      event: MessageEvent<UploadWorkerResponse>
    ) => {
      const response = event.data

      // Only process messages for current upload
      if (response.id !== currentUploadIdRef.current) {
        return
      }

      switch (response.type) {
        case 'progress':
          setUploadProgress({
            loaded: response.loaded,
            total: response.total,
            percentage: response.percentage,
          })
          // Call progress callback if provided
          progressCallbackRef.current?.({ progress: response.percentage })
          break
      }
    }

    // Cleanup worker on unmount
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        URL.revokeObjectURL(workerUrl)
      }
    }
  }, [])

  /**
   * Upload function using Worker
   */
  const uploadWithWorker = useCallback(
    async (file: File): Promise<FileUploadResult> => {
      return new Promise<FileUploadResult>((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error('Worker not initialized'))
          return
        }

        // Generate upload ID
        const uploadId = generateUploadId()
        currentUploadIdRef.current = uploadId

        // Reset progress
        setUploadProgress(null)

        // Get API URL
        const apiUrl =
          typeof window === 'undefined'
            ? validateEnvPath(process.env.API_URL ?? '', 'API_URL')
            : validateEnvPath(
                process.env.NEXT_PUBLIC_API_URL ?? '',
                'NEXT_PUBLIC_API_URL'
              )

        const url = `${apiUrl}${endpoint}`

        // Set up one-time message handler for this upload
        const handleMessage = (event: MessageEvent<UploadWorkerResponse>) => {
          const response = event.data

          if (response.id !== uploadId) {
            return
          }

          switch (response.type) {
            case 'success': {
              workerRef.current?.removeEventListener('message', handleMessage)
              const result = response.data as FileUploadResult
              
              // Add full URL if not present
              if (!result.url) {
                result.url = `${apiUrl}/storage/files/${result.filename}`
              }
              
              setUploadProgress({ loaded: 100, total: 100, percentage: 100 })
              currentUploadIdRef.current = null
              resolve(result)
              break
            }

            case 'error':
              workerRef.current?.removeEventListener('message', handleMessage)
              setUploadProgress(null)
              currentUploadIdRef.current = null
              reject(new Error(response.error))
              break

            case 'cancelled':
              workerRef.current?.removeEventListener('message', handleMessage)
              setUploadProgress(null)
              currentUploadIdRef.current = null
              reject(new Error('Upload cancelled'))
              break
          }
        }

        workerRef.current.addEventListener('message', handleMessage)

        // Send upload message to worker
        const message: UploadWorkerMessage = {
          type: 'upload',
          id: uploadId,
          file,
          url,
          withCredentials: true,
        }

        workerRef.current.postMessage(message)
        console.log(`[useWorkerFileUpload] Starting upload: ${file.name}`)
      })
    },
    [endpoint]
  )

  /**
   * Create mutation using TanStack Query
   */
  const mutation = useMutation<FileUploadResult, Error, File>({
    mutationFn: uploadWithWorker,
    onSuccess: (data) => {
      toast.success(`${successMessage}: ${data.filename}`)
      options?.onSuccess?.(data, data as any, undefined)
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`)
      options?.onError?.(error, error as any, undefined)
    },
    ...options,
  })

  /**
   * Enhanced reset that also clears progress
   */
  const resetWithProgress = useCallback(() => {
    mutation.reset()
    setUploadProgress(null)
  }, [mutation])

  /**
   * Cancel current upload
   */
  const cancel = useCallback(() => {
    if (workerRef.current && currentUploadIdRef.current) {
      const message: UploadWorkerMessage = {
        type: 'cancel',
        id: currentUploadIdRef.current,
      }
      workerRef.current.postMessage(message)
    }
  }, [])

  /**
   * Mutate with progress callback
   */
  const mutateWithProgress = useCallback(
    (file: File, onProgress?: (event: { progress: number }) => void) => {
      progressCallbackRef.current = onProgress || null
      mutation.mutate(file)
    },
    [mutation]
  )

  /**
   * MutateAsync with progress callback
   */
  const mutateAsyncWithProgress = useCallback(
    async (file: File, onProgress?: (event: { progress: number }) => void) => {
      progressCallbackRef.current = onProgress || null
      return mutation.mutateAsync(file)
    },
    [mutation]
  )

  return {
    // TanStack Query mutation interface
    ...mutation,
    
    // Enhanced mutation methods with progress callback
    mutate: mutateWithProgress,
    mutateAsync: mutateAsyncWithProgress,
    reset: resetWithProgress,
    
    // Additional methods
    cancel,
    
    // Progress state
    uploadProgress: uploadProgress?.percentage ?? 0,
    progressDetail: uploadProgress,
  }
}

/**
 * Composite hook for all Worker-based storage operations
 * Uses TanStack Query mutations under the hood
 * 
 * @param contracts - Optional contracts object (defaults to orpc.storage)
 * 
 * @example
 * ```typescript
 * import { orpc } from '@/lib/orpc'
 * 
 * const storage = useWorkerStorage()
 * storage.uploadImage(file)
 * storage.uploadVideo(file)
 * ```
 */
export function useWorkerStorage(contracts?: {
  uploadImage: any
  uploadVideo: any
  uploadAudio: any
}) {
  // Import orpc lazily to avoid circular dependency issues
  let orpcContracts = contracts
  if (!orpcContracts) {
    const { orpc } = require('@/lib/orpc')
    orpcContracts = orpc.storage
  }
  
  const uploadImage = useWorkerUploadFile(orpcContracts.uploadImage)
  const uploadVideo = useWorkerUploadFile(orpcContracts.uploadVideo)
  const uploadAudio = useWorkerUploadFile(orpcContracts.uploadAudio)

  return {
    // Upload methods
    uploadImage: uploadImage.mutate,
    uploadImageAsync: uploadImage.mutateAsync,
    uploadVideo: uploadVideo.mutate,
    uploadVideoAsync: uploadVideo.mutateAsync,
    uploadAudio: uploadAudio.mutate,
    uploadAudioAsync: uploadAudio.mutateAsync,

    // Cancel methods
    cancel: {
      image: uploadImage.cancel,
      video: uploadVideo.cancel,
      audio: uploadAudio.cancel,
    },

    // Loading states
    isUploading: {
      image: uploadImage.isPending,
      video: uploadVideo.isPending,
      audio: uploadAudio.isPending,
      any:
        uploadImage.isPending ||
        uploadVideo.isPending ||
        uploadAudio.isPending,
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
      video: uploadImage.error,
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
