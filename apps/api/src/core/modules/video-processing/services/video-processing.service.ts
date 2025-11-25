import { Injectable, Logger } from '@nestjs/common';
import { FfmpegService } from '@/core/modules/ffmpeg/services/ffmpeg.service';
import type { FfmpegInput, DanglingFile, ProcessingResult } from '@/core/modules/ffmpeg/interfaces';

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
 * - Namespace-based temp file isolation for multi-consumer support
 * - Crash recovery via OnModuleInit (delegates to consumers)
 *
 * NEW API (recommended):
 * - processVideoFromFile(): Process from FfmpegInput object (storage provider agnostic)
 * - Supports S3, GCS, local disk, etc.
 * - Consumer responsible for storing result and calling cleanup
 *
 * LEGACY API (deprecated, will be removed):
 * - processVideo(): Process from file path (assumes local disk)
 * - Still works but not recommended for new code
 *
 * Usage Flow:
 * 1. Consumer gets file content from FileService (could be from S3, etc.)
 * 2. Consumer calls processVideoFromFile() with FfmpegInput and namespace
 * 3. FFmpeg creates local copy, processes, returns result
 * 4. Consumer gets processed file via ffmpegService.getProcessedFile()
 * 5. Consumer stores in their storage provider
 * 6. Consumer calls ffmpegService.cleanup() to delete temp files
 */
@Injectable()
export class VideoProcessingService {
  private readonly logger = new Logger(VideoProcessingService.name);

  constructor(
    private readonly ffmpegService: FfmpegService,
  ) {}

  // ============================================================================
  // NEW API - Namespace-based processing with multi-provider support
  // ============================================================================

  /**
   * Process video from FfmpegInput object (storage provider agnostic).
   *
   * Creates a local copy of the file (supports any storage provider),
   * processes it, and keeps the result until consumer calls cleanup.
   *
   * @param input - FfmpegInput with id and Web File object
   * @param namespace - Consumer service namespace (e.g., ['capsules'])
   * @param onProgress - Callback for progress updates (0-100)
   * @param abortSignal - Optional signal to cancel processing
   * @returns Processing result with metadata
   *
   * @example
   * ```typescript
   * // In CapsuleService:
   * const fileBlob = await this.fileService.getFileBlob(fileId);
   * const result = await this.videoProcessingService.processVideoFromFile(
   *   { id: fileId, file: new File([fileBlob], 'video.mp4', { type: 'video/mp4' }) },
   *   ['capsules'],
   *   (progress, message) => emit({ progress, message })
   * );
   *
   * // Get processed file and store in storage provider
   * const processed = await this.ffmpegService.getProcessedFile(fileId, ['capsules']);
   * await this.fileService.replaceFileContent(fileId, processed);
   *
   * // Cleanup temp files
   * await this.ffmpegService.cleanup(fileId, ['capsules']);
   * ```
   */
  async processVideoFromFile(
    input: FfmpegInput,
    namespace: string[],
    onProgress?: (progress: number, message: string) => void,
    abortSignal?: AbortSignal
  ): Promise<ProcessingResult> {
    this.logger.log(`Starting video processing for file ${input.id} in namespace ${namespace.join('/')}`);

    // Check if aborted before starting
    if (abortSignal?.aborted) {
      throw new Error('Processing aborted before start');
    }

    onProgress?.(10, 'Starting video processing...');

    try {
      const result = await this.ffmpegService.processVideo(input, namespace, {
        onProgress: (progress) => {
          // Map FFmpeg progress (0-100) to our range (10-90)
          const mappedProgress = 10 + (progress * 0.8);
          onProgress?.(Math.round(mappedProgress), 'Processing video...');
        },
        abortSignal,
      });

      // Final abort check
      if (abortSignal?.aborted) {
        throw new Error('Processing aborted after conversion');
      }

      onProgress?.(100, 'Processing complete');
      this.logger.log(`Video processing completed for file ${input.id}`);

      return result;
    } catch (error) {
      this.logger.error(`Video processing failed for file ${input.id}:`, error);
      throw error;
    }
  }

  /**
   * Get all dangling files for a namespace.
   * Delegates to FfmpegService.
   *
   * @param namespace - Consumer service namespace
   * @returns Array of dangling files
   */
  async getDanglingFiles(namespace: string[]): Promise<DanglingFile[]> {
    return await this.ffmpegService.getFilesByNamespace(namespace);
  }

  /**
   * Cleanup temp files for a file.
   * Delegates to FfmpegService.
   *
   * @param fileId - Database file ID
   * @param namespace - Consumer service namespace
   */
  async cleanup(fileId: string, namespace: string[]): Promise<void> {
    await this.ffmpegService.cleanup(fileId, namespace);
  }

  // ============================================================================
  // LEGACY API - Deprecated, for backward compatibility only
  // ============================================================================

  /**
   * @deprecated Use processVideoFromFile() instead.
   * This method assumes the file is on local disk, which doesn't work with S3/cloud storage.
   *
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
