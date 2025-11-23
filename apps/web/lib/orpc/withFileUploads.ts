import { validateEnvPath } from '#/env'
import { toast } from 'sonner'
import type { $ZodType as ZodType, SomeType } from 'zod/v4/core'
import type {
  ZodFile,
  ZodObject,
  ZodArray,
  ZodOptional,
  ZodNullable,
  ZodTransform,
  ZodUnion,
  ZodIntersection,
} from 'zod/v4'

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
 * Context extension for file upload routes
 * This is merged with the existing ORPC context type
 */
export type FileUploadContext = {
  onProgress?: (event: FileUploadProgressEvent) => void
}

/**
 * Options for file upload routes (internal use)
 */
type FileUploadOptions<TResult = unknown> = {
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
    console.log('[uploadWithWorker] Starting upload with options:', {
      endpoint,
      hasOptions: !!options,
      hasOnProgress: !!options?.onProgress,
      onProgressType: typeof options?.onProgress,
      optionsKeys: options ? Object.keys(options) : [],
    })
    
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
          console.log('[uploadWithWorker] Progress event received:', {
            uploadId,
            loaded: response.loaded,
            total: response.total,
            percentage: response.percentage,
            hasOnProgressCallback: !!options?.onProgress,
          })
          
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
      console.log('[schemaAcceptsFiles] Schema is not an object')
      return false
    }

    const def = schema._zod?.def

    if (!def) {
      console.log('[schemaAcceptsFiles] Schema has no _zod.def')
      return false
    }

    console.log('[schemaAcceptsFiles] Checking schema type:', {
      type: def.type,
      defKeys: Object.keys(def),
    })

    // Direct ZodFile check
    if (def.type === 'file') {
      console.log('[schemaAcceptsFiles] ✅ Found file type!')
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

// Import ORPC client types
import type { Client, ClientContext, NestedClient } from '@orpc/client'

/**
 * Type-level detection of File in TypeScript types
 * Returns true if the type contains File at any level
 * Note: This checks the INFERRED TypeScript type, not the Zod schema
 */
type HasFileInType<T> = 
  T extends File ? true :
  T extends Array<infer Element> ? HasFileInType<Element> :
  T extends object ? 
    (keyof T extends never 
      ? false  // Empty object has no keys, no File
      : { [K in keyof T]: HasFileInType<T[K]> }[keyof T] extends never
        ? false  // All properties returned never (impossible case), treat as false
        : { [K in keyof T]: HasFileInType<T[K]> }[keyof T] extends true 
          ? true 
          : false
    ) :
  false

/**
 * Transform a client type to extend context with FileUploadContext ONLY for routes with files
 * Routes without files will NOT have FileUploadContext in their type
 */
type WithFileUploadsClient<T extends NestedClient<any>> = 
  T extends Client<infer UContext, infer UInput, infer UOutput, infer UError>
    ? HasFileInType<UInput> extends true
      ? Client<UContext & FileUploadContext, UInput, UOutput, UError>
      : Client<UContext, UInput, UOutput, UError>
    : {
        [K in keyof T]: T[K] extends NestedClient<any> 
          ? WithFileUploadsClient<T[K]>
          : T[K]
      }

/**
 * Wrap a route function to handle file uploads with Web Worker
 * Returns a client with extended context type that includes FileUploadContext
 */
function wrapRouteWithFileUpload<
  TClientContext extends ClientContext,
  TInput,
  TOutput,
  TError
>(
  procedure: Client<TClientContext, TInput, TOutput, TError>,
  contract: ORPCContract
): Client<TClientContext & FileUploadContext, TInput, TOutput, TError> {
  const endpoint = getEndpointFromContract(contract)
  const successMessage = getSuccessMessage(contract)

  // Create a wrapper function that matches ORPC's Client signature
  // Client accepts (...rest: ClientRest<TClientContext, TInput>) which is a conditional tuple
  const wrappedFunction = (async (...rest: any[]) => {
    // Extract input and options from the ClientRest tuple
    // rest can be [input], [input, options], or []
    const [input, options] = rest as [unknown, { context?: FileUploadContext } | undefined]
    
    console.log('[withFileUploads] Wrapper called with:', {
      restLength: rest.length,
      hasOptions: !!options,
      hasContext: !!options?.context,
      hasOnProgress: !!options?.context?.onProgress,
      optionsKeys: options ? Object.keys(options) : [],
      contextKeys: options?.context ? Object.keys(options.context) : [],
      options: options,
    })
    
    // Extract onProgress from options.context if it exists
    const onProgress = options?.context?.onProgress

    // Build FileUploadOptions from context
    const fileUploadOptions: FileUploadOptions | undefined = onProgress 
      ? { onProgress }
      : undefined
    
    console.log('[withFileUploads] onProgress callback:', {
      exists: !!onProgress,
      type: typeof onProgress,
      fileUploadOptions: fileUploadOptions ? 'created' : 'undefined',
    })

    try {
      // Check if input actually contains files at runtime
      if (!containsFile(input)) {
        // No files found, use regular ORPC call
        console.log('[withFileUploads] No files detected, using standard ORPC call')
        return await procedure(...rest as any)
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
  }) as Client<TClientContext & FileUploadContext, TInput, TOutput, TError>

  // Return the wrapped function directly
  // ORPC clients are just functions, not objects with methods
  return wrappedFunction
}

/**
 * Recursively wrap an ORPC client to enhance routes with file uploads
 * Routes with z.file() will have their context extended with FileUploadContext
 */
function wrapClientWithFileUploads<T extends NestedClient<any>>(
  client: T,
  parentPath: string[] = []
): WithFileUploadsClient<T> {
  console.log(`[wrapClientWithFileUploads] Wrapping client at path: ${parentPath.join('.') || 'root'}`, {
    clientType: typeof client,
    isObject: typeof client === 'object',
    isNull: client === null,
  })
  
  console.log(client)
  
  if (!client || typeof client !== 'object') {
    console.log(`[wrapClientWithFileUploads] Client is not an object, returning as-is`)
    return client as WithFileUploadsClient<T>
  }

  // Create a proxy to intercept property access
  return new Proxy(client as object, {
    get(target, prop) {
      console.log(`[wrapClientWithFileUploads] Accessing property: ${String(prop)} on path: ${parentPath.join('.') || 'root'}`)
      if (typeof prop === 'symbol' || prop === 'then') {
        return Reflect.get(target, prop)
      }

      const value = Reflect.get(target, prop)
      const currentPath = [...parentPath, prop as string]

      console.log(`[wrapClientWithFileUploads] Accessing property: ${currentPath.join('.')}`, {
        valueType: typeof value,
        isFunction: typeof value === 'function',
        hasOrpcMetadata: typeof value === 'function' && '~orpc' in value,
      })

      // Check if this is a procedure (function) with ORPC contract metadata
      if (typeof value === 'function' && '~orpc' in value) {
        const contract = value as ORPCContract
        const hasFiles = hasFileInput(contract)
        
        console.log(`[wrapClientWithFileUploads] Found ORPC procedure: ${currentPath.join('.')}`, {
          hasFiles,
          contractMetadata: contract?.['~orpc'],
        })
        
        if (hasFiles) {
          // This is a file upload route - wrap it
          console.log(`[withFileUploads] ✅ Wrapping file upload route: ${currentPath.join('.')}`)
          return wrapRouteWithFileUpload(value as any, contract)
        }
        
        // It's a procedure but doesn't have file input, return as-is
        console.log(`[withFileUploads] ❌ Route has no file input, returning as-is: ${currentPath.join('.')}`)
        return value
      }

      // If it's an object (router), recursively wrap it
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        console.log(`[wrapClientWithFileUploads] Recursively wrapping nested object: ${currentPath.join('.')}`)
        return wrapClientWithFileUploads(value, currentPath)
      }

      console.log(`[wrapClientWithFileUploads] Returning value as-is for: ${currentPath.join('.')}`)
      return value
    },
  }) as WithFileUploadsClient<T>
}

/**
 * Wrap an ORPC client instance to automatically handle file uploads using Web Workers
 * 
 * Routes with z.file() in their schemas will have their context extended with FileUploadContext.
 * This enables type-safe onProgress callbacks without requiring 'as any' casts.
 * 
 * @param orpcClient - The ORPC client instance to wrap
 * @returns Enhanced ORPC client with FileUploadContext in file upload routes
 * 
 * @example
 * ```typescript
 * import { withFileUploads } from '@/lib/orpc/withFileUploads'
 * 
 * const orpc = createTanstackQueryUtils(
 *   withFileUploads(createORPCClientWithCookies())
 * )
 * 
 * // TypeScript will now recognize onProgress in context for file upload routes
 * const result = await orpc.presentation.upload.call(
 *   { file },
 *   { onProgress: (e) => console.log(`Progress: ${e.percentage}%`) }
 * )
 * ```
 */
export function withFileUploads<T extends NestedClient<any>>(
  orpcClient: T
): WithFileUploadsClient<T> {
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
export function useFileUploadRoutes<T extends NestedClient<any>>(
  orpcClient: T
): WithFileUploadsClient<T> {
  // In React, we can memoize the wrapped client
  // For now, we'll just return the wrapped client
  // In a real implementation, we'd use useMemo
  return withFileUploads(orpcClient)
}
