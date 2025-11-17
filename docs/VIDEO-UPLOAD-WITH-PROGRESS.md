# Video Upload with Progress - Usage Guide

## Overview

This guide explains how to implement video uploads with progress tracking in the application. The solution uses XMLHttpRequest (XHR) instead of the standard Fetch API to enable real-time progress monitoring.

## Why XHR Instead of ORPC?

The default ORPC client uses the Fetch API, which has a limitation: **it cannot track upload progress**. While Fetch can track download progress, it provides no way to monitor upload progress for multipart/form-data requests.

XMLHttpRequest provides the `upload.progress` event, which is the only browser API that can track upload progress.

## Implementation Examples

### Example 1: Presentation Video Upload (Already Implemented)

Location: `apps/web/app/admin/presentation/admin-presentation-client.tsx`

```tsx
import { useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { getApiUrl } from '@/lib/api-url';

export function AdminPresentationClient() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const uploadWithProgress = (file: File, onProgress: (progress: number) => void): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);

      // Track progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress(percentComplete);
        }
      });

      xhr.timeout = 600000; // 10 minutes
      xhr.open('POST', getApiUrl('/presentation/upload'), true);
      xhr.withCredentials = true;
      xhr.send(formData);
    });
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      await uploadWithProgress(file, (progress) => {
        setUploadProgress(progress);
      });
      toast.success('Upload complete!');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      {isUploading && (
        <div className="space-y-3">
          <Progress value={uploadProgress} className="w-full" />
          <div className="text-sm">
            <span>{uploadProgress}%</span>
            {uploadProgress === 100 && <span> - Processing...</span>}
          </div>
        </div>
      )}
    </div>
  );
}
```

### Example 2: Generic Video Upload with Progress

For other video upload scenarios, use the shared utility:

```tsx
import { useState } from 'react';
import { uploadFileWithProgress } from '@/hooks/useStorage';
import { Progress } from '@/components/ui/progress';

export function VideoUploadComponent() {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setProgress(0);

    try {
      const result = await uploadFileWithProgress(
        file,
        '/upload/video',
        (progress) => setProgress(progress)
      );

      toast.success(`Uploaded: ${result.filename}`);
      console.log('File path:', result.path);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept="video/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      {isUploading && (
        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-sm text-muted-foreground">
            {progress < 100 ? `Uploading... ${progress}%` : 'Processing on server...'}
          </p>
        </div>
      )}

      <Button onClick={handleUpload} disabled={!file || isUploading}>
        {isUploading ? 'Uploading...' : 'Upload Video'}
      </Button>
    </div>
  );
}
```

### Example 3: Advanced Upload with Speed and Time Remaining

```tsx
import { useState, useRef } from 'react';
import { uploadFileWithProgress } from '@/hooks/useStorage';
import { Progress } from '@/components/ui/progress';

export function AdvancedVideoUpload() {
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const startTimeRef = useRef<number>(0);
  const lastLoadedRef = useRef<number>(0);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  const uploadWithStats = (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);

      startTimeRef.current = Date.now();
      lastLoadedRef.current = 0;

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setProgress(percentComplete);

          // Calculate speed
          const elapsedTime = (Date.now() - startTimeRef.current) / 1000; // seconds
          const bytesPerSecond = event.loaded / elapsedTime;
          setSpeed(`${formatBytes(bytesPerSecond)}/s`);

          // Calculate time remaining
          const bytesRemaining = event.total - event.loaded;
          const secondsRemaining = bytesRemaining / bytesPerSecond;
          setTimeRemaining(formatTime(secondsRemaining));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Network error')));
      xhr.timeout = 600000;
      xhr.open('POST', '/upload/video', true);
      xhr.withCredentials = true;
      xhr.send(formData);
    });
  };

  return (
    <div className="space-y-4">
      <Progress value={progress} className="w-full" />
      
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{progress}%</span>
        <span>{speed}</span>
        <span>{timeRemaining} remaining</span>
      </div>
    </div>
  );
}
```

## API Endpoints for File Upload

### Available Upload Endpoints

1. **Presentation Video**: `/presentation/upload`
   - Max size: 500MB
   - Formats: MP4, WebM, OGG
   - Returns: Video metadata with DB record

2. **Generic Video**: `/upload/video`
   - Max size: 500MB
   - Formats: MP4, WebM, OGG
   - Returns: File path and metadata

3. **Audio**: `/upload/audio`
   - Max size: 10MB
   - Formats: MP3, WAV, OGG, M4A, FLAC
   - Returns: File path and metadata

4. **Image**: `/upload/image`
   - Max size: 10MB
   - Formats: JPEG, PNG, GIF, WebP
   - Returns: File path and metadata

## Configuration

### Timeout Settings

All upload configurations use a 10-minute timeout:

```typescript
xhr.timeout = 600000; // 10 minutes in milliseconds
```

This matches the server configuration:
- Nginx: `proxy_read_timeout 600s`
- Nginx: `client_body_timeout 600s`

