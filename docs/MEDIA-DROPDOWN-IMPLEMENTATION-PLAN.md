# Media Dropdown Implementation Plan

> **Status**: Ready to implement  
> **Target**: `/apps/web/app/admin/capsules/[id]/edit` - Capsule content editor  
> **Goal**: Replace single "Add" button with dropdown for Image, Video, Audio, and File uploads with real API integration

## Overview

This plan outlines the implementation of a comprehensive Media Dropdown menu for the Tiptap editor used in capsule editing. The feature will integrate with existing backend infrastructure (API endpoints, hooks, and video processing) to provide a seamless media upload experience.

### Key Discovery

**90% of infrastructure already exists!** The backend has complete upload endpoints, FFmpeg H.264 video conversion, SSE-based processing updates, and the frontend has fully functional hooks. We only need to build the UI layer to wire everything together.

## Architecture Context

### Existing Infrastructure (Complete ✅)

#### Backend API (`apps/api`)
- **Upload Endpoints**:
  - `POST /storage/upload/image` (5MB limit, JPG/PNG/GIF/WEBP)
  - `POST /storage/upload/video` (500MB limit, automatic H.264 conversion)
  - `POST /storage/upload/audio` (50MB limit, MP3/WAV/OGG)
- **Processing**:
  - Automatic FFmpeg H.264 video conversion on upload
  - Background processing with abort support
  - Database integration (file_metadata, video_metadata tables)
- **Real-time Updates**:
  - `GET /storage/subscribe/video/:videoId` - SSE endpoint using async generator
  - Yields processing events: `{progress, message, metadata, timestamp}`

#### Frontend Hooks (`apps/web/hooks/useStorage.ts`)
- `useUploadImage()` - TanStack Query mutation with toast notifications
- `useUploadVideo()` - TanStack Query mutation with toast notifications
- `useUploadAudio()` - TanStack Query mutation with toast notifications
- `useVideoProcessing(videoId, options)` - SSE subscription hook
  - Options: `enabled` flag, `onComplete` callback
  - Returns: `{progress, isConnected, error, isProcessing, isCompleted, isFailed}`
- `useUploadVideoWithProgress()` - Combined upload + auto-subscribe
- `useStorage()` - Composite hook aggregating all operations

#### ORPC Contracts (`packages/contracts/api`)
- All contracts defined with Zod validation
- File validation with size/type constraints
- `subscribeVideoProcessingContract` uses `eventIterator` for SSE

#### Existing Tiptap Nodes
- `image-node` + `image-upload-node` (with extensions)
- `video-node` + `video-upload-node` (with extensions)
- `audio-node` + `audio-upload-node` (with extensions)
- `file-node` + `file-upload-node` (with extensions)

### Current State (Needs Update ❌)

#### SimpleEditor (`packages/ui/base/src/components/tiptap-templates/simple/simple-editor.tsx`)
- **Issue 1**: Only has `ImageUploadButton` with "Add" text (line ~137)
- **Issue 2**: Uses mock `handleImageUpload` from `tiptap-utils`
- **Issue 3**: Only includes `ImageUploadNode` extension
- **Issue 4**: Broken SCSS imports on lines 33-35 using `@/components/...` alias

#### Mock Upload (`packages/ui/base/src/lib/tiptap-utils.ts`)
- `handleImageUpload` is a mock function with setTimeout
- Returns placeholder image: `'https://via.placeholder.com/800x600'`
- Needs replacement with real API integration

## Implementation Phases

### Phase 1: MediaDropdownMenu Component (1-2h)

**File**: `/packages/ui/base/src/components/tiptap-ui/media-dropdown-menu.tsx`

Create a new dropdown menu component to replace the simple "Add" button.

#### Component Structure
```tsx
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@repo/ui/dropdown-menu'
import { Button } from '@repo/ui/button'
import { Plus, Image, Video, Music, FileText } from 'lucide-react'

interface MediaDropdownMenuProps {
  onImageUpload: (file: File) => Promise<void>
  onVideoUpload: (file: File) => Promise<void>
  onAudioUpload: (file: File) => Promise<void>
  onFileUpload: (file: File) => Promise<void>
}
```

#### Features
- 4 menu items: Image, Video, Audio, File
- Hidden file inputs with appropriate `accept` attributes:
  - Image: `accept="image/jpeg,image/png,image/gif,image/webp"`
  - Video: `accept="video/mp4,video/webm,video/ogg"`
  - Audio: `accept="audio/mpeg,audio/wav,audio/ogg"`
  - File: `accept="*"`
- Trigger callbacks on file selection
- Lucide icons for visual clarity
- Accessible keyboard navigation

