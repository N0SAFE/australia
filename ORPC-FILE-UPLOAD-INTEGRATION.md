# ORPC File Upload Integration - Implementation Summary

## Overview

Successfully integrated the `withFileUploads` wrapper into the global ORPC client, enabling automatic progress tracking for all file upload endpoints without custom XMLHttpRequest code.

## Changes Made

### 1. Global ORPC Client Integration (`apps/web/lib/orpc/index.ts`)

**Added Import:**
```typescript
import { withFileUploads } from "./withFileUploads";
```

**Wrapped Client:**
```typescript
// Wrap the ORPC client with file upload capabilities for automatic progress tracking
// This enables all routes with z.file() schemas to support onProgress callbacks in the context
export const orpc = createTanstackQueryUtils(withFileUploads(createORPCClientWithCookies()));
```

**Result:** All ORPC routes with `z.file()` schemas now automatically support:
- Progress tracking via `onProgress` callback
- Web Worker-based uploads for non-blocking UI
- Success/error callbacks
- Automatic File detection and enhanced upload handling

### 2. Simplified Upload Hook (`apps/web/hooks/usePresentation.ts`)

**Before:** Custom XMLHttpRequest implementation (~160 lines)
- Manual XHR setup and lifecycle management
- Manual progress event handling
- Manual error handling
- Manual FormData creation
- Manual response parsing

**After:** ORPC-based implementation (~80 lines)
- Uses wrapped ORPC client with automatic file upload detection
- Declarative progress, success, and error callbacks
- Automatic query invalidation
- Cleaner, more maintainable code

**Key Implementation:**
```typescript
const result = await orpc.presentation.upload.call(
  { file },
  {
    onProgress: (progressEvent) => {
      const progress: UploadProgress = {
        loaded: progressEvent.loaded,
        total: progressEvent.total,
        percentage: (progressEvent.loaded / progressEvent.total) * 100,
      }
      setState(prev => ({ ...prev, progress }))
    },
    onSuccess: (data) => {
      setState({
        isUploading: false,
        progress: { loaded: 100, total: 100, percentage: 100 },
        error: null,
        data: data as PresentationUploadResult,
      })
      queryClient.invalidateQueries({ 
        queryKey: orpc.presentation.getCurrent.queryKey({ input: {} })
      })
      toast.success(`Presentation uploaded successfully: ${data.filename}`)
    },
    onError: (error) => {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      setState({
        isUploading: false,
        progress: null,
        error: errorObj,
        data: null,
      })
      toast.error(`Upload failed: ${errorObj.message}`)
    },
  }
)
```

## How It Works

### Automatic Detection
The `withFileUploads` wrapper:

1. **Scans ORPC Routes:** Recursively inspects all routes in the ORPC client
2. **Detects z.file() Schemas:** Uses `schemaAcceptsFiles()` to identify routes with File parameters
3. **Wraps Detected Routes:** Automatically wraps file upload routes with Proxy
4. **Runtime File Check:** Uses `containsFile()` to verify input contains File instances
5. **Web Worker Upload:** Delegates upload to Web Worker with XMLHttpRequest for progress tracking
6. **Preserves Other Routes:** Non-file routes work normally without overhead

### Progress Tracking Flow

```
User Action → orpc.presentation.upload.call({ file }, { onProgress })
            ↓
withFileUploads Proxy detects File in input
            ↓
Creates Web Worker with XMLHttpRequest
            ↓
Worker sends progress events → onProgress callback
            ↓
Component updates progress bar in real-time
            ↓
Upload completes → onSuccess callback → query invalidation
```

## Benefits

### 1. **Global Consistency**
- All file upload endpoints automatically support progress tracking
- No need to write custom XMLHttpRequest code for each upload
- Consistent upload behavior across the application

### 2. **Developer Experience**
- Simple, declarative API: just pass `onProgress` in the context
- Automatic detection - no configuration needed
- Type-safe with full TypeScript inference
- Cleaner hook implementations (50% code reduction)

### 3. **Performance**
- Web Worker-based uploads don't block main thread
- Non-blocking UI during large file uploads
- Automatic cleanup and resource management

