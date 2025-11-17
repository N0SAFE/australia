# FFmpeg Core Module

## Overview

The FFmpeg Core Module provides video processing capabilities for the application, primarily focused on converting uploaded videos to H.264 format for optimal web streaming and compatibility.

## Architecture

This is a **Core Module** (infrastructure service), following the Core vs Feature Architecture pattern:
- Located in `src/core/modules/ffmpeg/`
- Marked as `@Global()` for application-wide availability
- Provides reusable video processing functionality
- Can be used by any feature module without explicit import

## Service Methods

### `FfmpegService`

#### `convertToH264(inputPath: string, outputPath: string): Promise<void>`
Converts a video file to H.264 MP4 format with optimizations for web streaming.

**Features:**
- Video codec: libx264
- Audio codec: AAC
- Format: MP4
- Optimizations: fast preset, CRF 23, faststart flag for streaming
- Progress logging during conversion

**Example:**
```typescript
await this.ffmpegService.convertToH264(
  '/path/to/input.mov',
  '/path/to/output.mp4'
);
```

#### `getVideoMetadata(filePath: string): Promise<VideoMetadata>`
Retrieves video file metadata including duration, dimensions, codec, and format.

**Returns:**
```typescript
{
  duration: number;    // Duration in seconds
  width: number;       // Video width in pixels
  height: number;      // Video height in pixels
  codec: string;       // Video codec name
  format: string;      // Container format
}
```

**Example:**
```typescript
const metadata = await this.ffmpegService.getVideoMetadata('/path/to/video.mp4');
console.log(`Video duration: ${metadata.duration}s`);
```

#### `checkFfmpegAvailability(): Promise<boolean>`
Checks if FFmpeg is available in the system.

**Example:**
```typescript
const isAvailable = await this.ffmpegService.checkFfmpegAvailability();
if (!isAvailable) {
  throw new Error('FFmpeg is not installed');
}
```

#### `convertVideoToH264AndReplace(originalPath: string): Promise<void>`
Converts a video file to H.264 and replaces the original file. This is the primary method used by the file upload middleware.

**Process:**
1. Converts video to H.264 (temp file)
2. Deletes original file
3. Renames temp file to original path with `.mp4` extension
4. Cleans up on error

**Example:**
```typescript
await this.ffmpegService.convertVideoToH264AndReplace('/path/to/video.mov');
// Result: /path/to/video.mp4
```

## Integration

### File Upload Middleware

The FFmpeg service is automatically integrated into the `FileUploadMiddleware`. When a video file is uploaded:

1. File is saved to disk by Multer
2. FFmpeg converts it to H.264 MP4 format
3. Original file is replaced with converted version
4. File metadata is updated with new path and mimetype

**Supported Input Formats:**
- MOV (video/quicktime)
- AVI (video/x-msvideo)
- MKV (video/x-matroska)
- MPEG (video/mpeg)
- FLV (video/x-flv)
- WebM (video/webm)
- OGG (video/ogg)

**Output Format:**
- Always MP4 with H.264 video codec and AAC audio codec

### Error Handling

If video conversion fails:
- Error is logged but doesn't fail the upload
- Video is stored in its original format
- Client can still access the uploaded file

## Docker Configuration

FFmpeg is installed in both development and production Docker images:

```dockerfile
# In Dockerfile.api.dev and Dockerfile.api.prod
RUN apk add --no-cache ffmpeg
```

## Dependencies

- `fluent-ffmpeg`: Node.js wrapper for FFmpeg
- `@types/fluent-ffmpeg`: TypeScript type definitions
- FFmpeg binary (installed in Docker)

## Testing

Basic unit tests are provided in `ffmpeg.service.spec.ts`:
- Service instantiation
- Method availability checks

For integration testing with actual video conversion, ensure FFmpeg is installed in the test environment.

## Usage in Feature Modules

Since this is a Global module, you can inject it anywhere:

```typescript
@Injectable()
export class VideoProcessingService {
  constructor(private readonly ffmpegService: FfmpegService) {}

  async processVideo(filePath: string) {
    // Check FFmpeg availability
    const available = await this.ffmpegService.checkFfmpegAvailability();
    if (!available) {
      throw new Error('FFmpeg not available');
    }

    // Get metadata
    const metadata = await this.ffmpegService.getVideoMetadata(filePath);
    
    // Convert if needed
    if (metadata.codec !== 'h264') {
      await this.ffmpegService.convertToH264AndReplace(filePath);
    }
  }
}
```

## Performance Considerations

- Video conversion is CPU-intensive and can take time
- For large files, conversion happens synchronously during upload
- Consider implementing queue-based processing for production use
- Current implementation blocks upload response until conversion completes

## Future Enhancements

Potential improvements:
- Thumbnail generation
- Video quality presets (low, medium, high)
- Progress tracking for long conversions
- Queue-based async processing
- Multiple output formats
- Video compression optimization
- Subtitle extraction/embedding
