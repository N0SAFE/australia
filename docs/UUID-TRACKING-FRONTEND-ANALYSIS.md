# UUID-Based Operation Tracking - Frontend Implementation Analysis

## Current State

### ✅ **Backend Implementation (COMPLETE)**
- Event system supports UUID-based operation tracking
- PARALLEL strategy uses `operationId` (UUID)
- QUEUE strategy uses `operationId` (UUID) + `index` (position)
- `subscribe()` accepts optional `operationId` parameter for targeted subscriptions
- `emit()` wraps outputs with appropriate structure based on strategy
- `startProcessing()` returns `operationId` for tracking
- Video processing service integrated with `operationId` tracking

### ❌ **Frontend Implementation (NEEDS UPDATES)**

#### 1. **ORPC Contract** (`packages/contracts/api/modules/storage/subscribeVideoProcessing.ts`)

**Current:**
```typescript
.input(
  z.object({
    videoId: z.string().uuid(),
  })
)
.output(
  eventIterator(
    z.object({
      progress: z.number().min(0).max(100),
      status: z.enum(['processing', 'completed', 'failed']),
      message: z.string().optional(),
      metadata: z.any().optional(),
      timestamp: z.string(),
    })
  )
);
```

**Issues:**
- ❌ Missing optional `operationId` field in input for targeted subscriptions
- ❌ Output doesn't include `operationId` field (can't identify which operation)

**Needed:**
```typescript
.input(
  z.object({
    videoId: z.string().uuid(),
    operationId: z.string().uuid().optional(), // NEW: Target specific operation
  })
)
.output(
  eventIterator(
    z.object({
      operationId: z.string(), // NEW: Identify which operation
      progress: z.number().min(0).max(100),
      status: z.enum(['processing', 'completed', 'failed']),
      message: z.string().optional(),
      metadata: z.any().optional(),
      timestamp: z.string(),
    })
  )
);
```

#### 2. **Storage Controller** (`apps/api/src/modules/storage/controllers/storage.controller.ts`)

**Current:**
```typescript
subscribeVideoProcessing() {
  const storageEventService = this.storageEventService;
  return implement(storageContract.subscribeVideoProcessing).handler(async function* ({ input }) {
    const { videoId } = input;
    const subscription = storageEventService.subscribe("videoProcessing", { videoId });
    
    for await (const eventData of subscription) {
      yield eventData;
      if (eventData.status === "completed" || eventData.status === "failed") {
        break;
      }
    }
  });
}
```

**Issues:**
- ❌ Doesn't pass `operationId` to `subscribe()` method
- ❌ Doesn't extract `operationId` from input
- ❌ Returns raw event data without `operationId` wrapper

**Needed:**
```typescript
subscribeVideoProcessing() {
  const storageEventService = this.storageEventService;
  return implement(storageContract.subscribeVideoProcessing).handler(async function* ({ input }) {
    const { videoId, operationId } = input; // Extract operationId
    
    // Pass operationId for targeted subscription (or omit for all operations)
    const subscription = storageEventService.subscribe(
      "videoProcessing", 
      { videoId },
      operationId ? { operationId } : undefined // NEW: Target specific operation
    );
    
    for await (const eventData of subscription) {
      // eventData already includes operationId from base-event.service.ts
      yield eventData;
      if (eventData.status === "completed" || eventData.status === "failed") {
        break;
      }
    }
  });
}
```

#### 3. **Upload Video Response** (`apps/api/src/modules/storage/controllers/storage.controller.ts`)

**Current:**
```typescript
// Start async video processing (non-blocking)
this.videoProcessingService.startProcessing(dbResult.videoMetadata.id, absoluteFilePath);

return {
  filename: multerMetadata.filename,
  path: `/storage/files/${multerMetadata.filename}`,
  size: input.file.size,
  mimeType: input.file.type,
  fileId: dbResult.file.id,
  videoId: dbResult.videoMetadata.id,
  isProcessed: false,
  // ... other fields
};
```