#### Styling
- Use existing Shadcn DropdownMenu styles
- Match SimpleEditor button styling
- Responsive dropdown positioning

---

### Phase 2: Upload Handler Utilities (1h)

**File**: `/packages/ui/base/src/lib/tiptap-upload-handlers.ts`

Create bridge functions between Tiptap editor and useStorage hooks.

#### Handler Functions

##### `handleImageUpload`
```typescript
export const handleImageUpload = async (
  file: File,
  uploadImageFn: (file: File) => Promise<{ path: string }>,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
): Promise<string> => {
  // Validate file size (5MB)
  // Call uploadImageFn
  // Return image URL
}
```

##### `handleVideoUpload`
```typescript
export const handleVideoUpload = async (
  file: File,
  uploadVideoFn: (file: File) => Promise<{ videoId: string; path: string; isProcessed: boolean }>,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
): Promise<{ url: string; videoId: string }> => {
  // Validate file size (500MB)
  // Call uploadVideoFn
  // Return video URL and videoId for processing subscription
}
```

##### `handleAudioUpload`
```typescript
export const handleAudioUpload = async (
  file: File,
  uploadAudioFn: (file: File) => Promise<{ path: string }>,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
): Promise<string> => {
  // Validate file size (50MB)
  // Call uploadAudioFn
  // Return audio URL
}
```

##### `handleFileUpload`
```typescript
export const handleFileUpload = async (
  file: File,
  uploadFileFn: (file: File) => Promise<{ path: string; name: string; size: number }>,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
): Promise<{ url: string; name: string; size: number }> => {
  // Call uploadFileFn
  // Return file metadata
}
```

#### Features
- File size validation with user-friendly error messages
- Progress callback support for upload UI
- AbortSignal support for cancellation
- Error handling with toast notifications
- Type-safe return values

---

### Phase 3: Node Extension Updates (2-3h)

Update all upload node extensions to accept real upload functions.

#### Files to Update
1. `image-upload-node-extension.ts`
2. `video-upload-node-extension.ts`
3. `audio-upload-node-extension.ts`
4. `file-upload-node-extension.ts`

#### Extension Options Interface
```typescript
export interface ImageUploadNodeOptions {
  upload: (
    file: File,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal
  ) => Promise<string>
  // ... existing options
}
```

#### Video Extension Special Attributes
```typescript
// Add to video-node-extension.ts
addAttributes() {
  return {
    src: { default: null },
    videoId: { default: null }, // NEW: for processing subscription
    isProcessed: { default: false }, // NEW: processing state
    // ... existing attributes
  }
}
```

#### Implementation Steps
1. Add `upload` function to options interface for each extension
2. Replace mock upload calls with the provided upload function
3. Pass `onProgress` callback to upload handler
4. Support `AbortSignal` for cancellation
5. Add `videoId` and `isProcessed` attributes to video extension

---

### Phase 4: Video Processing Overlay (2-3h)

**File**: `/packages/ui/base/src/components/tiptap-node/video-node/video-node.tsx`

Add real-time processing overlay to video nodes using SSE.

#### Component Update
```tsx
import { useVideoProcessing } from '@/hooks/useStorage'
import { Progress } from '@repo/ui/progress'
import { Loader2 } from 'lucide-react'

export const VideoNode: React.FC<VideoNodeProps> = ({ node, updateAttributes }) => {
  const videoId = node.attrs.videoId
  const isProcessed = node.attrs.isProcessed

  const { 
    progress, 
    isProcessing, 
    isCompleted, 
    isFailed 
  } = useVideoProcessing(videoId, {
    enabled: !isProcessed && !!videoId,
    onComplete: () => {
      updateAttributes({ isProcessed: true })
    }
  })

  return (
    <div className="video-node-wrapper">
      <video src={node.attrs.src} controls />
      
      {isProcessing && (
        <div className="processing-overlay">
          <div className="processing-content">
            <Loader2 className="animate-spin" />
            <p>{progress.message || 'Processing video...'}</p>
            <Progress value={progress.progress} />
            <span>{progress.progress}%</span>
          </div>
        </div>
      )}
      
      {isFailed && (
        <div className="error-overlay">
          <p>Video processing failed</p>
        </div>
      )}
    </div>
  )
}
```

#### Features
- Show overlay during H.264 conversion
- Display progress bar with percentage
- Show processing message from SSE events
- Animated spinner (Loader2)
- Auto-hide overlay when processing completes
- Update `isProcessed` attribute on completion
- Error state display if processing fails

#### Styling
```scss
.processing-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.processing-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  background: white;
  border-radius: 0.5rem;
}
```

---

### Phase 5: SimpleEditor Configuration (1-2h)

