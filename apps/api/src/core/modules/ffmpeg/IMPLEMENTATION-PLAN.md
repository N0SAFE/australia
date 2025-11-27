# FFmpeg Service - Implementation Plan & Findings

> **Status**: Planning Phase  
> **Date**: 2025-11-25  
> **Related Issue**: Video processing does not restore new file size in database after processing

---

## 1. Problem Statement

### Current Issues

1. **File size not updated after processing**: After video conversion (H.264), the database still contains the original file size, not the converted file size. The `refreshFileSizeFromDisk()` function exists in `FileService` but is never called.

2. **No temp file management**: FFmpeg processes files in-place using a temporary `.segments` directory, but there's no namespace-based organization or tracking of files being processed.

3. **No crash recovery**: If the server crashes during video processing, there's no mechanism to detect and recover dangling files.

4. **Multi-provider storage not supported**: The `FileService` can have multiple storage providers (local disk, S3, cloud storage, etc.). FFmpeg requires files to be on local disk to process them, but the source file may not be locally available.

---

## 1.1. Why Namespace-Based Temp Files?

### Consumer Service Isolation

Each consumer service (Capsule, Presentation, Storage) needs to:
1. **Identify their own files** after a crash/restart
2. **Apply different recovery logic** based on their domain requirements
3. **Not interfere** with other services' processing jobs

By using namespaces that mirror the consumer service's domain, each service can:
```typescript
// CapsuleService only sees its own dangling files
const danglingFiles = await this.ffmpegService.getFilesByNamespace(['capsules']);

// PresentationService only sees its own dangling files  
const danglingFiles = await this.ffmpegService.getFilesByNamespace(['presentation', 'video']);
```

### Multi-Provider Storage Support

The `FileService` module supports **multiple storage providers**:
- Local disk storage
- AWS S3
- Google Cloud Storage
- Azure Blob Storage
- Any custom provider

**Problem**: FFmpeg can only process files that exist on the local filesystem. When a file is stored in S3 or another remote provider, FFmpeg cannot access it directly.

**Solution**: FFmpeg creates a **local copy** of the file in its temp directory:
1. Consumer provides a `File` object (with stream or buffer) **and the fileId from database**
2. FFmpeg writes it to `.ffmpeg-temp/{namespace}/{fileId}/input.{ext}` (using the fileId as directory name)
3. FFmpeg processes the local copy
4. Consumer retrieves the processed file from FFmpeg
5. Consumer stores the processed file in their storage provider
6. Consumer calls FFmpeg cleanup to delete the temp files

This ensures FFmpeg always works with local files, regardless of where the original file is stored.

### Why Use FileId as Directory Name?

**Critical for Crash Recovery**: The `fileId` provided by the consumer service is the **database primary key** for that file. By using it as the temp directory name:

1. **Direct mapping**: When recovering after crash, the service scans `.ffmpeg-temp/{namespace}/` and finds directories named by fileId
2. **Database lookup**: Each directory name IS the fileId, so the service can immediately query the database
3. **No metadata parsing needed**: Even if the lock file is corrupted, the directory name alone tells us which database record this file belongs to
4. **Idempotent**: Re-processing the same file always uses the same temp directory

```typescript
// After crash, recovery is straightforward:
const danglingDirs = await fs.readdir('.ffmpeg-temp/capsules/');
// danglingDirs = ['abc123-file-id', 'def456-file-id', ...]

for (const fileId of danglingDirs) {
  // fileId IS the database primary key
  const dbRecord = await this.fileService.getFileById(fileId);
  if (dbRecord) {
    // Re-process or retry storage
  } else {
    // File was deleted from DB, cleanup temp files IMMEDIATELY
    // Never process a file that has no destination in the database
    await this.ffmpegService.cleanup(fileId, ['capsules']);
  }
}
```

**Key Principle**: If a dangling file's ID doesn't exist in the database, the consumer **immediately deletes it** from FFmpeg temp storage. This prevents:
- Wasting CPU cycles processing a file that will go nowhere
- Accumulating orphaned temp files on disk
- Attempting to store a processed file to a non-existent database record

---

## 2. Current Architecture Analysis

