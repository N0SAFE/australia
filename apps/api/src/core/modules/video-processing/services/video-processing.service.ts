import { Injectable, Logger } from '@nestjs/common';
import { FfmpegService } from '@/core/modules/ffmpeg/services/ffmpeg.service';

/**
 * Core Video Processing Service
 * 
 * Provides reusable video processing logic for any module that handles videos.
 * This service is stateless and does not manage database state.
 * 
 * Features:
 * - Process videos with FFmpeg (H.264 conversion, metadata extraction)
 * - Progress tracking via callbacks
 * - Abort signal support for cancellable processing
 * 
 * Usage:
 * 1. Import VideoProcessingModule in your feature module
 * 2. Call processVideo() with file path and callbacks
 * 3. Handle database updates in your own service/repository
 */
@Injectable()
export class VideoProcessingService {
  private readonly logger = new Logger(VideoProcessingService.name);

  constructor(
    private readonly ffmpegService: FfmpegService,
  ) {}

  /**
   * Process video with FFmpeg
   * - Extract metadata
   * - Convert to H.264 if needed
   * - Generate thumbnail (TODO)
   * 
   * NOTE: This method does NOT update the database. The caller service
   * is responsible for updating their own repository after this Promise resolves.
   * 
   * @param filePath - Path to the video file
   * @param onProgress - Callback function for progress updates (0-100)
   * @param abortSignal - Optional signal to cancel processing
   * @returns Promise with video metadata and new file path (if converted)
   */
  async processVideo(
    filePath: string,
    onProgress?: (progress: number, message: string) => void,
    abortSignal?: AbortSignal
  ): Promise<{
    duration: number;
    width: number;
    height: number;
    codec: string;
    wasConverted: boolean;
    newFilePath?: string;
  }> {
    this.logger.log(`Starting video processing for: ${filePath}`);
    
    // Check if aborted before starting
    if (abortSignal?.aborted) {
      throw new Error('Processing aborted before start');
    }

    // Step 1 - Extract video metadata (ffprobe)
    onProgress?.(10, 'Analyzing video...');
    const metadata = await this.ffmpegService.getVideoMetadata(filePath);
    onProgress?.(20, `Analyzing video: ${String(metadata.width)}x${String(metadata.height)}, ${metadata.codec}`);

    if (abortSignal?.aborted) {
      throw new Error('Processing aborted after metadata extraction');
    }

    // Step 2 - Convert to H.264 if needed (converts in-place, overwrites original file)
    const needsConversion = metadata.codec !== 'h264';
    
    if (needsConversion) {
      onProgress?.(40, 'Converting to H.264...');
      
      // Convert video in-place (overwrites original file with converted version)
      // This will throw if aborted via abortSignal
      // Map conversion progress (0-100) to our range (40-80)
      await this.ffmpegService.convertVideoToH264AndReplace(
        filePath,
        abortSignal,
        (conversionProgress) => {
          // Map 0-100 conversion progress to 40-80 total progress
          const mappedProgress = 40 + (conversionProgress * 0.4);
          onProgress?.(Math.round(mappedProgress), 'Converting to H.264...');
        }
      );
      
      // CRITICAL: Check if aborted IMMEDIATELY after conversion completes
      // This prevents race conditions where an aborted process marks the video as processed
      if (abortSignal?.aborted) {
        throw new Error('Processing aborted after conversion');
      }
      
      onProgress?.(80, 'Conversion complete');
    } else {
      this.logger.log(`Video is already H.264, skipping conversion`);
      onProgress?.(80, 'Video already in H.264 format');
    }

    // Step 3 - Generate thumbnail (TODO: implement)
    onProgress?.(90, 'Generating thumbnail...');
    await this.sleep(500);

    // CRITICAL: Final abort check before returning
    // Prevents concurrent requests from continuing after abort
    if (abortSignal?.aborted) {
      throw new Error('Processing aborted before completion');
    }

    onProgress?.(100, 'Processing complete');
    this.logger.log(`Video processing completed for: ${filePath}`);

    // File has been processed in-place, path remains the same
    return {
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
      codec: needsConversion ? 'h264' : metadata.codec,
      wasConverted: needsConversion,
      newFilePath: filePath, // Same path - file was replaced in-place
    };
  }

  /**
   * Utility: Sleep for testing/simulation
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