**File**: `/packages/ui/base/src/components/tiptap-templates/simple/simple-editor.tsx`

Update the main editor to use real API integration.

#### Changes Required

##### 1. Add useStorage Hook
```tsx
import { useStorage } from '@/hooks/useStorage'

export const SimpleEditor: React.FC<SimpleEditorProps> = (props) => {
  const { 
    uploadImage, 
    uploadVideo, 
    uploadAudio 
  } = useStorage()
  
  // ... rest of component
}
```

##### 2. Import Upload Handlers
```tsx
import { 
  handleImageUpload, 
  handleVideoUpload, 
  handleAudioUpload, 
  handleFileUpload 
} from '@/lib/tiptap-upload-handlers'
```

##### 3. Configure Upload Extensions
```tsx
const extensions = [
  // ... existing extensions
  
  ImageUploadNode.configure({
    upload: (file, onProgress, signal) => 
      handleImageUpload(file, uploadImage, onProgress, signal)
  }),
  
  VideoUploadNode.configure({
    upload: (file, onProgress, signal) => 
      handleVideoUpload(file, uploadVideo, onProgress, signal)
  }),
  
  AudioUploadNode.configure({
    upload: (file, onProgress, signal) => 
      handleAudioUpload(file, uploadAudio, onProgress, signal)
  }),
  
  FileUploadNode.configure({
    upload: (file, onProgress, signal) => 
      handleFileUpload(file, uploadFile, onProgress, signal)
  }),
]
```

##### 4. Replace ImageUploadButton with MediaDropdownMenu
```tsx
// Remove this:
// <ImageUploadButton text="Add" />

// Add this:
<MediaDropdownMenu
  onImageUpload={(file) => {
    editor?.chain().focus().insertImageUpload(file).run()
  }}
  onVideoUpload={(file) => {
    editor?.chain().focus().insertVideoUpload(file).run()
  }}
  onAudioUpload={(file) => {
    editor?.chain().focus().insertAudioUpload(file).run()
  }}
  onFileUpload={(file) => {
    editor?.chain().focus().insertFileUpload(file).run()
  }}
/>
```

#### Editor Commands
Ensure these Tiptap commands are registered in extensions:
- `insertImageUpload(file: File)`
- `insertVideoUpload(file: File)`
- `insertAudioUpload(file: File)`
- `insertFileUpload(file: File)`

---

### Phase 6: SCSS Import Fixes (30min)

**File**: `/packages/ui/base/src/components/tiptap-templates/simple/simple-editor.tsx`

Fix broken SCSS imports on lines 33-35.

#### Current (Broken)
```tsx
import '@/components/tiptap-node/image-node/image-node.scss'
import '@/components/tiptap-node/video-node/video-node.scss'
import '@/components/tiptap-node/audio-node/audio-node.scss'
```

#### Fixed (Relative Paths)
```tsx
import '../../tiptap-node/image-node/image-node.scss'
import '../../tiptap-node/video-node/video-node.scss'
import '../../tiptap-node/audio-node/audio-node.scss'
```

**Rationale**: The `@/` alias doesn't resolve correctly in the UI package build context. Use relative paths for intra-package imports.

---

## Testing Strategy

### Unit Tests
- [ ] MediaDropdownMenu component rendering
- [ ] File input validation and callbacks
- [ ] Upload handler functions with mock hooks
- [ ] Node extension configuration

### Integration Tests
- [ ] Complete upload flow (file selection → API call → node insertion)
- [ ] Video processing subscription (upload → SSE events → overlay update)
- [ ] Error handling (file too large, upload failure)
- [ ] Abort functionality (cancel upload)

### Manual Testing Checklist
- [ ] Upload image (5MB limit)
- [ ] Upload video (500MB limit, verify H.264 conversion)
- [ ] Upload audio (50MB limit)
- [ ] Upload generic file
- [ ] Video processing overlay appears and updates
- [ ] Progress bar shows accurate percentage
- [ ] Processing completes and overlay disappears
- [ ] Error states display correctly
- [ ] Toast notifications appear on success/error
- [ ] Multiple uploads in same editor session
- [ ] Cancel upload mid-transfer

---

## Estimated Timeline

| Phase | Description | Time Estimate |
|-------|-------------|---------------|
| 1 | MediaDropdownMenu Component | 1-2 hours |
| 2 | Upload Handler Utilities | 1 hour |
| 3 | Node Extension Updates | 2-3 hours |
| 4 | Video Processing Overlay | 2-3 hours |
| 5 | SimpleEditor Configuration | 1-2 hours |
| 6 | SCSS Import Fixes | 30 minutes |
| **Total** | | **8-11 hours** |

---

## Success Criteria

