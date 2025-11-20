import { validateEnvPath } from '#/env'
import { toast } from 'sonner'

/**
 * Progress event for file uploads
 */
export type FileUploadProgressEvent = {
  loaded: number
  total: number
  percentage: number
  progress: number // alias for percentage
}

/**
 * Options for file upload routes
 */
export type FileUploadOptions = {
  onProgress?: (event: FileUploadProgressEvent) => void
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
  signal?: AbortSignal
}

/**
 * Upload worker message types
 */
type UploadWorkerMessage =
  | { type: 'upload'; id: string; file: File; url: string; withCredentials: boolean }
  | { type: 'cancel'; id: string }

type UploadWorkerResponse =
  | { type: 'progress'; id: string; loaded: number; total: number; percentage: number }
  | { type: 'success'; id: string; data: any }
  | { type: 'error'; id: string; error: string }
  | { type: 'cancelled'; id: string }

/**
 * Generate unique upload ID
 */
function generateUploadId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Create a Web Worker for file uploads
 */
function createUploadWorker(): Worker {
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
  return new Worker(workerUrl)
}

/**
 * Shared worker instance for all file uploads
 */
let sharedWorker: Worker | null = null

function getOrCreateWorker(): Worker {
  if (!sharedWorker) {
    sharedWorker = createUploadWorker()
  }
  return sharedWorker
}

/**
 * Upload a file using Web Worker and XMLHttpRequest
 */
async function uploadFileWithWorker(
  file: File,
  endpoint: string,
  options?: FileUploadOptions
): Promise<any> {
  return new Promise((resolve, reject) => {
    const worker = getOrCreateWorker()
    const uploadId = generateUploadId()

    // Get API URL
    const apiUrl =
      typeof window === 'undefined'
        ? validateEnvPath(process.env.API_URL ?? '', 'API_URL')
        : validateEnvPath(
            process.env.NEXT_PUBLIC_API_URL ?? '',
            'NEXT_PUBLIC_API_URL'
          )

    const url = `${apiUrl}${endpoint}`

    // Handle abort signal
    const abortHandler = () => {
      worker.postMessage({ type: 'cancel', id: uploadId } as UploadWorkerMessage)
      reject(new Error('Upload cancelled'))
    }

    if (options?.signal) {
      options.signal.addEventListener('abort', abortHandler)
    }

    // Message handler for this specific upload
    const messageHandler = (event: MessageEvent<UploadWorkerResponse>) => {
      const response = event.data

      if (response.id !== uploadId) {
        return
      }

      switch (response.type) {
        case 'progress':
          options?.onProgress?.({
            loaded: response.loaded,
            total: response.total,
            percentage: response.percentage,
            progress: response.percentage,
          })
          break

        case 'success': {
          worker.removeEventListener('message', messageHandler)
          if (options?.signal) {
            options.signal.removeEventListener('abort', abortHandler)
          }

          const result = response.data
          // Add full URL if not present
          if (result && !result.url && result.filename) {
            result.url = `${apiUrl}/storage/files/${result.filename}`
          }

          options?.onSuccess?.(result)
          resolve(result)
          break
        }

        case 'error':
          worker.removeEventListener('message', messageHandler)
          if (options?.signal) {
            options.signal.removeEventListener('abort', abortHandler)
          }

          const error = new Error(response.error)
          options?.onError?.(error)
          reject(error)
          break

        case 'cancelled':
          worker.removeEventListener('message', messageHandler)
          if (options?.signal) {
            options.signal.removeEventListener('abort', abortHandler)
          }

          const cancelError = new Error('Upload cancelled')
          options?.onError?.(cancelError)
          reject(cancelError)
          break
      }
    }

    worker.addEventListener('message', messageHandler)

    // Send upload message
    const message: UploadWorkerMessage = {
      type: 'upload',
      id: uploadId,
      file,
      url,
      withCredentials: true,
    }

    worker.postMessage(message)
    console.log(`[withFileUploads] Starting upload: ${file.name}`)
  })
}

/**
 * Check if a contract route has file input
 */