### File Flow (Current) - Problems

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CURRENT FLOW - ISSUES                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Client uploads file                                                      │
│           ↓                                                                  │
│  2. FileService.uploadFile()                                                │
│     - Creates DB record (with original size)                                │
│     - Saves file to storage provider (local, S3, etc.)                      │
│           ↓                                                                  │
│  3. Consumer service triggers processing                                     │
│           ↓                                                                  │
│  4. FfmpegService.convertVideoToH264AndReplace()                            │
│     ❌ ASSUMES file is on local disk                                         │
│     ❌ Fails if file is in S3/cloud storage                                  │
│     ❌ No namespace isolation between services                               │
│           ↓                                                                  │
│  5. Consumer updates processing status                                       │
│     ❌ MISSING: refreshFileSizeFromDisk() call                              │
│     ❌ No cleanup mechanism if crash occurs                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Consumers Using Video Processing

| Consumer | File | Method |
|----------|------|--------|
| CapsuleService | `capsule.service.ts` | `uploadAndSaveFile()` → background processing |
| PresentationService | `presentation.service.ts` | `uploadVideo()` and `triggerProcessing()` |
| StorageController | `storage.controller.ts` | `uploadVideo()` handler |

### Missing `refreshFileSizeFromDisk()` Calls

All three consumers have the same pattern:
```typescript
.then(async (metadata) => {
  // SUCCESS: Update database to mark as processed
  await this.fileService.updateVideoProcessingStatus(videoMetadataId, {
    isProcessed: true,
    processingProgress: 100,
  });
  // ❌ MISSING: await this.fileService.refreshFileSizeFromDisk(fileId);
})
```

---

## 3. Proposed Solution

### Phase 1: Fix File Size Update (Immediate Fix)

Add `refreshFileSizeFromDisk()` call after successful video processing in all consumers.

**Files to modify:**
- `apps/api/src/modules/capsule/services/capsule.service.ts`
- `apps/api/src/modules/presentation/services/presentation.service.ts`
- `apps/api/src/modules/storage/controllers/storage.controller.ts`

### Phase 2: Enhanced FFmpeg Service with Namespace Temp Files

#### New Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ NEW PROCESSING FLOW - FFmpeg as Local Processing Engine                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  .ffmpeg-temp/                    ← FFmpeg's own isolated directory         │
│  ├── capsules/                    ← Namespace for CapsuleService            │
│  │   └── {fileId}/                                                          │
│  │       ├── .lock                ← Lock file with metadata                 │
│  │       ├── input.mp4            ← COPY of original file (from any source) │
│  │       ├── segment_000.mp4      ← Processing segments                     │
│  │       ├── segment_001.mp4                                                │
│  │       ├── concat_list.txt                                                │
│  │       └── output.mp4           ← Final processed file                    │
│  │                                                                          │
│  └── presentation/video/          ← Namespace for PresentationService       │
│      └── {fileId}/                                                          │
│          └── ...                                                            │
│                                                                              │
│  Key Points:                                                                 │
│  • FFmpeg creates LOCAL COPY of file (source can be S3, disk, anywhere)    │
│  • Each namespace isolates files per consumer service                       │
│  • Consumer retrieves processed file and stores in their provider          │
│  • Consumer calls cleanup after successful storage                          │
│  • On crash: consumer calls getFilesByNamespace() to find dangling files   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Why This Architecture?

1. **Storage Provider Agnostic**: File might be stored in S3, Azure, GCS, or local disk. FFmpeg needs local files to work, so it creates its own copy.

2. **Consumer Isolation**: Each service uses a unique namespace, so `CapsuleService` only sees `capsules/` files on crash recovery, not `presentation/video/` files.

3. **Different Recovery Logic**: After crash, each service can apply its own logic:
   - `CapsuleService`: Re-trigger processing + notify user
   - `PresentationService`: Mark as failed + create notification
   - `StorageService`: Simple cleanup without notification

4. **Clean Ownership**: FFmpeg owns temp files until consumer explicitly deletes them after successful storage.

#### FfmpegService New Methods