### Functional Requirements
- ✅ Users can select media type from dropdown (Image, Video, Audio, File)
- ✅ Files upload to backend API successfully
- ✅ Videos automatically convert to H.264 format
- ✅ Video processing progress displays in real-time via SSE
- ✅ Processing overlay shows progress bar and percentage
- ✅ Uploaded media appears correctly in editor
- ✅ Toast notifications inform users of success/errors
- ✅ File size limits enforced with clear error messages

### Technical Requirements
- ✅ Type-safe integration with ORPC contracts
- ✅ TanStack Query mutations for optimal caching
- ✅ SSE subscription for real-time video processing updates
- ✅ Proper error handling and user feedback
- ✅ Support for upload cancellation (AbortSignal)
- ✅ No mock functions in production code
- ✅ All SCSS imports use relative paths

### User Experience
- ✅ Intuitive dropdown menu with clear icons
- ✅ Immediate visual feedback on file selection
- ✅ Progress indication during upload
- ✅ Non-blocking UI during background processing
- ✅ Accessible keyboard navigation
- ✅ Responsive design across device sizes

---

## Dependencies

### External Packages (Already Installed)
- `@tanstack/react-query` - Data fetching and mutations
- `lucide-react` - Icon library
- `sonner` - Toast notifications
- Shadcn UI components:
  - `DropdownMenu`
  - `Button`
  - `Progress`

### Internal Packages
- `@repo/ui` - Shared UI component library
- `packages/contracts/api` - ORPC contracts
- `apps/web/hooks/useStorage` - Upload and processing hooks

### Backend Services
- NestJS API running on `http://localhost:3001` (or configured URL)
- PostgreSQL database with file_metadata tables
- FFmpeg for video conversion

---

## Risk Assessment

### Low Risk ✅
- Backend infrastructure is complete and tested
- Client hooks are functional and tested
- Existing node components work correctly
- SCSS import fix is straightforward

### Medium Risk ⚠️
- SSE connection stability in production
- Large file upload performance (500MB videos)
- Browser compatibility for SSE (EventSource)
- FFmpeg processing time for long videos

### Mitigation Strategies
- Implement connection retry logic in useVideoProcessing hook
- Add chunked upload support if needed (future enhancement)
- Polyfill EventSource for older browsers
- Show estimated processing time based on file size
- Add timeout handling for stuck processing

---

## Future Enhancements (Post-MVP)

### Possible Improvements
1. **Drag & Drop**: Drag files directly into editor
2. **Paste Support**: Paste images from clipboard
3. **Thumbnail Preview**: Show thumbnail before upload
4. **Batch Upload**: Select and upload multiple files
5. **Upload Queue**: Manage multiple uploads with progress
6. **Cloud Storage**: Integration with S3, Cloudinary, etc.
7. **Image Editing**: Crop, resize, filters before upload
8. **Video Preview**: Preview video before upload
9. **Chunked Upload**: Resume interrupted uploads
10. **WebRTC Streaming**: Real-time video encoding progress

---

## References

### Key Files
- **API Controller**: `apps/api/src/modules/storage/controllers/storage.controller.ts`
- **Client Hooks**: `apps/web/hooks/useStorage.ts`
- **ORPC Contracts**: `packages/contracts/api/modules/storage/`
- **SimpleEditor**: `packages/ui/base/src/components/tiptap-templates/simple/simple-editor.tsx`
- **Tiptap Utils**: `packages/ui/base/src/lib/tiptap-utils.ts`

### Documentation
- [ORPC Documentation](https://orpc.io/)
- [Tiptap Node Views](https://tiptap.dev/guide/node-views/react)
- [TanStack Query](https://tanstack.com/query)
- [Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [FFmpeg H.264 Encoding](https://trac.ffmpeg.org/wiki/Encode/H.264)

---

## Notes

### Architecture Decisions
- **Why SSE over WebSockets?** SSE is simpler for one-way server-to-client communication, requires less infrastructure, and ORPC provides elegant eventIterator support.
- **Why TanStack Query?** Built-in caching, retry logic, and mutation management reduce boilerplate code.
- **Why H.264 conversion?** Universal browser support and optimal file size/quality ratio.
- **Why separate upload handlers?** Decouples Tiptap editor from React hooks, enables testing and reusability.

### Implementation Best Practices
- Keep MediaDropdownMenu generic and reusable
- Validate file types and sizes on both client and server
- Use TypeScript strict mode for type safety
- Follow existing project code style (ESLint/Prettier)
- Add JSDoc comments for complex functions
- Use semantic HTML and ARIA labels for accessibility

---

**Last Updated**: 2025-11-18  
**Status**: Ready for implementation  
**Estimated Completion**: 8-11 hours total development time
