# Video Processing Progress Integration

This document explains how to integrate video processing progress tracking with Tiptap video nodes in the editor.

## Overview

The video node in the Tiptap editor now supports displaying a real-time progress bar during video processing. This feature shows users the processing status directly above the video element.

## Components

### 1. Video Node Component (`video-node.tsx`)
- Displays a progress bar at the top of the video when processing is active
- Subscribes to progress updates via the editor extension options
- Automatically shows/hides progress based on processing status

### 2. Video Node Extension (`video-node-extension.ts`)
- Defines configuration options for progress callbacks:
  - `onProgressUpdate`: Subscribe to progress updates for a specific video
  - `enableProgress`: Show the progress bar for a video
  - `disableProgress`: Hide the progress bar for a video

### 3. Progress Hook (`useVideoProcessingProgress.ts`)
- Manages progress callbacks and state for multiple videos
- Provides methods to update progress from external sources (WebSocket, SSE, polling)

## Usage Example

### Step 1: Set up the video processing hook in your editor component

```tsx
import { useEditor } from '@tiptap/react'
import { VideoNode } from '@repo/ui/components/tiptap-node/video-node'
import { useVideoProcessingProgress } from '@/hooks/useVideoProcessingProgress'
import { useSubscribeProcessingProgress } from '@/hooks/usePresentation'

function MyEditor() {
  // Initialize the progress management hook
  const videoProgress = useVideoProcessingProgress()
  
  // Subscribe to backend processing events (example using SSE)
  const { data: processingData } = useSubscribeProcessingProgress(true)
  
  // Update progress when backend sends updates
  useEffect(() => {
    if (processingData && processingData.videoId) {
      videoProgress.updateProgress(processingData.videoId, {
        progress: processingData.progress,
        status: processingData.status,
        message: processingData.message,
      })
    }
  }, [processingData, videoProgress])
  
  // Configure the editor with video processing options
  const editor = useEditor({
    extensions: [
      VideoNode.configure({
        onProgressUpdate: videoProgress.onProgressUpdate,
        enableProgress: videoProgress.enableProgress,
        disableProgress: videoProgress.disableProgress,
      }),
      // ... other extensions
    ],
  })
  
  return <EditorContent editor={editor} />
}
```

### Step 2: Trigger progress display when uploading a video

```tsx
// When inserting a new video into the editor
const handleVideoUpload = async (file: File) => {
  // 1. Upload the video
  const uploadResult = await uploadVideo(file)
  const videoId = uploadResult.id
  
  // 2. Insert video node into editor
  editor?.chain().focus().setVideo({
    src: uploadResult.url,
    srcUrlId: videoId,
  }).run()
  
  // 3. Enable progress tracking for this video
  videoProgress.enableProgress(videoId)
  
  // 4. Progress updates will come through your subscription
  // (e.g., useSubscribeProcessingProgress from usePresentation.ts)
}
```

### Step 3: Backend sends progress updates

The backend should emit progress events with this structure:

```typescript
interface ProcessingProgress {
  videoId: string        // Video identifier (srcUrlId)
  progress: number       // 0-100
  status: 'processing' | 'completed' | 'failed'
  message?: string       // Optional status message
}
```

Example SSE event from backend:
```json
{
  "videoId": "abc123",
  "progress": 45,
  "status": "processing",
  "message": "Encoding video..."
}
```

### Step 4: Disable progress when complete

Progress will automatically hide when status is 'completed' or 'failed', but you can also manually control it:

```tsx
// Manually disable progress
videoProgress.disableProgress(videoId)
```

## Visual Features

### Progress Bar
- **Position**: Absolute at top of video element
- **Height**: 1px (thin line)
- **Color**: Blue (#3B82F6)
- **Behavior**: 
  - Smoothly animates width based on progress percentage
  - Shows tooltip with message and percentage on hover
  - Automatically hides when processing completes or fails

### Styling
The progress bar uses Tailwind classes:
```tsx
<div 
  className="absolute top-0 left-0 right-0 z-10 bg-blue-600 h-1 transition-all duration-300"
  style={{ width: `${progress}%` }}
/>
```

## Integration with Existing Code

### Admin Presentation Page
The `/admin/presentation` page already demonstrates this pattern:

1. Uses `useSubscribeProcessingProgress` to get real-time updates
2. Displays progress in a separate card component
3. Can be adapted to work with in-editor progress bars

### Adapting for Editor
To integrate with the editor, modify the admin presentation page to:

1. Pass progress data to the editor configuration
2. Enable progress for newly uploaded videos
3. Update progress via the `updateProgress` method

```tsx
// In admin-presentation-client.tsx
const videoProgress = useVideoProcessingProgress()

// When video processing updates arrive
useEffect(() => {
  if (processingProgress?.videoId) {
    videoProgress.updateProgress(processingProgress.videoId, {
      progress: processingProgress.progress,
      status: processingProgress.status,
      message: processingProgress.message,
    })
  }
}, [processingProgress, videoProgress])
```

## Testing

### Manual Testing
1. Upload a video to the editor
2. Verify progress bar appears at top of video node
3. Check that percentage updates smoothly
4. Confirm bar disappears when processing completes

### Mock Progress Updates
```tsx
// For testing without backend
const mockProgress = () => {
  let progress = 0
  const interval = setInterval(() => {
    progress += 10
    videoProgress.updateProgress('test-video-id', {
      progress,
      status: progress < 100 ? 'processing' : 'completed',
      message: `Processing: ${progress}%`,
    })
    
    if (progress >= 100) {
      clearInterval(interval)
    }
  }, 500)
}
```

## Troubleshooting

### Progress bar not showing
- Check that `enableProgress` was called with the correct video ID
- Verify the video node's `srcUrlId` or `src` matches the ID used in `enableProgress`
- Ensure `onProgressUpdate` callback is properly configured in extension options

### Progress not updating
- Check browser console for subscription errors
- Verify backend is sending events with correct structure
- Ensure `updateProgress` is being called when events arrive

### Multiple videos
- Each video is tracked independently by its ID
- Use unique `srcUrlId` for each video node
- The hook manages multiple videos simultaneously

## API Reference

### `useVideoProcessingProgress()`

#### Returns
- `onProgressUpdate(videoId, callback)`: Subscribe to progress updates
  - Returns: Unsubscribe function
- `enableProgress(videoId)`: Show progress bar for video
- `disableProgress(videoId)`: Hide progress bar for video
- `updateProgress(videoId, progress)`: Update progress for video
- `isProgressEnabled(videoId)`: Check if progress is enabled

#### Types
```typescript
interface ProcessingProgress {
  progress: number       // 0-100
  status: 'processing' | 'completed' | 'failed'
  message?: string
}

type ProgressCallback = (progress: ProcessingProgress) => void
type UnsubscribeFunction = () => void
```