```typescript
interface FfmpegFile {
  /** 
   * REQUIRED: Database file ID (primary key).
   * Used as the temp directory name for crash recovery mapping.
   * After crash, service can scan directories and map back to DB records.
   */
  id: string;
  name: string;
  mimeType: string;
  // File content - one of these must be provided
  buffer?: Buffer;
  stream?: Readable;
  localPath?: string;  // If file is already local
}

interface ProcessingResult {
  fileId: string;
  outputPath: string;           // Path to processed file in FFmpeg temp dir
  wasConverted: boolean;
  newSize: number;
  metadata: {
    duration: number;
    width: number;
    height: number;
    codec: string;
  };
}

interface DanglingFile {
  fileId: string;
  namespace: string[];
  tempDir: string;
  inputPath: string;
  outputPath?: string;          // Present if processing completed
  lockMetadata: {
    startedAt: Date;
    originalName: string;
    mimeType: string;
  };
}

class FfmpegService {
  // Track active processing jobs
  private activeJobs: Map<string, ProcessingJob> = new Map();
  
  /**
   * Process video with namespace-based temp file management.
   * 
   * Creates a local copy of the file (supports any storage provider),
   * processes it, and keeps the result until consumer calls cleanup.
   * 
   * @param file - File object with content (buffer, stream, or local path)
   * @param namespace - Consumer service namespace (e.g., ['capsules'] or ['presentation', 'video'])
   * @param onProgress - Progress callback (0-100)
   * @param abortSignal - Optional abort signal
   * @returns Processing result with path to processed file
   */
  async processVideo(
    file: FfmpegFile,
    namespace: string[],
    onProgress?: (progress: number) => void,
    abortSignal?: AbortSignal
  ): Promise<ProcessingResult>;
  
  /**
   * Get processed file content as a readable stream.
   * Call this after processVideo completes to retrieve the result.
   */
  async getProcessedFile(fileId: string, namespace: string[]): Promise<{
    stream: Readable;
    size: number;
    mimeType: string;
  }>;
  
  /**
   * Get all dangling files for a namespace.
   * Consumer calls this on startup to detect files that were
   * being processed when the server crashed.
   */
  async getFilesByNamespace(namespace: string[]): Promise<DanglingFile[]>;
  
  /**
   * Delete temp files for a processed file.
   * Consumer MUST call this after successfully storing the processed file.
   */
  async cleanup(fileId: string, namespace: string[]): Promise<void>;
  
  /**
   * Check if a file is currently being processed.
   */
  async isProcessing(fileId: string, namespace: string[]): Promise<boolean>;
}
```

#### Consumer Responsibility Flow

```typescript
// Consumer service (e.g., CapsuleService)
async processUploadedVideo(fileRecord: FileRecord) {
  const namespace = ['capsules'];
  
  try {
    // 1. Get file content from storage provider (could be S3, disk, etc.)
    const fileStream = await this.fileService.getFileStream(fileRecord.id);
    
    // 2. FFmpeg processes the file (creates local copy, processes, keeps result)
    const result = await this.ffmpegService.processVideo(
      {
        id: fileRecord.id,
        name: fileRecord.name,
        mimeType: fileRecord.mimeType,
        stream: fileStream,
      },
      namespace,
      (progress) => this.emitProgress(progress),
      abortSignal
    );
    
    // 3. Get the processed file from FFmpeg
    const processedFile = await this.ffmpegService.getProcessedFile(
      fileRecord.id, 
      namespace
    );
    
    // 4. Store processed file in the storage provider (S3, disk, etc.)
    await this.fileService.replaceFileContent(fileRecord.id, {
      stream: processedFile.stream,
      size: processedFile.size,
      mimeType: 'video/mp4',
    });
    
    // 5. Update database with new metadata
    await this.fileService.updateFile(fileRecord.id, {
      size: result.newSize,
      mimeType: 'video/mp4',
    });
    
    await this.videoMetadataService.updateStatus(fileRecord.videoMetadataId, {
      isProcessed: true,
      processingProgress: 100,
    });
    
    // 6. CRITICAL: Clean up FFmpeg temp files ONLY after successful storage
    await this.ffmpegService.cleanup(fileRecord.id, namespace);
    
  } catch (error) {
    // Temp files remain for potential recovery on next restart
    this.logger.error(`Processing failed for ${fileRecord.id}:`, error);
    throw error;
  }
}

// On module startup - detect and handle dangling files
@Injectable()
export class CapsuleService implements OnModuleInit {
  private readonly NAMESPACE = ['capsules'];
  
  async onModuleInit() {
    await this.recoverDanglingFiles();
  }
  
  private async recoverDanglingFiles() {
    // Get all files that were being processed when server crashed
    const danglingFiles = await this.ffmpegService.getFilesByNamespace(this.NAMESPACE);
    
    for (const file of danglingFiles) {
      this.logger.warn(`Found dangling video processing: ${file.fileId}`);
      
      // Check if file still exists in database
      const dbFile = await this.fileService.getFileById(file.fileId);
      
      if (!dbFile) {
        // File was deleted, just cleanup temp files
        this.logger.log(`File ${file.fileId} no longer exists, cleaning up temp files`);
        await this.ffmpegService.cleanup(file.fileId, this.NAMESPACE);
        continue;
      }
      
      // Check if processing had completed (output file exists)
      if (file.outputPath) {
        // Processing was complete but storage failed - retry storage
        this.logger.log(`Retrying storage for completed file: ${file.fileId}`);
        await this.retryStorage(file);
      } else {
        // Processing was interrupted - re-trigger from scratch
        this.logger.log(`Re-triggering processing for: ${file.fileId}`);
        await this.ffmpegService.cleanup(file.fileId, this.NAMESPACE);
        await this.triggerProcessing(dbFile);
      }
    }
  }
  
  private async retryStorage(danglingFile: DanglingFile) {
    try {
      const processedFile = await this.ffmpegService.getProcessedFile(
        danglingFile.fileId,
        this.NAMESPACE
      );
      
      await this.fileService.replaceFileContent(danglingFile.fileId, {
        stream: processedFile.stream,
        size: processedFile.size,
        mimeType: 'video/mp4',
      });
      
      await this.ffmpegService.cleanup(danglingFile.fileId, this.NAMESPACE);
      this.logger.log(`Successfully recovered file: ${danglingFile.fileId}`);
    } catch (error) {
      this.logger.error(`Recovery failed for ${danglingFile.fileId}:`, error);
      // Optionally mark as failed and notify user
    }
  }
}
```