function hasFileInput(contract: any): boolean {
  try {
    const orpcMetadata = contract?.['~orpc']
    const inputSchema = orpcMetadata?.inputSchema

    // Check if the input schema contains a 'file' field
    if (inputSchema && typeof inputSchema === 'object') {
      // Zod schemas have a _def property
      const def = (inputSchema as any)._def
      if (def?.typeName === 'ZodObject') {
        const shape = def.shape?.()
        return shape && 'file' in shape
      }
    }

    return false
  } catch {
    return false
  }
}

/**
 * Get endpoint path from contract
 */
function getEndpointFromContract(contract: any): string {
  const orpcMetadata = contract?.['~orpc']
  if (orpcMetadata?.route?.path) {
    return orpcMetadata.route.path
  }
  throw new Error('Cannot extract endpoint path from contract')
}

/**
 * Get success message from contract
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
 * Wrap a route function to handle file uploads with Web Worker
 */
function wrapRouteWithFileUpload(routeFunction: any, contract: any): any {
  const endpoint = getEndpointFromContract(contract)
  const successMessage = getSuccessMessage(contract)

  // Return a function that accepts (file, options) and handles the upload
  return async (file: File, options?: FileUploadOptions) => {
    try {
      const result = await uploadFileWithWorker(file, endpoint, options)
      toast.success(`${successMessage}: ${result.filename || 'file'}`)
      return result
    } catch (error) {
      if (error instanceof Error && error.message !== 'Upload cancelled') {
        toast.error(`Upload failed: ${error.message}`)
      }
      throw error
    }
  }
}

/**
 * Recursively wrap an ORPC client to enhance routes with file uploads
 */
function wrapClientWithFileUploads(client: any, parentPath: string[] = []): any {
  if (!client || typeof client !== 'object') {
    return client
  }

  // Create a proxy to intercept property access
  return new Proxy(client, {
    get(target, prop) {
      if (typeof prop === 'symbol' || prop === 'then') {
        return target[prop]
      }

      const value = target[prop]
      const currentPath = [...parentPath, prop as string]

      // Check if this is a route with file input
      if (value && typeof value === 'object' && value['~orpc']) {
        if (hasFileInput(value)) {
          // This is a file upload route - wrap it
          console.log(`[withFileUploads] Wrapping route: ${currentPath.join('.')}`)
          return wrapRouteWithFileUpload(value, value)
        }
      }

      // If it's an object (router), recursively wrap it
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return wrapClientWithFileUploads(value, currentPath)
      }

      return value
    },
  })
}

/**
 * Wrap an ORPC client instance to automatically handle file uploads using Web Workers
 * 
 * This function enhances ORPC client methods that have file inputs to automatically
 * use XMLHttpRequest with Web Workers for non-blocking uploads with progress tracking.
 * 
 * @param orpcClient - The ORPC client instance to wrap
 * @returns Enhanced ORPC client with automatic file upload handling
 * 
 * @example
 * ```typescript
 * import { orpc } from '@/lib/orpc'
 * import { withFileUploads } from '@/lib/orpc/withFileUploads'
 * 
 * const orpcWithUploads = withFileUploads(orpc)
 * 
 * // Now you can call file upload routes directly with progress tracking
 * const result = await orpcWithUploads.storage.uploadImage(file, {
 *   onProgress: (e) => console.log(`Progress: ${e.percentage}%`),
 *   onSuccess: (data) => console.log('Uploaded:', data),
 *   onError: (error) => console.error('Error:', error)
 * })
 * ```
 */
export function withFileUploads<T>(orpcClient: T): T {
  return wrapClientWithFileUploads(orpcClient) as T
}

/**
 * Hook version of withFileUploads for use in React components
 * 
 * @example
 * ```typescript
 * import { orpc } from '@/lib/orpc'
 * import { useFileUploadRoutes } from '@/lib/orpc/withFileUploads'
 * 
 * function MyComponent() {
 *   const orpcWithUploads = useFileUploadRoutes(orpc)
 *   
 *   const handleUpload = async (file: File) => {
 *     const result = await orpcWithUploads.storage.uploadImage(file, {
 *       onProgress: (e) => setProgress(e.percentage)
 *     })
 *   }
 * }
 * ```
 */
export function useFileUploadRoutes<T>(orpcClient: T): T {
  // In React, we can memoize the wrapped client
  // For now, we'll just return the wrapped client
  // In a real implementation, we'd use useMemo
  return withFileUploads(orpcClient)
}