### 4. **Maintainability**
- Centralized upload logic in `withFileUploads`
- Easier to update upload behavior globally
- Less code duplication across hooks
- Better separation of concerns

## Usage Pattern

### For Any File Upload Endpoint:

```typescript
// 1. Define contract with z.file() schema
export const uploadVideoContract = o.contract({
  upload: o.route({
    method: 'POST',
    path: '/video/upload',
    summary: 'Upload video file',
    body: z.object({
      file: videoSchema, // Uses shared videoSchema from common/utils/file.ts
    }),
    responses: {
      200: videoResponseSchema,
    },
  }),
})

// 2. Use in component/hook with progress tracking
const result = await orpc.video.upload.call(
  { file },
  {
    onProgress: (progressEvent) => {
      console.log(`${progressEvent.percentage}% uploaded`)
    },
    onSuccess: (data) => {
      toast.success('Upload complete!')
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`)
    },
  }
)
```

### No Special Configuration Required:
- ✅ Automatic detection of z.file() schemas
- ✅ Automatic Web Worker creation
- ✅ Automatic XMLHttpRequest with progress
- ✅ Automatic cleanup on completion/error

## Files Modified

1. **apps/web/lib/orpc/index.ts**
   - Added `withFileUploads` import
   - Wrapped ORPC client with file upload capabilities
   - Added explanatory comment

2. **apps/web/hooks/usePresentation.ts**
   - Replaced custom XMLHttpRequest with ORPC call
   - Added declarative progress/success/error callbacks
   - Added automatic query invalidation
   - Reduced code size by ~50%

## Future File Uploads

All future file upload endpoints will automatically benefit from this integration:

1. **Define Schema:** Use shared schemas from `packages/contracts/api/common/utils/file.ts`
2. **Create Contract:** Standard ORPC contract with z.file() in body
3. **Implement Endpoint:** Standard NestJS controller
4. **Use in Client:** Call with `onProgress` callback - that's it!

## Testing Checklist

- [ ] Presentation video upload works with progress tracking
- [ ] Storage video upload works with progress tracking
- [ ] Storage image upload works with progress tracking
- [ ] Storage audio upload works with progress tracking
- [ ] Progress bar updates smoothly during upload
- [ ] Success toast appears on completion
- [ ] Error toast appears on failure
- [ ] Query cache invalidates correctly after upload
- [ ] Multiple concurrent uploads work correctly
- [ ] Upload cancellation works (if implemented)

## Related Documentation

- **withFileUploads Implementation:** `apps/web/lib/orpc/withFileUploads.ts`
- **Shared File Schemas:** `packages/contracts/api/common/utils/file.ts`
- **Upload Contracts:** 
  - `packages/contracts/api/modules/presentation/upload.ts`
  - `packages/contracts/api/modules/storage/uploadVideo.ts`
  - `packages/contracts/api/modules/storage/uploadImage.ts`
  - `packages/contracts/api/modules/storage/uploadAudio.ts`

## Migration Notes

### From Custom XMLHttpRequest to ORPC Client

**Before:**
```typescript
const xhr = new XMLHttpRequest()
xhr.open('POST', url)
xhr.upload.addEventListener('progress', (e) => { /* ... */ })
xhr.addEventListener('load', () => { /* ... */ })
xhr.addEventListener('error', () => { /* ... */ })
xhr.send(formData)
```

**After:**
```typescript
await orpc.presentation.upload.call(
  { file },
  {
    onProgress: (e) => { /* ... */ },
    onSuccess: (data) => { /* ... */ },
    onError: (error) => { /* ... */ },
  }
)
```

**Advantages:**
- ✅ Type-safe input and output
- ✅ Automatic error handling
- ✅ Cleaner async/await syntax
- ✅ Built-in query invalidation
- ✅ Consistent with other ORPC calls
- ✅ Web Worker handling automatic

## Conclusion

The integration of `withFileUploads` into the global ORPC client provides a seamless, type-safe, and consistent file upload experience throughout the application. Developers can now focus on business logic rather than low-level XMLHttpRequest handling, while users benefit from smooth progress tracking and non-blocking uploads.