---

## 4. Complete Processing Flow

### Sequence Diagram

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│ Consumer│     │ FileService │     │FfmpegService│     │ Storage Provider│
│ Service │     │ (any provider)    │             │     │ (S3/Disk/etc)   │
└────┬────┘     └──────┬──────┘     └──────┬──────┘     └────────┬────────┘
     │                 │                   │                     │
     │ 1. Get file     │                   │                     │
     │────────────────>│                   │                     │
     │                 │ 2. Fetch from     │                     │
     │                 │    provider       │                     │
     │                 │─────────────────────────────────────────>│
     │                 │<─────────────────────────────────────────│
     │<────────────────│    (stream/buffer)│                     │
     │                 │                   │                     │
     │ 3. processVideo(file, namespace)    │                     │
     │────────────────────────────────────>│                     │
     │                 │                   │                     │
     │                 │     4. Create local copy in             │
     │                 │        .ffmpeg-temp/{ns}/{id}/input.*   │
     │                 │                   │                     │
     │                 │     5. Create .lock file                │
     │                 │                   │                     │
     │                 │     6. Process with FFmpeg              │
     │                 │        (segments, convert, concat)      │
     │                 │                   │                     │
     │                 │     7. Write output.mp4                 │
     │<────────────────────────────────────│                     │
     │    ProcessingResult                 │                     │
     │                 │                   │                     │
     │ 8. getProcessedFile(id, ns)         │                     │
     │────────────────────────────────────>│                     │
     │<────────────────────────────────────│                     │
     │    (stream from output.mp4)         │                     │
     │                 │                   │                     │
     │ 9. Store processed file             │                     │
     │────────────────>│                   │                     │
     │                 │ 10. Upload to     │                     │
     │                 │     provider      │                     │
     │                 │─────────────────────────────────────────>│
     │                 │<─────────────────────────────────────────│
     │<────────────────│                   │                     │
     │                 │                   │                     │
     │ 11. cleanup(id, ns)                 │                     │
     │────────────────────────────────────>│                     │
     │                 │     Delete temp dir                     │
     │<────────────────────────────────────│                     │
     │                 │                   │                     │
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
     │                                      │
     │     Scan .ffmpeg-temp/{ns}/          │
     │     Find dirs with .lock             │
     │     Check if PID still running       │
     │<─────────────────────────────────────│
     │    DanglingFile[]                    │
     │                                      │
     │ For each dangling file:              │
     │                                      │
     │ if (outputPath exists):              │
     │   // Processing completed, storage failed
     │   2a. getProcessedFile(id, ns)       │
     │─────────────────────────────────────>│
     │   3a. Store in provider              │
     │   4a. cleanup(id, ns)                │
     │─────────────────────────────────────>│
     │                                      │
     │ else:                                │
     │   // Processing interrupted          │
     │   2b. cleanup(id, ns)                │
     │─────────────────────────────────────>│
     │   3b. Re-trigger processing          │
     │                                      │