### File Size Limits

Configured in:
- `apps/api/src/config/multer.config.ts`: 500MB for videos
- `nginx.conf`: `client_max_body_size 500M`
- ORPC contracts: Validation in contract schemas

## Best Practices

### 1. Always Show Progress for Large Files

```tsx
// Good: Show progress for videos
if (file.type.startsWith('video/')) {
  await uploadFileWithProgress(file, endpoint, onProgress);
}

// Acceptable: No progress for small images
if (file.type.startsWith('image/')) {
  await orpc.storage.uploadImage.mutate({ file });
}
```

### 2. Disable UI During Upload

```tsx
<Button disabled={isUploading}>
  {isUploading ? 'Uploading...' : 'Upload'}
</Button>
```

### 3. Handle Errors Gracefully

```tsx
try {
  await uploadFileWithProgress(file, endpoint, onProgress);
  toast.success('Upload complete!');
} catch (error) {
  if (error.message.includes('timeout')) {
    toast.error('Upload took too long. Try a smaller file or better connection.');
  } else if (error.message.includes('Network error')) {
    toast.error('Connection lost. Please check your internet and try again.');
  } else {
    toast.error(error.message);
  }
}
```

### 4. Prevent Page Navigation During Upload

```tsx
useEffect(() => {
  if (!isUploading) return;

  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = 'Upload in progress. Are you sure you want to leave?';
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [isUploading]);
```

### 5. Add Cancel Capability (Optional)

```tsx
const [xhr, setXhr] = useState<XMLHttpRequest | null>(null);

const handleCancel = () => {
  xhr?.abort();
  setIsUploading(false);
  toast.info('Upload cancelled');
};

// In upload function:
const newXhr = new XMLHttpRequest();
setXhr(newXhr);
// ... rest of upload setup
```

## Troubleshooting

### Upload Appears to Stall

**Symptoms:**
- Progress bar stops moving
- No error message
- Long wait time

**Causes:**
1. Slow network connection
2. Large file size
3. Server processing time after upload

**Solutions:**
- Add "Processing..." indicator when progress reaches 100%
- Show upload speed to indicate activity
- Display time remaining estimate
- Use smaller file sizes (<100MB recommended)

### Timeout Errors

**Symptoms:**
- "Upload timeout" error after 10 minutes
- Progress stops before 100%

**Solutions:**
1. Increase timeout in code and nginx
2. Reduce file size
3. Implement chunked upload for very large files
4. Use direct cloud storage upload

### Progress Bar Not Moving

**Symptoms:**
- Upload works but no progress shown
- Progress stuck at 0%

**Causes:**
- Missing `onProgress` callback
- Progress event not firing
- File too small to trigger events

**Debug:**
```typescript
xhr.upload.addEventListener('progress', (event) => {
  console.log('Progress event:', {
    loaded: event.loaded,
    total: event.total,
    lengthComputable: event.lengthComputable
  });
  
  if (event.lengthComputable) {
    onProgress(Math.round((event.loaded / event.total) * 100));
  }
});
```

## Performance Optimization

### For Large Files (>100MB)

1. **Use Compression** (if applicable):
```typescript
// Server-side with multer
const upload = multer({
  storage: diskStorage({ /* ... */ }),
  limits: { fileSize: 500 * 1024 * 1024 },
  // Add file filter for validation
});
```

2. **Consider Chunked Upload** for files >200MB:
   - Split into 10MB chunks
   - Upload sequentially with retry logic
   - More reliable for very large files

3. **Direct Cloud Upload**:
   - Generate pre-signed URL
   - Upload directly to S3/R2
   - Bypass application server
   - Notify server via webhook

### For Multiple Files

```typescript
const uploadMultipleWithProgress = async (
  files: File[],
  onProgress: (index: number, progress: number) => void
) => {
  for (let i = 0; i < files.length; i++) {
    await uploadFileWithProgress(
      files[i],
      '/upload/video',
      (progress) => onProgress(i, progress)
    );
  }
};
```

## Server-Side Considerations

### File Storage Location

Files are stored in:
- Videos: `uploads/videos/`
- Images: `uploads/images/`
- Audio: `uploads/audio/`

### Database Records

Video uploads create database records with:
- Filename (server-generated)
- File path
- MIME type
- File size
- Upload timestamp
- Optional: duration, dimensions, thumbnail

### Processing After Upload

For videos, consider background processing:
1. Generate thumbnail
2. Extract metadata (duration, resolution)
3. Convert to optimized formats
4. Create multiple quality versions

## Related Documentation

- [Upload Investigation](../UPLOAD-INVESTIGATION.md) - Root cause analysis
- [Nginx Configuration](../nginx.conf) - Server timeout settings
- [Multer Configuration](../apps/api/src/config/multer.config.ts) - File upload limits
- [ORPC Client](../apps/web/lib/orpc/index.ts) - API client setup
