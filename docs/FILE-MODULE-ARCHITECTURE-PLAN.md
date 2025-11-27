# File Module Architecture Plan

## 📋 Overview

Create a comprehensive **core/modules/file** module that centralizes all file-related operations with proper abstraction for different storage backends (local filesystem, S3, etc.).

---

## 🎯 Goals

1. **Abstract Storage Backend**: Use interface-based design to support multiple storage types
2. **Centralize File Operations**: Single source of truth for file paths, streams, and metadata
3. **Video Streaming Support**: Dedicated service for HTTP Range requests and video delivery
4. **Separation of Concerns**: Clear boundaries between storage, path management, and streaming

---

## 📁 Proposed Module Structure

```
apps/api/src/core/modules/file/
├── file.module.ts                          # Main module with provider configuration
├── interfaces/
│   ├── storage-provider.interface.ts       # IStorageProvider interface
│   └── file-metadata.interface.ts          # Common types/interfaces
├── providers/
│   ├── local-storage.provider.ts           # Local filesystem implementation
│   ├── s3-storage.provider.ts              # AWS S3 implementation (future)
│   └── index.ts                            # Provider exports
├── services/
│   ├── file-path.service.ts                # Path resolution & building
│   ├── file-stream.service.ts              # Stream creation & management
│   ├── video-stream.service.ts             # Video streaming with Range requests
│   ├── file-metadata.service.ts            # File metadata operations
│   └── index.ts                            # Service exports
└── index.ts                                # Public API exports
```

---

## 🏗️ Core Abstractions

### 1. **IStorageProvider Interface**

```typescript
interface IStorageProvider {
  // Base directory/bucket configuration
  getBaseDirectory(): string;
  
  // Path operations
  getAbsolutePath(relativePath: string): string;
  buildRelativePath(namespace: string[], filename: string): string;
  
  // File operations
  exists(relativePath: string): Promise<boolean>;
  save(file: File, relativePath: string): Promise<string>;
  delete(relativePath: string): Promise<void>;
  
  // Metadata operations
  getStats(relativePath: string): Promise<FileStats>;
  getSize(relativePath: string): Promise<number>;
  
  // Stream operations
  createReadStream(relativePath: string, options?: { start?: number; end?: number }): Promise<NodeJS.ReadableStream>;
  createWriteStream(relativePath: string): Promise<NodeJS.WritableStream>;
}

interface FileStats {
  size: number;
  mimeType: string;
  createdAt: Date;
  modifiedAt: Date;
}
```

---

## 🔧 Services

### 1. **FilePathService**

**Purpose**: Path resolution and building (no storage backend dependency)

```typescript
@Injectable()
class FilePathService {
  // Build paths from database file records
  buildRelativePath(namespace: string[], filename: string): string;
  normalizeExtension(filename: string): string;
  buildStoredFilename(fileId: string, extension: string): string;
  parseFilePath(path: string): { namespace: string[]; filename: string };
}
```

---

### 2. **FileStreamService**

**Purpose**: Create and manage file streams (delegates to storage provider)

```typescript
@Injectable()
class FileStreamService {
  constructor(
    @Inject('STORAGE_PROVIDER') private storageProvider: IStorageProvider,
    private pathService: FilePathService
  ) {}
  
  // Create read streams with range support
  async createReadStream(
    fileData: { filePath: string },
    options?: { start?: number; end?: number }
  ): Promise<NodeJS.ReadableStream>;
  
  // Get file as LazyFile for ORPC
  async createLazyFile(
    fileData: { filePath: string; filename: string; mimeType: string },
    options?: { start?: number; end?: number }
  ): Promise<LazyFile>;
  
  // Stream lifecycle management
  async closeStream(stream: NodeJS.ReadableStream): Promise<void>;
}
```

---

### 3. **VideoStreamService** ⭐ (Main Focus)

**Purpose**: Handle video streaming with HTTP Range request support