```

---

## 5. Detailed Implementation Plan

### Step 1: Immediate Fix - Add refreshFileSizeFromDisk Calls

**capsule.service.ts** (line ~130)
```typescript
.then(async (metadata) => {
  // SUCCESS: Update database to mark as processed
  await this.fileService.updateVideoProcessingStatus(videoMetadataId, {
    isProcessed: true,
    processingProgress: 100,
    processingError: undefined,
  });

  // NEW: Refresh file size from disk after conversion
  await this.fileService.refreshFileSizeFromDisk(fileId);
  // ...
})
```

**presentation.service.ts** (lines ~95 and ~180)
```typescript
.then(async (metadata) => {
  // SUCCESS: Update database to mark as processed
  // ...
  
  // NEW: Refresh file size from disk after conversion
  await this.fileService.refreshFileSizeFromDisk(uploadResult.fileId);
  // ...
})
```

**storage.controller.ts** (line ~115)
```typescript
.then(async (metadata) => {
  // SUCCESS: Update database to mark as processed
  // ...
  
  // NEW: Refresh file size from disk after conversion
  await this.fileService.refreshFileSizeFromDisk(result.fileId);
  // ...
})
```

### Step 2: Enhance FfmpegService

**New file structure:**
```
apps/api/src/core/modules/ffmpeg/
├── services/
│   ├── ffmpeg.service.ts           ← Enhanced with namespace support
│   ├── ffmpeg-temp.service.ts      ← NEW: Temp file management
│   └── hardware-acceleration.service.ts
├── interfaces/
│   └── ffmpeg.interfaces.ts        ← NEW: Type definitions
├── ffmpeg.module.ts
└── ARCHITECTURE.md                 ← NEW: Documentation
```

**ffmpeg.interfaces.ts:**
```typescript
import { Readable } from 'stream';

/**
 * Input file for FFmpeg processing.
 * Supports multiple input types to work with any storage provider.
 */
export interface FfmpegFile {
  /** Unique file identifier */
  id: string;
  /** Original filename */
  name: string;
  /** MIME type (e.g., 'video/mp4') */
  mimeType: string;
  /** File content as buffer */
  buffer?: Buffer;
  /** File content as stream */
  stream?: Readable;
  /** Path to local file (if already on disk) */
  localPath?: string;
}

/**
 * Result of video processing.
 */
export interface ProcessingResult {
  fileId: string;
  /** Path to processed file in FFmpeg temp directory */
  outputPath: string;
  /** Whether conversion was performed (false if already H.264) */
  wasConverted: boolean;
  /** Size of processed file in bytes */
  newSize: number;
  /** Video metadata after processing */
  metadata: {
    duration: number;
    width: number;
    height: number;
    codec: string;
    bitrate?: number;
  };
}

/**
 * Represents a file that was left in temp directory
 * (processing was interrupted or storage failed).
 */
export interface DanglingFile {
  fileId: string;
  namespace: string[];
  tempDir: string;
  /** Path to input file copy */
  inputPath: string;
  /** Path to output file (present if processing completed) */
  outputPath?: string;
  /** Metadata from lock file */
  lockMetadata: {
    startedAt: Date;
    originalName: string;
    mimeType: string;
  };
}

/**
 * Active processing job (tracked in memory).
 */
export interface ProcessingJob {
  fileId: string;
  namespace: string[];
  tempDir: string;
  startedAt: Date;
  abortController?: AbortController;
}

/**
 * Lock file contents stored in .lock file.
 */
export interface LockFileContent {
  fileId: string;
  namespace: string[];
  originalName: string;
  mimeType: string;
  startedAt: string;  // ISO date string
  pid: number;        // Process ID for detecting stale locks
}
```

### Step 3: Temp File Management Service

**ffmpeg-temp.service.ts:**
```typescript
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Readable } from 'stream';
import { 
  FfmpegFile, 
  DanglingFile, 
  LockFileContent 
} from '../interfaces/ffmpeg.interfaces';

@Injectable()
export class FfmpegTempService {
  private readonly logger = new Logger(FfmpegTempService.name);
  private readonly TEMP_BASE = '.ffmpeg-temp';
  
  /**
   * Get temp directory path for a file.
   * Structure: .ffmpeg-temp/{namespace...}/{fileId}/
   */
  getTempDir(fileId: string, namespace: string[]): string {
    return path.join(this.TEMP_BASE, ...namespace, fileId);
  }
  
