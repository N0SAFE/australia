# FFmpeg Module Architecture

> **Module**: `@/core/modules/ffmpeg`  
> **Type**: Core Infrastructure Module  
> **Status**: Production Ready

## Overview

The FFmpeg module provides video processing capabilities for the application. It handles video conversion to H.264, metadata extraction, and hardware acceleration with automatic fallback to software encoding.

### Key Features

- **Namespace-based Temp File Isolation**: Each consumer service has its own namespace, enabling crash recovery per service
- **Storage Provider Agnostic**: Works with S3, GCS, local disk, or any storage provider
- **Hardware Acceleration**: Automatic detection and use of VAAPI/NVENC/QSV with fallback
- **Crash Recovery**: Lock files and dangling file detection for recovery after server restart
- **Segment-based Processing**: Memory-efficient processing of large videos

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FFmpeg Module                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────┐  │
│  │   FfmpegService     │───▶│  FfmpegTempService  │    │ HardwareAccel   │  │
│  │                     │    │                     │    │    Service      │  │
│  │ • processVideo()    │    │ • initializeProc()  │    │                 │  │
│  │ • getProcessedFile()│    │ • getFilesByNS()    │    │ • isAvailable() │  │
│  │ • getFilesByNS()    │    │ • cleanup()         │    │ • getConfig()   │  │
│  │ • cleanup()         │    │ • getProcessedFile()│    │                 │  │
│  │ • isProcessing()    │    │ • readLockFile()    │    │                 │  │
│  └─────────────────────┘    └─────────────────────┘    └─────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

                                    │
                                    ▼

┌─────────────────────────────────────────────────────────────────────────────┐
│                         .ffmpeg-temp/ (Temp Storage)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  .ffmpeg-temp/                                                               │
│  ├── capsules/                    ← CapsuleService namespace                 │
│  │   └── {fileId}/                ← Directory named by database fileId       │
│  │       ├── .lock                ← Lock file with PID and metadata         │
│  │       ├── input.mp4            ← Copy of original file                   │
│  │       ├── segments/                                                       │
│  │       │   ├── segment_000.mp4                                            │
│  │       │   ├── segment_001.mp4                                            │
│  │       │   └── concat_list.txt                                            │
│  │       └── output.mp4           ← Final processed file                    │
│  │                                                                          │
│  └── presentation/video/          ← PresentationService namespace            │
│      └── {fileId}/                                                          │
│          └── ...                                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Services

### FfmpegService (Main Service)

The primary service for video processing. Provides both new namespace-based API and legacy in-place conversion API.

**New API (Recommended):**
```typescript
// Process video with namespace isolation
const result = await ffmpegService.processVideo(
  { id: fileId, name: 'video.mp4', mimeType: 'video/mp4', stream: fileStream },
  ['capsules'],
  { onProgress: (p) => console.log(`Progress: ${p}%`) }
);

// Get processed file
const processed = await ffmpegService.getProcessedFile(fileId, ['capsules']);

// Cleanup after storing
await ffmpegService.cleanup(fileId, ['capsules']);
```

**Crash Recovery:**
```typescript
// On module init, find dangling files
const danglingFiles = await ffmpegService.getFilesByNamespace(['capsules']);

for (const file of danglingFiles) {
  const dbRecord = await fileService.getFileById(file.fileId);
  if (dbRecord) {
    // Re-process or retry storage
  } else {
    // File deleted from DB, cleanup temp files
    await ffmpegService.cleanup(file.fileId, ['capsules']);
  }
}
```

### FfmpegTempService (Temp File Management)

Manages temporary files with namespace isolation and crash recovery support.

**Key Methods:**
- `initializeProcessing(file, namespace)` - Create temp directory and write input file
- `getFilesByNamespace(namespace)` - Get all dangling files for a namespace
- `getProcessedFile(fileId, namespace)` - Get processed file as stream
- `cleanup(fileId, namespace)` - Delete temp directory
- `cleanupOldFiles(maxAgeMs)` - Cleanup files older than threshold

### HardwareAccelerationService

Detects and configures hardware acceleration (VAAPI, NVENC, QSV).

## Interfaces

### FfmpegFile

```typescript
interface FfmpegFile {
  /** Database file ID - used as temp directory name for crash recovery */
  id: string;
  /** Original filename */
  name: string;
  /** MIME type */
  mimeType: string;
  /** Content as buffer */
  buffer?: Buffer;
  /** Content as stream (recommended for large files) */
  stream?: Readable;
  /** Path to local file (avoids copying) */
  localPath?: string;
}
```

### ProcessingResult

```typescript
interface ProcessingResult {
  fileId: string;
  outputPath: string;
  wasConverted: boolean;
  newSize: number;
  metadata: {
    duration: number;
    width: number;
    height: number;
    codec: string;
  };
}
```

### DanglingFile

```typescript
interface DanglingFile {
  fileId: string;
  namespace: string[];
  tempDir: string;
  inputPath: string;
  outputPath?: string;  // Present if processing completed
  isComplete: boolean;
  lockMetadata: LockFileContent;
}
```

## Usage Flow