```typescript
@Injectable()
class VideoStreamService {
  constructor(
    private streamService: FileStreamService,
    private storageProvider: IStorageProvider,
    private pathService: FilePathService
  ) {}
  
  /**
   * Parse Range header and enforce chunk size limit
   */
  parseRangeHeader(
    rangeHeader: string,
    fileSize: number,
    maxChunkSize?: number
  ): RangeResult | null;
  
  /**
   * Build response headers for Range requests
   */
  buildRangeHeaders(
    range: RangeResult,
    fileSize: number,
    mimeType: string
  ): Record<string, string>;
  
  /**
   * Build response headers for full file requests
   */
  buildFullFileHeaders(
    fileSize: number,
    mimeType: string
  ): Record<string, string>;
  
  /**
   * Stream video with Range support
   * Returns complete response object for ORPC
   */
  async streamVideo(
    fileData: { id: string; filePath: string; filename: string; mimeType: string },
    rangeHeader?: string,
    options?: { maxChunkSize?: number }
  ): Promise<VideoStreamResponse>;
}

interface RangeResult {
  start: number;
  end: number;
  chunkSize: number;
}

interface VideoStreamResponse {
  status?: number;  // 206 for partial, undefined for 200
  headers: Record<string, string>;
  body: LazyFile;
}
```

---

### 4. **FileMetadataService**

**Purpose**: File metadata operations

```typescript
@Injectable()
class FileMetadataService {
  constructor(
    @Inject('STORAGE_PROVIDER') private storageProvider: IStorageProvider
  ) {}
  
  async getFileSize(fileData: { filePath: string }): Promise<number>;
  async getFileStats(fileData: { filePath: string }): Promise<FileStats>;
  async fileExists(fileData: { filePath: string }): Promise<boolean>;
  async getMimeType(fileData: { filePath: string; mimeType?: string }): Promise<string>;
}
```

---

## 🔌 Storage Provider Implementations

### LocalStorageProvider

```typescript
@Injectable()
class LocalStorageProvider implements IStorageProvider {
  constructor(private envService: EnvService) {
    this.baseDir = envService.get('UPLOADS_DIR');
  }
  
  getBaseDirectory(): string {
    return this.baseDir;
  }
  
  getAbsolutePath(relativePath: string): string {
    return join(this.baseDir, relativePath);
  }
  
  async createReadStream(
    relativePath: string,
    options?: { start?: number; end?: number }
  ): Promise<NodeJS.ReadableStream> {
    const absolutePath = this.getAbsolutePath(relativePath);
    return createReadStream(absolutePath, options);
  }
  
  // ... other implementations
}
```

### Future: S3StorageProvider

