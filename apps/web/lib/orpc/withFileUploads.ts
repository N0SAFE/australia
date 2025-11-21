import { validateEnvPath } from '#/env'
import { toast } from 'sonner'
import type { $ZodType as ZodType } from 'zod/v4/core'

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
export type FileUploadOptions<TResult = unknown> = {
  onProgress?: (event: FileUploadProgressEvent) => void
  onSuccess?: (data: TResult) => void
  onError?: (error: Error) => void
  signal?: AbortSignal
}

/**
 * Upload worker message types
 */
type UploadWorkerMessage =
  | { type: 'upload'; id: string; input: unknown; url: string; withCredentials: boolean }
  | { type: 'cancel'; id: string }

type UploadWorkerResponse =
  | { type: 'progress'; id: string; loaded: number; total: number; percentage: number }
  | { type: 'success'; id: string; data: unknown }
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

    /**
     * Recursively build FormData from input, handling Files at any level
     */
    function buildFormData(formData, input, parentKey = '') {
      if (input instanceof File) {
        // Direct File at this level
        const key = parentKey || 'file';
        formData.append(key, input);
      } else if (Array.isArray(input)) {
        // Array - append each item with indexed key
        input.forEach((item, index) => {
          const key = parentKey ? \`\${parentKey}.\${index}\` : String(index);
          buildFormData(formData, item, key);
        });
      } else if (input && typeof input === 'object') {
        // Object - recursively process properties
        Object.entries(input).forEach(([key, value]) => {
          const fullKey = parentKey ? \`\${parentKey}.\${key}\` : key;
          buildFormData(formData, value, fullKey);
        });
      } else if (input !== undefined && input !== null) {
        // Primitive value
        formData.append(parentKey, String(input));
      }
    }

    function handleUpload(id, input, url, withCredentials) {
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
      buildFormData(formData, input);
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
          handleUpload(message.id, message.input, message.url, message.withCredentials);
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
 * Upload data with files using Web Worker and XMLHttpRequest
 */
async function uploadWithWorker<TResult = unknown>(
  input: unknown,
  endpoint: string,
  options?: FileUploadOptions<TResult>
): Promise<TResult> {
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

          const result = response.data as TResult
          // Add full URL if not present
          if (result && typeof result === 'object' && 'filename' in result && !('url' in result)) {
            (result as Record<string, unknown>).url = `${apiUrl}/storage/files/${(result as Record<string, unknown>).filename}`
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
      input,
      url,
      withCredentials: true,
    }

    worker.postMessage(message)
    
    // Log appropriate message based on input type
    const fileName = input instanceof File ? input.name : 'data with files'
    console.log(`[withFileUploads] Starting upload: ${fileName}`)
  })
}

/**
 * Recursively check if a value contains any File objects
 */
function containsFile(value: unknown): boolean {
  if (value instanceof File) {
    return true
  }

  if (Array.isArray(value)) {
    return value.some((item) => containsFile(item))
  }

  if (value && typeof value === 'object') {
    return Object.values(value).some((val) => containsFile(val))
  }

  return false
}

/**
 * Check if a Zod schema allows File input at any level
 */
function schemaAcceptsFiles(schema: ZodType): boolean {
  try {
    if (!schema || typeof schema !== 'object') {
      return false
    }

    const def = schema._zod?.def

    if (!def) {
      return false
    }

    // Direct ZodFile check
    if (def.type === 'file') {
      return true
    }

    // Transform - check inner type
    if (def.type === 'transform') {
      const transformDef = def as { in?: ZodType }
      const innerSchema = transformDef.in
      return innerSchema ? schemaAcceptsFiles(innerSchema) : false
    }

    // Optional/Nullable - check inner type
    if (def.type === 'optional' || def.type === 'nullable') {
      const wrapperDef = def as { innerType?: ZodType }
      return wrapperDef.innerType ? schemaAcceptsFiles(wrapperDef.innerType) : false
    }

    // Object - check all fields
    if (def.type === 'object') {
      const objectDef = def as { shape?: Record<string, ZodType> }
      const shape = objectDef.shape
      if (shape && typeof shape === 'object') {
        return Object.values(shape).some((fieldSchema: ZodType) => 
          fieldSchema && schemaAcceptsFiles(fieldSchema)
        )
      }
    }

    // Array - check element type
    if (def.type === 'array') {
      const arrayDef = def as { element?: ZodType }
      return arrayDef.element ? schemaAcceptsFiles(arrayDef.element) : false
    }

    // Union - check all options
    if (def.type === 'union') {
      const unionDef = def as { options?: ZodType[] }
      const options = unionDef.options || []
      return Array.isArray(options) && options.some((option: ZodType) => 
        option && schemaAcceptsFiles(option)
      )
    }

    // Intersection - check both sides
    if (def.type === 'intersection') {
      const intersectionDef = def as { left?: ZodType; right?: ZodType }
      return Boolean(
        (intersectionDef.left && schemaAcceptsFiles(intersectionDef.left)) || 
        (intersectionDef.right && schemaAcceptsFiles(intersectionDef.right))
      )
    }

    return false
  } catch {
    return false
  }
}

/**
 * ORPC Contract metadata type
 */
type ORPCContract = {
  '~orpc'?: {
    inputSchema?: ZodType
    route?: {
      path?: string
      summary?: string
    }
  }
}

/**
 * Check if a contract route has file input at any level
 */
function hasFileInput(contract: ORPCContract): boolean {
  try {
    const orpcMetadata = contract?.['~orpc']
    const inputSchema = orpcMetadata?.inputSchema

    if (!inputSchema) {
      return false
    }

    return schemaAcceptsFiles(inputSchema)
  } catch {
    return false
  }
}

/**
 * Get endpoint path from contract
 */
function getEndpointFromContract(contract: ORPCContract): string {
  const orpcMetadata = contract?.['~orpc']
  if (orpcMetadata?.route?.path) {
    return orpcMetadata.route.path
  }
  throw new Error('Cannot extract endpoint path from contract')
}

/**
 * Get success message from contract
 */
function getSuccessMessage(contract: ORPCContract): string {
  const orpcMetadata = contract?.['~orpc']
  const summary = orpcMetadata?.route?.summary

  if (summary) {
    return summary.replace('Upload', 'Uploaded').replace('upload', 'uploaded')
  }

  return 'File uploaded successfully'
}

/**
 * ORPC Procedure type (has call methods and utilities)
 */
type ORPCProcedure = {
  (input: unknown, options?: unknown): Promise<unknown>
  [key: string]: unknown
}

/**
 * Wrap a route function to handle file uploads with Web Worker
 */
function wrapRouteWithFileUpload<TProcedure extends ORPCProcedure>(
  procedure: TProcedure,
  contract: ORPCContract
): TProcedure {
  const endpoint = getEndpointFromContract(contract)
  const successMessage = getSuccessMessage(contract)

  // Create a wrapper function that handles file uploads
  const wrappedFunction = async (input: unknown, options?: unknown): Promise<unknown> => {
    // Check if this is a FileUploadOptions (has onProgress callback)
    const isFileUploadOptions = options && typeof options === 'object' && 'onProgress' in options
    const fileUploadOptions = isFileUploadOptions ? options as FileUploadOptions : undefined

    try {
      // Check if input actually contains files at runtime
      if (!containsFile(input)) {
        // No files found, use regular ORPC call
        console.log('[withFileUploads] No files detected, using standard ORPC call')
        return await procedure(input, options)
      }

      const result = await uploadWithWorker(input, endpoint, fileUploadOptions)
      const fileName = result && typeof result === 'object' && 'filename' in result 
        ? (result as Record<string, unknown>).filename as string
        : 'file'
      toast.success(`${successMessage}: ${fileName}`)
      return result
    } catch (error) {
      if (error instanceof Error && error.message !== 'Upload cancelled') {
        toast.error(`Upload failed: ${error.message}`)
      }
      throw error
    }
  }

  // Copy all properties and methods from the original procedure
  // This preserves ORPC utilities like useQuery, useMutation, etc.
  return Object.assign(wrappedFunction, procedure) as TProcedure
}

/**
 * Recursively wrap an ORPC client to enhance routes with file uploads
 */
function wrapClientWithFileUploads<T>(
  client: T,
  parentPath: string[] = []
): T {
  if (!client || typeof client !== 'object') {
    return client
  }

  // Create a proxy to intercept property access
  return new Proxy(client as object, {
    get(target, prop) {
      if (typeof prop === 'symbol' || prop === 'then') {
        return Reflect.get(target, prop)
      }

      const value = Reflect.get(target, prop)
      const currentPath = [...parentPath, prop as string]

      // Check if this is a route with file input
      if (value && typeof value === 'object' && '~orpc' in value) {
        if (hasFileInput(value as ORPCContract)) {
          // This is a file upload route - wrap it
          console.log(`[withFileUploads] Wrapping route: ${currentPath.join('.')}`)
          return wrapRouteWithFileUpload(value as ORPCProcedure, value as ORPCContract)
        }
      }

      // If it's an object (router), recursively wrap it
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return wrapClientWithFileUploads(value, currentPath)
      }

      return value
    },
  }) as T
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
  return wrapClientWithFileUploads(orpcClient)
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