### Normal Processing Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│ Consumer│     │ FileService │     │FfmpegService│     │ Storage Provider│
│ Service │     │             │     │             │     │ (S3/Disk/etc)   │
└────┬────┘     └──────┬──────┘     └──────┬──────┘     └────────┬────────┘
     │                 │                   │                     │
     │ 1. Get file     │                   │                     │
     │────────────────>│                   │                     │
     │<────────────────│                   │                     │
     │   (stream)      │                   │                     │
     │                 │                   │                     │
     │ 2. processVideo(file, namespace)    │                     │
     │────────────────────────────────────>│                     │
     │                 │                   │                     │
     │                 │     Creates local copy in                │
     │                 │     .ffmpeg-temp/{ns}/{id}/              │
     │                 │                   │                     │
     │<────────────────────────────────────│                     │
     │   ProcessingResult                  │                     │
     │                 │                   │                     │
     │ 3. getProcessedFile(id, ns)         │                     │
     │────────────────────────────────────>│                     │
     │<────────────────────────────────────│                     │
     │   (stream)      │                   │                     │
     │                 │                   │                     │
     │ 4. Store in provider                │                     │
     │────────────────>│                   │                     │
     │                 │─────────────────────────────────────────>│
     │                 │<─────────────────────────────────────────│
     │<────────────────│                   │                     │
     │                 │                   │                     │
     │ 5. cleanup(id, ns)                  │                     │
     │────────────────────────────────────>│                     │
     │<────────────────────────────────────│                     │
```

### Crash Recovery Flow

```
┌─────────┐                          ┌─────────────┐
│ Consumer│                          │FfmpegService│
│ Service │                          │             │
└────┬────┘                          └──────┬──────┘
     │                                      │
     │ === SERVER RESTART ===               │
     │                                      │
     │ onModuleInit()                       │
     │                                      │
     │ 1. getFilesByNamespace(ns)           │
     │─────────────────────────────────────>│
     │<─────────────────────────────────────│
     │   DanglingFile[]                     │
     │                                      │
     │ For each file:                       │
     │   Check if fileId exists in DB       │
     │                                      │
     │ if (!dbRecord):                      │
     │   // File deleted, cleanup           │
     │   cleanup(id, ns)                    │
     │─────────────────────────────────────>│
     │                                      │
     │ if (file.isComplete):                │
     │   // Storage failed, retry           │
     │   getProcessedFile(id, ns)           │
     │─────────────────────────────────────>│
     │   → Store in provider                │
     │   → cleanup(id, ns)                  │
     │                                      │
     │ else:                                │
     │   // Processing interrupted          │
     │   cleanup(id, ns)                    │
     │─────────────────────────────────────>│
     │   → Re-trigger processing            │
```

## Why This Architecture?

### 1. Storage Provider Agnostic

The original design assumed files were always on local disk. However, `FileService` can use S3, GCS, or other providers. FFmpeg requires local files, so:

- Consumer gets file content from storage provider
- FFmpeg creates a local copy in `.ffmpeg-temp/`
- Consumer stores processed file back to storage provider
- Consumer cleans up temp files

### 2. Namespace Isolation

Different consumer services (Capsule, Presentation, Storage) need:
- **Different recovery logic**: Capsule might auto-retry, Presentation might notify user
- **No interference**: One service's temp files don't affect another
- **Clear ownership**: Each service manages their own files

### 3. FileId as Directory Name

The database fileId is used as the temp directory name because:
- **Direct mapping**: Directory name → database lookup
- **No metadata parsing**: Even if lock file is corrupted, we know the fileId
- **Idempotent**: Same file always uses same directory

### 4. Lock Files with PID

Lock files track:
- Process ID that created the file
- Start time for age-based cleanup
- Original file metadata for debugging

This enables:
- Detecting stale locks (process no longer running)
- Distinguishing active processing from crashed processing

## Configuration

The module uses default configuration that can be customized:

```typescript
// FfmpegTempService defaults
TEMP_BASE = '.ffmpeg-temp'  // Base directory for temp files
MAX_AGE_MS = 86400000       // 24 hours cleanup threshold

// FfmpegService defaults
SEGMENT_DURATION = 30       // Seconds per segment for processing
```

## Best Practices

### For Consumer Services

1. **Always use namespaces**: Pass a unique namespace array for your service
2. **Clean up after success**: Always call `cleanup()` after storing the processed file
3. **Implement crash recovery**: Add `OnModuleInit` to handle dangling files
4. **Check database first**: On recovery, check if fileId exists before re-processing

### For Recovery Logic

```typescript
@Injectable()
export class MyService implements OnModuleInit {
  private readonly NAMESPACE = ['my-service'];

  async onModuleInit() {
    const danglingFiles = await this.ffmpegService.getFilesByNamespace(this.NAMESPACE);
    
    for (const file of danglingFiles) {
      const dbRecord = await this.fileService.getFileById(file.fileId);
      
      if (!dbRecord) {
        // File deleted from DB - cleanup immediately
        await this.ffmpegService.cleanup(file.fileId, this.NAMESPACE);
        continue;
      }
      
      if (file.isComplete) {
        // Processing done, storage failed - retry storage only
        await this.retryStorage(file);
      } else {
        // Processing interrupted - cleanup and re-process
        await this.ffmpegService.cleanup(file.fileId, this.NAMESPACE);
        await this.triggerProcessing(dbRecord);
      }
    }
  }
}
```

## Migration from Legacy API

The legacy `convertVideoToH264AndReplace()` method is still available but deprecated. Migrate by:

1. Get file content as stream from `FileService`
2. Create `FfmpegFile` object with content
3. Use `processVideo()` instead of `convertVideoToH264AndReplace()`
4. Store result via `FileService`
5. Call `cleanup()` to remove temp files

## Related Documentation

- [IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md) - Original implementation plan with rationale
- [Video Processing Service](../video-processing/README.md) - Higher-level video processing wrapper