  /**
   * Create temp directory and write input file.
   * Returns paths to input and output locations.
   */
  async initializeProcessing(
    file: FfmpegFile,
    namespace: string[]
  ): Promise<{
    tempDir: string;
    inputPath: string;
    outputPath: string;
  }> {
    const tempDir = this.getTempDir(file.id, namespace);
    await fs.mkdir(tempDir, { recursive: true });
    
    const ext = path.extname(file.name) || '.mp4';
    const inputPath = path.join(tempDir, `input${ext}`);
    const outputPath = path.join(tempDir, `output.mp4`);
    
    // Write input file from buffer, stream, or copy from local path
    if (file.buffer) {
      await fs.writeFile(inputPath, file.buffer);
    } else if (file.stream) {
      await this.streamToFile(file.stream, inputPath);
    } else if (file.localPath) {
      await fs.copyFile(file.localPath, inputPath);
    } else {
      throw new Error('FfmpegFile must have buffer, stream, or localPath');
    }
    
    // Create lock file
    await this.createLockFile(tempDir, file, namespace);
    
    return { tempDir, inputPath, outputPath };
  }
  
  /**
   * Create lock file to track active processing.
   */
  private async createLockFile(
    tempDir: string,
    file: FfmpegFile,
    namespace: string[]
  ): Promise<void> {
    const lockContent: LockFileContent = {
      fileId: file.id,
      namespace,
      originalName: file.name,
      mimeType: file.mimeType,
      startedAt: new Date().toISOString(),
      pid: process.pid,
    };
    
    await fs.writeFile(
      path.join(tempDir, '.lock'),
      JSON.stringify(lockContent, null, 2)
    );
  }
  
  /**
   * Get all dangling files for a namespace.
   * A file is "dangling" if it has a .lock file but the process
   * that created it is no longer running.
   */
  async getFilesByNamespace(namespace: string[]): Promise<DanglingFile[]> {
    const namespaceDir = path.join(this.TEMP_BASE, ...namespace);
    const danglingFiles: DanglingFile[] = [];
    
    try {
      const entries = await fs.readdir(namespaceDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        const tempDir = path.join(namespaceDir, entry.name);
        const lockPath = path.join(tempDir, '.lock');
        
        try {
          const lockContent = await fs.readFile(lockPath, 'utf-8');
          const lockData: LockFileContent = JSON.parse(lockContent);
          
          // Check if process is still running
          if (this.isProcessRunning(lockData.pid)) {
            // Still processing, skip
            continue;
          }
          
          // Check for output file
          const outputPath = path.join(tempDir, 'output.mp4');
          const hasOutput = await this.fileExists(outputPath);
          
          // Find input file
          const files = await fs.readdir(tempDir);
          const inputFile = files.find(f => f.startsWith('input.'));
          
          danglingFiles.push({
            fileId: lockData.fileId,
            namespace: lockData.namespace,
            tempDir,
            inputPath: inputFile ? path.join(tempDir, inputFile) : '',
            outputPath: hasOutput ? outputPath : undefined,
            lockMetadata: {
              startedAt: new Date(lockData.startedAt),
              originalName: lockData.originalName,
              mimeType: lockData.mimeType,
            },
          });
        } catch (error) {
          // No lock file or invalid, skip
          this.logger.debug(`Skipping ${tempDir}: no valid lock file`);
        }
      }
    } catch (error) {
      // Namespace directory doesn't exist
      this.logger.debug(`Namespace directory doesn't exist: ${namespaceDir}`);
    }
    
    return danglingFiles;
  }
  
  /**
   * Get processed file as stream.
   */
  async getOutputFile(fileId: string, namespace: string[]): Promise<{
    stream: Readable;
    size: number;
    path: string;
  }> {
    const tempDir = this.getTempDir(fileId, namespace);
    const outputPath = path.join(tempDir, 'output.mp4');
    
    const stats = await fs.stat(outputPath);
    const stream = require('fs').createReadStream(outputPath);
    
    return {
      stream,
      size: stats.size,
      path: outputPath,
    };
  }
  