**Issues:**
- ❌ Doesn't capture `operationId` from `startProcessing()`
- ❌ Doesn't return `operationId` to client for tracking

**Needed:**
```typescript
// Capture operationId from startProcessing
const operationId = await this.videoProcessingService.startProcessing(
  dbResult.videoMetadata.id, 
  absoluteFilePath
);

return {
  filename: multerMetadata.filename,
  path: `/storage/files/${multerMetadata.filename}`,
  size: input.file.size,
  mimeType: input.file.type,
  fileId: dbResult.file.id,
  videoId: dbResult.videoMetadata.id,
  operationId, // NEW: Return operationId for tracking
  isProcessed: false,
  // ... other fields
};
```

#### 4. **Upload Video Contract Output** (`packages/contracts/api/modules/storage/uploadVideo.ts`)

**Current:**
```typescript
export const uploadVideoOutput = z.object({
  filename: z.string(),
  path: z.string(),
  size: z.number(),
  mimeType: z.string(),
});
```

**Issues:**
- ❌ Missing `operationId` field

**Needed:**
```typescript
export const uploadVideoOutput = z.object({
  filename: z.string(),
  path: z.string(),
  size: z.number(),
  mimeType: z.string(),
  fileId: z.string().uuid(), // Add fileId
  videoId: z.string().uuid(), // Add videoId
  operationId: z.string().uuid().optional(), // NEW: Operation tracking
  isProcessed: z.boolean(), // Add processing status
  message: z.string().optional(), // Add message
});
```

#### 5. **Frontend Hook** (`apps/web/hooks/useStorage.ts`)

**Current:**
```typescript
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
```

**Issues:**
- ❌ No hook for subscribing to video processing events
- ❌ No support for tracking progress with `operationId`

**Needed:**
```typescript
/**
 * Hook to subscribe to video processing progress
 * Accepts optional operationId for targeted subscription
 */
export function useVideoProcessing(videoId: string, operationId?: string) {
  const [progress, setProgress] = useState<number>(0)
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle')
  const [message, setMessage] = useState<string>()
  
  useEffect(() => {
    if (!videoId) return
    
    const abortController = new AbortController()
    
    async function subscribe() {
      try {
        // Subscribe with optional operationId for targeted tracking
        for await (const event of orpc.storage.subscribeVideoProcessing({ 
          videoId,
          operationId // NEW: Target specific operation
        })) {
          setProgress(event.progress)
          setStatus(event.status)
          setMessage(event.message)
          
          if (event.status === 'completed' || event.status === 'failed') {
            break
          }
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error('Subscription error:', error)
          setStatus('failed')
        }
      }
    }
    
    void subscribe()
    
    return () => {
      abortController.abort()
    }
  }, [videoId, operationId])
  
  return {
    progress,
    status,
    message,
    isProcessing: status === 'processing',
    isCompleted: status === 'completed',
    isFailed: status === 'failed',
  }
}

/**
 * Enhanced upload hook with processing subscription
 */
export function useUploadVideoWithProgress() {
  const [uploadedVideoId, setUploadedVideoId] = useState<string>()
  const [operationId, setOperationId] = useState<string>()
  
  const uploadMutation = useMutation(orpc.storage.uploadVideo.mutationOptions({
    onSuccess: (result) => {
      setUploadedVideoId(result.videoId)
      setOperationId(result.operationId) // NEW: Capture operationId
      toast.success(`Video uploaded: ${result.filename}`)
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`)
    },
  }))
  
  // Auto-subscribe to processing if videoId and operationId available
  const processing = useVideoProcessing(uploadedVideoId!, operationId)
  
  return {
    upload: uploadMutation.mutate,
    uploadAsync: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    uploadError: uploadMutation.error,
    uploadData: uploadMutation.data,
    
    // Processing status
    ...processing,
    videoId: uploadedVideoId,
    operationId, // NEW: Expose operationId for manual tracking
  }
}
```

#### 6. **Component Usage** (`apps/web/components/blocks/editor-00/plate-editor.tsx`)

**Current:**
```typescript
const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const result = await storage.uploadVideoAsync({ file });
    const videoUrl = getStorageUrl(`files/${result.filename}`);
    
    (editor as any).insertNodes({
      type: 'video',
      url: videoUrl,
      isUpload: true,
      children: [{ text: '' }],
    });
    
    toast.success('Video uploaded and inserted');
  } catch (error) {
    toast.error(`Video upload failed: ${error.message}`);
  }
};
```

**Issues:**
- ❌ No progress tracking during processing
- ❌ Inserts video immediately (before processing complete)
- ❌ No visual feedback for processing status

**Needed:**
```typescript
// Use the enhanced hook
const videoUpload = useUploadVideoWithProgress()

