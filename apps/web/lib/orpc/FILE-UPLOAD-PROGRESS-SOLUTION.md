# ORPC File Upload Progress Implementation

## Problem Analysis

### Initial Approach (Failed)

We initially tried to wrap the ORPC client with a Proxy to intercept file upload routes:

```typescript
export const orpc = createTanstackQueryUtils(
  withFileUploads(createORPCClientWithCookies())
);
```

**Why it failed:**

1. `createTanstackQueryUtils` creates its own Proxy wrapper
2. When accessing routes like `orpc.presentation.upload`, TanStack Query's Proxy:
   - Gets properties directly from the underlying client: `(client as any)[prop]`
   - Creates new utils recursively: `createRouterUtils((client as any)[prop], ...)`
   - Completely bypasses our `withFileUploads` Proxy wrapper
3. Our wrapper's Proxy `get` handler was never invoked
4. All uploads used the default fetch API (no progress tracking)

### ORPC Architecture Understanding

From studying the ORPC source code (`@orpc/tanstack-query/src/router-utils.ts`):

```typescript
export function createRouterUtils<T extends NestedClient<any>>(
  client: T,
  options: CreateRouterUtilsOptions = {},
): RouterUtils<T> {
  const recursive = new Proxy({
    ...generalUtils,
    ...procedureUtils,
  }, {
    get(target, prop) {
      const value = Reflect.get(target, prop);
      
      // TanStack Query directly accesses the original client here!
      const nextUtils = createRouterUtils((client as any)[prop], { ...options, path: [...path, prop] });
      
      // ... rest of logic
    },
  })
  
  return recursive as any;
}
```

**Key insight:** TanStack Query's Proxy directly accesses the underlying client's properties, making client-level wrappers ineffective.

## Solution: Link-Level Interception

The correct architectural approach in ORPC is to handle custom behavior at the **Link level**, not by wrapping the client.

### Implementation

We created `FileUploadOpenAPILink` that extends `OpenAPILink`:

```typescript
export class FileUploadOpenAPILink<TContext> extends OpenAPILink<TContext> {
  constructor(contract, options) {
    const originalFetch = options.fetch;
    
    const wrappedFetch = async (request, init, linkOptions) => {
      // Detect file uploads (multipart/form-data)
      const isFileUpload = contentType?.includes('multipart/form-data');
      
      // Get onProgress from context
      const onProgress = linkOptions?.context?.onProgress;
      
      // If file upload with progress callback, use XMLHttpRequest via Worker
      if (isFileUpload && onProgress && typeof window !== 'undefined') {
        return await uploadWithXHR(input, endpoint, onProgress);
      }
      
      // Otherwise, use regular fetch
      return originalFetch ? originalFetch(request, init, linkOptions) : fetch(request, init);
    };
    
    super(contract, { ...options, fetch: wrappedFetch });
  }
}
```

### Why This Works

1. **Correct Layer**: The Link is where actual network requests are made
2. **Preserved by TanStack Query**: TanStack Query doesn't bypass the link - it just wraps the client
3. **Type-Safe**: Works seamlessly with ORPC's type system
4. **Clean Architecture**: Follows ORPC's plugin/link pattern

### Usage

```typescript
// Frontend: Pass onProgress in mutation context
const { mutate } = useMutation(orpc.presentation.upload.mutationOptions());

mutate(
  { file },
  {
    context: {
      onProgress: (event) => {
        console.log(`Upload progress: ${event.percentage}%`);
      }
    }
  }
);
```

The `onProgress` callback is automatically detected at the Link level and XMLHttpRequest is used instead of fetch.

## Technical Details

### XMLHttpRequest via Web Worker

We use XMLHttpRequest because:
- Fetch API doesn't support upload progress events
- XHR's `xhr.upload.addEventListener('progress', ...)` provides real-time progress

We use a Web Worker because:
- Keeps upload processing off the main thread
- Prevents UI blocking during large uploads
- Better performance and user experience

### Automatic Detection

The Link automatically detects file uploads by checking:
1. Content-Type header contains `multipart/form-data`
2. `onProgress` callback exists in context
3. We're in browser environment (not SSR)

If all conditions are met, uses XHR. Otherwise, falls back to regular fetch.

## Benefits

1. **No Code Changes Required**: Existing mutation code works as-is
2. **Type-Safe**: Full TypeScript inference preserved
3. **Architectural Correctness**: Follows ORPC's design patterns
4. **Performance**: Uses Web Worker for large uploads
5. **Fallback**: Gracefully degrades to fetch if XHR fails

## Files Modified

- `apps/web/lib/orpc/file-upload-link.ts` - Custom Link implementation
- `apps/web/lib/orpc/index.ts` - Use FileUploadOpenAPILink instead of OpenAPILink
- `apps/web/lib/orpc/withFileUploads.ts` - ⚠️ **DEPRECATED** - No longer used

## Migration Notes

The old `withFileUploads` wrapper can be removed once we verify the new Link-based approach works correctly. It's been replaced by the more architecturally correct Link-level interception.
