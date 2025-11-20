# File Upload Hooks

This directory contains React hooks for handling file uploads with the API.

## Available Hooks

### Standard XMLHttpRequest-based Uploads

Located in `useStorage.ts`:

- `useUploadImage()` - Upload image files
- `useUploadVideo()` - Upload video files  
- `useUploadAudio()` - Upload audio files
- `useStorage()` - Composite hook for all upload types

These hooks run XMLHttpRequest in the main thread.

### Web Worker-based Uploads (Recommended)

Located in `useWorkerFileUpload.ts`:

- `useWorkerUploadImage()` - Upload image files in background worker
- `useWorkerUploadVideo()` - Upload video files in background worker
- `useWorkerUploadAudio()` - Upload audio files in background worker
- `useWorkerStorage()` - Composite hook for all upload types with workers

**Benefits of Worker-based uploads:**
- ✅ Non-blocking UI - uploads run in background thread
- ✅ Better performance - main thread stays responsive
- ✅ Multiple concurrent uploads without UI lag
- ✅ Easy cancellation support
- ✅ Same API as standard hooks for easy migration

## Usage Examples

### Basic Image Upload with Worker

```tsx
import { useWorkerUploadImage } from '@/hooks/useWorkerFileUpload'

function ImageUploadComponent() {
  const upload = useWorkerUploadImage()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      upload.mutate(file)
    }
  }

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFileSelect} />
      {upload.isPending && (
        <div>
          <p>Uploading: {upload.uploadProgress.toFixed(1)}%</p>
          <progress value={upload.uploadProgress} max={100} />
        </div>
      )}
      {upload.data && <p>Uploaded: {upload.data.filename}</p>}
      {upload.error && <p>Error: {upload.error.message}</p>}
    </div>
  )
}
```

### Upload with Custom Progress Callback

```tsx
import { useWorkerUploadVideo } from '@/hooks/useWorkerFileUpload'
import { useState } from 'react'

function VideoUploadWithProgress() {
  const upload = useWorkerUploadVideo()
  const [customProgress, setCustomProgress] = useState(0)

  const handleUpload = async (file: File) => {
    try {
      const result = await upload.mutateAsync(file, (event) => {
        setCustomProgress(event.progress)
        console.log(`Upload progress: ${event.progress}%`)
      })
      console.log('Upload complete:', result)
    } catch (error) {
      console.error('Upload failed:', error)
    }
  }

  return (
    <div>
      {/* Your upload UI */}
      <p>Custom tracked progress: {customProgress.toFixed(1)}%</p>
    </div>
  )
}
```

### Upload with Cancellation

```tsx
import { useWorkerUploadImage } from '@/hooks/useWorkerFileUpload'

function CancellableUpload() {
  const upload = useWorkerUploadImage()

  const handleFileSelect = (file: File) => {
    upload.mutate(file)
  }

  const handleCancel = () => {
    upload.cancel()
  }

  return (
    <div>
      <input type="file" onChange={(e) => handleFileSelect(e.target.files?.[0]!)} />
      {upload.isPending && (
        <>
          <progress value={upload.uploadProgress} max={100} />
          <button onClick={handleCancel}>Cancel Upload</button>
        </>
      )}
    </div>
  )
}
```

### Composite Hook for Multiple Upload Types

```tsx
import { useWorkerStorage } from '@/hooks/useWorkerFileUpload'

function MultiTypeUploader() {
  const storage = useWorkerStorage()

  const handleImageUpload = (file: File) => {
    storage.uploadImage(file)
  }

  const handleVideoUpload = (file: File) => {
    storage.uploadVideo(file)
  }

  return (
    <div>
      <div>
        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e.target.files?.[0]!)} />
        {storage.isUploading.image && <progress value={storage.uploadProgress.image} max={100} />}
        {storage.data.image && <p>Image: {storage.data.image.filename}</p>}
      </div>

      <div>
        <input type="file" accept="video/*" onChange={(e) => handleVideoUpload(e.target.files?.[0]!)} />
        {storage.isUploading.video && <progress value={storage.uploadProgress.video} max={100} />}
        {storage.data.video && <p>Video: {storage.data.video.filename}</p>}
      </div>

      <div>
        <p>Any upload in progress: {storage.isUploading.any ? 'Yes' : 'No'}</p>
      </div>
    </div>
  )
}
```

### Drag and Drop Upload

```tsx
import { useWorkerUploadImage } from '@/hooks/useWorkerFileUpload'
import { useState } from 'react'

function DragDropUpload() {
  const upload = useWorkerUploadImage()
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      upload.mutate(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragging(false)}
      style={{
        border: isDragging ? '2px solid blue' : '2px dashed gray',
        padding: '20px',
        borderRadius: '8px',
      }}
    >
      {upload.isPending ? (
        <div>
          <p>Uploading... {upload.uploadProgress.toFixed(1)}%</p>
          <progress value={upload.uploadProgress} max={100} />
        </div>
      ) : (
        <p>Drag and drop an image here</p>
      )}
      
      {upload.data && (
        <div>
          <p>Uploaded: {upload.data.filename}</p>
          <img src={upload.data.url} alt={upload.data.filename} />
        </div>
      )}
    </div>
  )
}
```

## API Reference

### Hook Return Value

All upload hooks return the same interface:

```typescript
{
  // Upload functions
  mutate: (file: File, onProgress?: (event: { progress: number }) => void) => void
  mutateAsync: (file: File, onProgress?: (event: { progress: number }) => void) => Promise<FileUploadResult>
  
  // Control functions
  cancel: () => void  // Only in Worker-based hooks
  reset: () => void
  
  // State
  isPending: boolean
  uploadProgress: number  // 0-100
  error: Error | null
  data: FileUploadResult | null
}
```

### FileUploadResult Type

```typescript
type FileUploadResult = {
  filename: string      // Generated filename on server
  path: string         // Relative path to file
  size: number         // File size in bytes
  mimeType: string     // MIME type
  url?: string         // Full URL to access file
  fileId?: string      // Database ID if applicable
  videoId?: string     // Video ID for video files
  isProcessed?: boolean // Processing status for videos
  message?: string     // Optional message from server
}
```

## When to Use Which Hook?

### Use Worker-based hooks (`useWorkerFileUpload.ts`) when:
- ✅ Uploading large files (>10MB)
- ✅ Multiple concurrent uploads
- ✅ Need cancellation support
- ✅ Want best UI responsiveness
- ✅ Building production features

### Use standard hooks (`useStorage.ts`) when:
- ✅ Small files only (<5MB)
- ✅ Single upload at a time
- ✅ Need exact compatibility with legacy code
- ✅ Browser doesn't support Web Workers (rare)

## Browser Compatibility

Web Worker-based uploads are supported in all modern browsers:
- Chrome 4+
- Firefox 3.5+
- Safari 4+
- Edge (all versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Migration Guide

To migrate from standard to Worker-based uploads:

```tsx
// Before
import { useUploadImage } from '@/hooks/useStorage'

// After  
import { useWorkerUploadImage } from '@/hooks/useWorkerFileUpload'

// The API is identical, so no other changes needed!
const upload = useWorkerUploadImage()
```

For the composite hook:

```tsx
// Before
import { useStorage } from '@/hooks/useStorage'

// After
import { useWorkerStorage } from '@/hooks/useWorkerFileUpload'

// API is identical with added cancel methods
const storage = useWorkerStorage()
```