const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const result = await videoUpload.uploadAsync({ file });
    const videoUrl = getStorageUrl(`files/${result.filename}`);
    
    // Show processing status with operationId tracking
    toast.info(`Processing video (ID: ${result.operationId?.substring(0, 8)}...)`)
    
    // Insert video node with processing info
    (editor as any).insertNodes({
      type: 'video',
      url: videoUrl,
      isUpload: true,
      videoId: result.videoId,
      operationId: result.operationId, // NEW: Track operation
      isProcessing: true, // NEW: Mark as processing
      children: [{ text: '' }],
    });
    
  } catch (error) {
    toast.error(`Upload failed: ${error.message}`);
  }
};

// Display processing progress in component
{videoUpload.isProcessing && (
  <div className="fixed bottom-4 right-4 bg-white p-4 shadow-lg rounded-lg">
    <p className="text-sm font-medium">Processing Video</p>
    <p className="text-xs text-gray-500">Operation: {videoUpload.operationId?.substring(0, 8)}...</p>
    <div className="mt-2 w-64 bg-gray-200 rounded-full h-2">
      <div 
        className="bg-blue-600 h-2 rounded-full transition-all"
        style={{ width: `${videoUpload.progress}%` }}
      />
    </div>
    <p className="text-xs text-gray-600 mt-1">{videoUpload.message}</p>
  </div>
)}
```

## Summary of Required Changes

### 🔴 **HIGH PRIORITY** (Breaking Changes)

1. **Update ORPC Contract** - Add `operationId` to input and output schemas
2. **Update Upload Response** - Return `operationId` from `uploadVideo` endpoint
3. **Update Storage Controller** - Pass `operationId` to subscribe method

### 🟡 **MEDIUM PRIORITY** (New Features)

4. **Create Frontend Hooks** - `useVideoProcessing()` and `useUploadVideoWithProgress()`
5. **Update Component Usage** - Display progress with `operationId` tracking

### 🟢 **LOW PRIORITY** (Enhancements)

6. **Create Video Progress Component** - Reusable component for displaying progress
7. **Add Progress Persistence** - Store progress state in localStorage/React Context
8. **Handle Multiple Operations** - UI for tracking multiple concurrent uploads

## Implementation Order

1. ✅ **Backend event system** - COMPLETE (UUID tracking implemented)
2. 🔴 **Update contracts** - Add `operationId` fields (NEXT)
3. 🔴 **Update controller** - Capture and return `operationId` (NEXT)
4. 🟡 **Create hooks** - Frontend subscription and tracking (AFTER contracts)
5. 🟡 **Update components** - Display progress UI (FINAL)

## Testing Checklist

- [ ] Upload video returns `operationId`
- [ ] Subscribe with `operationId` receives only targeted events
- [ ] Subscribe without `operationId` receives all operations for videoId
- [ ] Multiple concurrent uploads tracked independently
- [ ] Progress updates display correct `operationId`
- [ ] Abort operation targets correct UUID
- [ ] Completed operations clean up subscriptions

## Migration Notes

**Backward Compatibility:**
- Making `operationId` optional maintains backward compatibility
- Existing clients without `operationId` will receive all operations
- New clients can opt-in to targeted tracking

**Database Changes:**
- No database schema changes required
- `operationId` is runtime-only (not persisted)
- Consider adding `operationId` to processing logs if needed