```typescript
@Injectable()
class S3StorageProvider implements IStorageProvider {
  constructor(
    private s3Client: S3Client,
    private bucketName: string
  ) {}
  
  getBaseDirectory(): string {
    return this.bucketName;
  }
  
  getAbsolutePath(relativePath: string): string {
    return `s3://${this.bucketName}/${relativePath}`;
  }
  
  async createReadStream(
    relativePath: string,
    options?: { start?: number; end?: number }
  ): Promise<NodeJS.ReadableStream> {
    const params = {
      Bucket: this.bucketName,
      Key: relativePath,
      Range: options ? `bytes=${options.start}-${options.end}` : undefined
    };
    const response = await this.s3Client.getObject(params);
    return response.Body as NodeJS.ReadableStream;
  }
  
  // ... other implementations
}
```

---

## 📦 Module Configuration

```typescript
@Module({
  providers: [
    // Storage provider (configurable via factory)
    {
      provide: 'STORAGE_PROVIDER',
      useFactory: (envService: EnvService) => {
        const storageType = envService.get('STORAGE_TYPE'); // 'local' | 's3'
        
        if (storageType === 's3') {
          // return new S3StorageProvider(...);
        }
        
        return new LocalStorageProvider(envService);
      },
      inject: [EnvService]
    },
    
    // Services
    FilePathService,
    FileStreamService,
    VideoStreamService,
    FileMetadataService,
  ],
  exports: [
    'STORAGE_PROVIDER',
    FilePathService,
    FileStreamService,
    VideoStreamService,
    FileMetadataService,
  ]
})
export class FileModule {}
```

---

## 🔄 Migration Path

### Phase 1: Create Core Abstractions
1. ✅ Create `interfaces/storage-provider.interface.ts`
2. ✅ Create `providers/local-storage.provider.ts`
3. ✅ Create `services/file-path.service.ts`
4. ✅ Create `services/file-metadata.service.ts`

### Phase 2: Stream Services
5. ✅ Create `services/file-stream.service.ts`
6. ✅ Create `services/video-stream.service.ts` (extract logic from PresentationController)
7. ✅ Create `file.module.ts` with proper DI setup

### Phase 3: Update Consumers
8. ✅ Update `PresentationController` to use `VideoStreamService`
9. ✅ Update `FileUploadService` to use storage provider
10. ✅ Update `StorageService` to delegate to storage provider
11. ✅ Update `StorageController` to use new services

### Phase 4: Remove Old Dependencies
12. ✅ Remove `UPLOADS_DIR` from `storage.config.ts`
13. ✅ Update all imports to use storage provider
14. ✅ Remove duplicated path logic from services

---

## 🎬 Usage Example: PresentationController

**Before:**
```typescript
@Implement(presentationContract.getVideo)
getVideo(@Headers() headers: Record<string, string>) {
  return implement(presentationContract.getVideo).handler(async () => {
    // 150+ lines of range parsing, stream creation, header building
    const absolutePath = await this.presentationService.getAbsoluteFilePath(...);
    const fileStats = await stat(absolutePath);
    const range = this.parseRange(...);
    const stream = createReadStream(absolutePath, { start, end });
    // ... convert to LazyFile
    // ... build headers
    return { status: 206, headers: {...}, body: lazyFile };
  });
}
```

**After:**
```typescript
@Implement(presentationContract.getVideo)
getVideo(@Headers() headers: Record<string, string>) {
  return implement(presentationContract.getVideo).handler(async () => {
    const currentVideo = await this.presentationService.getCurrentVideo();
    
    // Single line - all logic delegated to VideoStreamService
    return this.videoStreamService.streamVideo(
      currentVideo.file,
      headers.range,
      { maxChunkSize: 5 * 1024 * 1024 } // 5MB chunks
    );
  });
}
```

---

## ✅ Benefits

1. **Single Responsibility**: Each service has a clear, focused purpose
2. **Testability**: Easy to mock storage providers and test services independently
3. **Flexibility**: Switch storage backends without changing consumer code
4. **Reusability**: Video streaming logic used by any controller (Presentation, Capsule, etc.)
5. **Maintainability**: Bug fixes and improvements in one place
6. **Type Safety**: Full TypeScript support with proper interfaces
7. **Performance**: Efficient stream management with proper lifecycle handling

---

## 🔐 Configuration

```env
# Storage Configuration
STORAGE_TYPE=local                          # 'local' | 's3' | 'azure'
UPLOADS_DIR=/app/apps/api/uploads          # For local storage

# S3 Configuration (if STORAGE_TYPE=s3)
S3_BUCKET=my-uploads-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=xxx
S3_SECRET_ACCESS_KEY=xxx

# Video Streaming Configuration
VIDEO_CHUNK_SIZE=512000                     # 500KB default chunk size
VIDEO_ENABLE_RANGE_REQUESTS=true
```

---

## 📝 Next Steps

1. Review and approve this plan
2. Implement Phase 1 (abstractions)
3. Implement Phase 2 (stream services)
4. Test video streaming with new architecture
5. Migrate existing controllers
6. Remove deprecated code
7. Document the new API

---

## 🤔 Questions to Consider

1. Should we support multiple storage providers simultaneously (hybrid)?
2. Do we need caching layer for frequently accessed files?
3. Should video processing be part of this module or stay separate?
4. Do we need file access logging/auditing?
5. Should we implement file versioning?
