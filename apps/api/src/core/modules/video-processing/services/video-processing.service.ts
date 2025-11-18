import { Injectable, Logger, type OnModuleInit, Inject } from '@nestjs/common';
import type { IVideoProcessingRepository } from '../interfaces/video-processing-repository.interface';
import type { IVideoProcessingEvents } from '../interfaces/video-processing-events.interface';
import { FfmpegService } from '@/core/modules/ffmpeg/services/ffmpeg.service';

/**
 * Core Video Processing Service
 * 
 * Provides reusable video processing logic for any module that handles videos.
 * Uses dependency injection to remain independent of specific storage implementations.
 * 
 * Features:
 * - Resume incomplete videos on app startup
 * - Process videos with FFmpeg (H.264 conversion, metadata extraction)
 * - Progress tracking via event system
 * - Abort signal support for cancellable processing
 * 
 * Usage:
 * 1. Import VideoProcessingModule in your feature module
 * 2. Provide implementations for IVideoProcessingRepository and IVideoProcessingEvents
 * 3. Call startProcessing() to process a video
 */
@Injectable()
export class VideoProcessingService implements OnModuleInit {
  private readonly logger = new Logger(VideoProcessingService.name);

  constructor(
    @Inject('VIDEO_PROCESSING_REPOSITORY')
    private readonly repository: IVideoProcessingRepository,
    @Inject('VIDEO_PROCESSING_EVENTS')
    private readonly events: IVideoProcessingEvents,
    private readonly ffmpegService: FfmpegService,
  ) {}

  /**
   * Resume processing of incomplete videos on app startup
   */
  async onModuleInit(): Promise<void> {
    try {
      const incompleteVideos = await this.repository.findIncompleteVideos();

      if (incompleteVideos.length > 0) {
        this.logger.log(
          `Resuming ${incompleteVideos.length.toString()} incomplete video(s)...`
        );

        for (const video of incompleteVideos) {
          const filePath = await this.repository.getVideoFilePath(video.id);
          
          this.logger.log(`Resuming video processing: ${video.id}`);
          
          // Process in background (don't await)
          void this.startProcessing(video.id, filePath);
        }
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to resume incomplete videos: ${err.message}`);
    }
  }

  /**
   * Start processing a video file
   * Uses ABORT strategy - new processing for same videoId aborts previous one
   */
  async startProcessing(videoId: string, filePath: string): Promise<void> {
    this.logger.log(`Starting video processing for: ${videoId}`);
    
    // No direct abort controller here - events system handles ABORT strategy
    await this.processVideoAsync(videoId, filePath);
  }

  /**
   * Process video with FFmpeg
   * - Extract metadata
   * - Convert to H.264
   * - Generate thumbnail (TODO)
   * 
   * @param videoId - Unique video identifier
   * @param filePath - Path to video file on disk
   * @param abortSignal - Optional signal to cancel processing
   */
  async processVideoAsync(
    videoId: string,
    filePath: string,
    abortSignal?: AbortSignal
  ): Promise<void> {
    try {
      // Update database: mark as processing
      await this.repository.updateVideoProcessingStatus(videoId, {
        isProcessed: false,
        processingProgress: 0,
      });

      // Emit initial progress
      this.events.emit('videoProcessing', { videoId }, {
        progress: 0,
        status: 'processing',
        message: 'Starting video analysis...',
        timestamp: new Date().toISOString(),
      });

      // Check if aborted before starting
      if (abortSignal?.aborted) {
        throw new Error('Processing aborted before start');
      }

      // Step 1 - Extract video metadata (ffprobe)
      const metadata = await this.ffmpegService.getVideoMetadata(filePath);
      this.emitProgress(videoId, 20, `Analyzing video: ${String(metadata.width)}x${String(metadata.height)}, ${metadata.codec}`);

      if (abortSignal?.aborted) throw new Error('Processing aborted after metadata extraction');

      // Step 2 - Convert to H.264 if needed
      this.emitProgress(videoId, 40, 'Converting to H.264...');
      
      const outputPath = filePath.replace(/\.[^.]+$/, '.mp4');
      const ffmpegCommand = this.ffmpegService.convertToH264(filePath, outputPath, abortSignal);
      
      // Convert FFmpeg command to promise with progress tracking
      await this.ffmpegService.ffmpegCommandToPromise(ffmpegCommand, (progress) => {
        if (progress.percent) {
          // Map FFmpeg progress (0-100) to our range (40-80)
          const mappedProgress = 40 + (progress.percent * 0.4);
          this.emitProgress(videoId, Math.round(mappedProgress), 'Converting video...');
        }
      });

      if (abortSignal?.aborted) throw new Error('Processing aborted after conversion');

      // Step 3 - Generate thumbnail (TODO: implement)
      this.emitProgress(videoId, 90, 'Generating thumbnail...');
      await this.sleep(500);

      if (abortSignal?.aborted) throw new Error('Processing aborted after thumbnail generation');

      // Update database: mark as complete
      await this.repository.updateVideoProcessingStatus(videoId, {
        isProcessed: true,
        processingProgress: 100,
      });

      // Emit completion
      this.events.emit('videoProcessing', { videoId }, {
        progress: 100,
        status: 'completed',
        message: 'Processing complete',
        metadata: {
          duration: metadata.duration,
          width: metadata.width,
          height: metadata.height,
          codec: metadata.codec,
        },
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Video processing completed for: ${videoId}`);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      // Check if this was an abort
      if (abortSignal?.aborted || err.message.includes('aborted')) {
        this.logger.warn(`Video processing aborted for ${videoId}: ${err.message}`);
        
        // Emit abort status
        this.events.emit('videoProcessing', { videoId }, {
          progress: 0,
          status: 'failed',
          message: 'Processing aborted',
          timestamp: new Date().toISOString(),
        });
      } else {
        this.logger.error(`Video processing failed for ${videoId}: ${err.message}`);
        
        // Update database with error
        await this.repository.updateVideoProcessingStatus(videoId, {
          isProcessed: false,
          processingError: err.message,
        });

        // Emit failure event
        this.events.emit('videoProcessing', { videoId }, {
          progress: 0,
          status: 'failed',
          message: err.message,
          timestamp: new Date().toISOString(),
        });
      }

      throw error;
    }
  }

  /**
   * Helper method to emit progress updates
   */
  private emitProgress(videoId: string, progress: number, message: string): void {
    this.events.emit('videoProcessing', { videoId }, {
      progress,
      status: 'processing',
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Utility: Sleep for testing/simulation
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
