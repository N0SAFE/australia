# Active Context

## Current Task
✅ COMPLETED: Capsule Video Processing Implementation

Successfully implemented automatic video processing for capsule create/update operations.

## Recent Changes (Latest Session)
- **Problem**: Capsule uploads didn't trigger FFmpeg processing (files uploaded but never processed)
- **Root Cause**: `CapsuleService.uploadAndSaveFile()` only uploaded files, didn't start processing
- **Solution**: Enhanced `uploadAndSaveFile()` to trigger background video processing for video files

### Code Changes
1. **CapsuleService** (`apps/api/src/modules/capsule/services/capsule.service.ts`):
   - Added `StorageEventService` and `VideoProcessingService` injections
   - Added `Logger` for debug logging
   - Enhanced `uploadAndSaveFile()` to detect video files and start processing
   - Follows same pattern as `StorageController.uploadVideo()`
   - Processing happens in background (non-blocking)
   - Progress events emitted via SSE
   - Database updated with `isProcessed: true` on completion

2. **CapsuleModule** (`apps/api/src/modules/capsule/capsule.module.ts`):
   - Added `VideoProcessingModule` import

## What Works Now
- ✅ Capsule create with video → Processing starts automatically
- ✅ Capsule update with video → Processing starts automatically  
- ✅ Progress tracking via `useVideoProcessing` hook
- ✅ Progress bar displays in both edit and view modes (PlateEditor + SimpleViewer)
- ✅ Progress persists on page reload (SSE refetch options)
- ✅ Error handling and logging
- ✅ File extension normalization (lowercase)
- ✅ FFmpeg in-place conversion (temp file + atomic rename)

## Architecture
Video processing flow for capsules:
1. User creates/updates capsule with video files
2. `uploadAndSaveFile()` uploads each file
3. For video files: Triggers `storageEventService.startProcessing()`
4. `VideoProcessingService.processVideo()` runs FFmpeg conversion
5. Progress events emitted via SSE to frontend
6. Database updated with `isProcessed: true` on completion
7. `useVideoProcessing` hook receives updates
8. `VideoProgressTracker` component displays progress bar

## Next Steps (User Requirements)
Add processing status indicators to capsule list:
- **Goal**: Show loader/spinner when capsule has videos being processed
- **Requirements**:
  1. Query capsules for `hasProcessingVideos` status (aggregate from related videos)
  2. Update capsule list API response to include processing status
  3. Update frontend table to display spinner/loader icon
  4. Real-time updates when processing completes

## Documentation
- **CAPSULE-VIDEO-PROCESSING-IMPLEMENTATION.md** - Comprehensive implementation guide
- **ARCHITECTURE-SIMPLIFICATION-COMPLETE.md** - In-place conversion architecture
- **FFMPEG_IMPLEMENTATION_SUMMARY.md** - FFmpeg implementation details
- **VIDEO-PROGRESS-COMPONENT-IMPLEMENTATION.md** - Progress component guide
- **VIDEO-PROGRESS-QUICK-REFERENCE.md** - Quick reference

## Previous Context
- Video Progress Component Refactoring (render prop pattern)
- FFmpeg in-place conversion (temp file + atomic rename)
- Extension normalization (lowercase)
- Progress tracking on page reload (SSE refetch)
- Edit/view mode support for progress tracker