  /**
   * Delete all temp files for a file.
   */
  async cleanup(fileId: string, namespace: string[]): Promise<void> {
    const tempDir = this.getTempDir(fileId, namespace);
    
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      this.logger.debug(`Cleaned up temp directory: ${tempDir}`);
    } catch (error) {
      this.logger.warn(`Failed to cleanup ${tempDir}:`, error);
    }
  }
  
  /**
   * Check if a process is running.
   */
  private isProcessRunning(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }
  
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  private async streamToFile(stream: Readable, filePath: string): Promise<void> {
    const writeStream = require('fs').createWriteStream(filePath);
    return new Promise((resolve, reject) => {
      stream.pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
  }
}
```

### Step 4: Update Consumers for Crash Recovery

Each consumer module should implement `OnModuleInit` to check for dangling files.

**Key Points:**
- Each consumer uses a **unique namespace** to identify their files
- Recovery logic is **consumer-specific** (different services may handle differently)
- Consumers call `getFilesByNamespace()` to find ONLY their own dangling files
- Consumers decide whether to re-process or cleanup based on their requirements

**Example: capsule.service.ts:**
```typescript
@Injectable()
export class CapsuleService implements OnModuleInit {
  private readonly NAMESPACE = ['capsules'];
  private readonly logger = new Logger(CapsuleService.name);
  
  constructor(
    private readonly ffmpegService: FfmpegService,
    private readonly fileService: FileService,
    private readonly capsuleEventService: CapsuleEventService,
  ) {}
  
  async onModuleInit() {
    // On startup, check for files that were being processed when server crashed
    await this.recoverDanglingFiles();
  }
  
  private async recoverDanglingFiles() {
    this.logger.log('Checking for dangling video processing jobs...');
    
    // Only get files in our namespace - other services have their own
    const danglingFiles = await this.ffmpegService.getFilesByNamespace(this.NAMESPACE);
    
    if (danglingFiles.length === 0) {
      this.logger.log('No dangling files found');
      return;
    }
    
    this.logger.warn(`Found ${danglingFiles.length} dangling file(s)`);
    
    for (const file of danglingFiles) {
      await this.handleDanglingFile(file);
    }
  }
  
  private async handleDanglingFile(file: DanglingFile) {
    // Check if file record still exists in database
    const dbFile = await this.fileService.getFileById(file.fileId);
    
    if (!dbFile) {
      // File was deleted from database, cleanup temp files
      this.logger.log(`File ${file.fileId} no longer in database, cleaning up`);
      await this.ffmpegService.cleanup(file.fileId, this.NAMESPACE);
      return;
    }
    
    // Check if processing had completed
    if (file.outputPath) {
      // Processing finished but storage failed - retry storage only
      this.logger.log(`Retrying storage for ${file.fileId}`);
      await this.retryStorageOnly(file, dbFile);
    } else {
      // Processing was interrupted - start fresh
      this.logger.log(`Re-triggering processing for ${file.fileId}`);
      await this.ffmpegService.cleanup(file.fileId, this.NAMESPACE);
      await this.triggerProcessing(dbFile);
    }
  }
  
  private async retryStorageOnly(file: DanglingFile, dbFile: FileRecord) {
    try {
      // Get processed file from FFmpeg temp directory
      const processedFile = await this.ffmpegService.getProcessedFile(
        file.fileId,
        this.NAMESPACE
      );
      
      // Store in actual storage provider
      await this.fileService.replaceFileContent(file.fileId, {
        stream: processedFile.stream,
        size: processedFile.size,
        mimeType: 'video/mp4',
      });
      
      // Update database
      await this.fileService.updateFile(file.fileId, {
        size: processedFile.size,
        mimeType: 'video/mp4',
      });
      
      // Cleanup temp files
      await this.ffmpegService.cleanup(file.fileId, this.NAMESPACE);
      
      this.logger.log(`Successfully recovered ${file.fileId}`);
    } catch (error) {
      this.logger.error(`Failed to recover ${file.fileId}:`, error);
      // Capsule-specific: notify user of failure
      await this.capsuleEventService.emitProcessingFailed(file.fileId, error.message);
    }
  }
}
```

**Example: presentation.service.ts** (different recovery logic):
```typescript
@Injectable()
export class PresentationService implements OnModuleInit {
  private readonly NAMESPACE = ['presentation', 'video'];
  
  async onModuleInit() {
    await this.recoverDanglingFiles();
  }
  
  private async recoverDanglingFiles() {
    const danglingFiles = await this.ffmpegService.getFilesByNamespace(this.NAMESPACE);
    
    for (const file of danglingFiles) {
      const dbFile = await this.fileService.getFileById(file.fileId);
      
      if (!dbFile) {
        await this.ffmpegService.cleanup(file.fileId, this.NAMESPACE);
        continue;
      }
      
      // Presentation-specific: mark as failed, don't auto-retry
      // User can manually retry from presentation editor
      await this.markProcessingFailed(file.fileId, 'Server restart during processing');
      await this.ffmpegService.cleanup(file.fileId, this.NAMESPACE);
      
      // Create notification for user
      await this.notificationService.create({
        userId: dbFile.ownerId,
        type: 'video_processing_failed',
        message: `Video processing was interrupted. Please re-upload.`,
      });
    }
  }
}
```

---

## 6. Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `ffmpeg/interfaces/ffmpeg.interfaces.ts` | Type definitions for FfmpegFile, ProcessingResult, DanglingFile, etc. |
| `ffmpeg/services/ffmpeg-temp.service.ts` | Temp file and namespace management |
| `ffmpeg/ARCHITECTURE.md` | Module documentation |

### Modified Files
| File | Changes |
|------|---------|
| `ffmpeg/services/ffmpeg.service.ts` | New `processVideo()` method with File input; add `getFilesByNamespace()`, `getProcessedFile()`, `cleanup()` |
| `ffmpeg/ffmpeg.module.ts` | Register FfmpegTempService |
| `capsule/services/capsule.service.ts` | Implement OnModuleInit + new processing flow |
| `presentation/services/presentation.service.ts` | Implement OnModuleInit + new processing flow |
| `storage/controllers/storage.controller.ts` | Update processing flow |

### Deprecated (to be removed)
| File/Method | Reason |
|-------------|--------|
| `convertVideoToH264AndReplace()` | Replaced by `processVideo()` with File input |
| `refreshFileSizeFromDisk()` | No longer needed - consumer handles file size via storage provider |

---

## 7. Testing Scenarios

### Unit Tests
- [ ] FfmpegTempService creates correct directory structure with namespace
- [ ] FfmpegTempService writes input file from buffer/stream/localPath
- [ ] FfmpegTempService creates lock file with correct metadata
- [ ] FfmpegTempService.getFilesByNamespace() returns only files for that namespace
- [ ] FfmpegTempService.getFilesByNamespace() excludes files with running PID
- [ ] FfmpegTempService.cleanup() removes entire temp directory
- [ ] FfmpegService.processVideo() accepts FfmpegFile with different input types
- [ ] FfmpegService.getProcessedFile() returns correct stream and size

### Integration Tests
- [ ] Full processing: upload → process → store in S3 → verify file
- [ ] Namespace isolation: two services process files simultaneously, each sees only their own
- [ ] Crash recovery with completed output: restart → detect → store → cleanup
- [ ] Crash recovery with incomplete output: restart → detect → cleanup → reprocess
- [ ] Abort signal properly cancels processing and preserves temp files

### Manual Tests
- [ ] Upload video via Capsule → verify stored correctly in storage provider
- [ ] Upload video via Presentation → verify stored correctly  
- [ ] Kill server during processing → restart → verify recovery happens
- [ ] Upload same file to Capsule and Presentation simultaneously → no conflicts

---

## 8. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking existing functionality | Phased rollout, existing API can coexist temporarily |
| Performance impact from file copy | Streaming writes, async processing |
| Disk space from temp files | Namespace isolation + cleanup on startup + periodic cleanup job |
| Race conditions with concurrent uploads | Unique fileId-based temp directories |
| Storage provider failures during store | Temp files preserved for retry on next restart |
| Multi-instance deployments | Lock file includes PID, handles single-instance; for multi-instance use DB-based locking |

---

## 9. Implementation Order

1. **Phase 1** (Immediate): Create interfaces and FfmpegTempService
2. **Phase 2**: Update FfmpegService with new `processVideo()` method accepting File input
3. **Phase 3**: Update consumers to use new flow (get file → process → store → cleanup)
4. **Phase 4**: Add OnModuleInit crash recovery to each consumer
5. **Final**: Create ARCHITECTURE.md documentation, remove deprecated methods

---

## 10. Open Questions

1. **Recovery strategy**: Should we automatically re-process dangling files, or mark them as failed and notify?
   - **Recommendation**: Consumer-specific. CapsuleService: auto-retry. PresentationService: mark failed.

2. **Cleanup schedule**: Should we have a periodic job to clean old temp files?
   - **Recommendation**: Yes, clean temp files older than 24 hours as a safety net

3. **Multi-instance deployment**: How to handle multiple API instances?
   - **Recommendation**: For now, single instance. For multi-instance, add DB-based job tracking.

4. **Large file handling**: Should we stream directly or use buffer?
   - **Recommendation**: Always stream for videos to avoid memory issues

---

## 11. Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-11-25 | FFmpeg creates local copy of file | FileService may use S3/cloud, FFmpeg needs local files |
| 2025-11-25 | Namespace per consumer service | Each service can apply its own recovery logic |
| 2025-11-25 | Consumer responsible for store + cleanup | Clear ownership, storage provider agnostic |
| 2025-11-25 | Lock file with PID for tracking | Simple, filesystem-based, detects stale processes |
| 2025-11-25 | OnModuleInit for crash recovery | Each consumer handles their own files differently |
| 2025-11-25 | Remove refreshFileSizeFromDisk dependency | Consumer updates file via storage provider directly |
