import { Injectable, Logger } from '@nestjs/common';
import { FileProcessingGateway } from '../gateways/file-processing.gateway';
import { FileMetadataRepository } from '../repositories/file-metadata.repository';
import { EventBridgeService } from '@/core/modules/events/event-bridge.service';
import { createVideoProcessingEvent } from '@/core/modules/events/event-factories';

/**
 * Service for async video processing
 * Handles video transcoding, thumbnail generation, and metadata extraction
 */
@Injectable()
export class VideoProcessingService {
  private readonly logger = new Logger(VideoProcessingService.name);
  private readonly videoProcessingEvent: ReturnType<typeof createVideoProcessingEvent>;

  constructor(
    private readonly fileProcessingGateway: FileProcessingGateway,
    private readonly fileMetadataRepository: FileMetadataRepository,
    private readonly eventBridgeService: EventBridgeService,
  ) {
    // Initialize event factory
    this.videoProcessingEvent = createVideoProcessingEvent(eventBridgeService);
  }

  /**
   * Start async video processing
   * This method initiates processing and returns immediately
   * Progress updates are sent via WebSocket
   */
  async startProcessing(videoId: string, filePath: string): Promise<void> {
    this.logger.log(\`Starting async processing for video: \${videoId}\`);
    
    // Start processing in background (non-blocking)
    this.processVideoAsync(videoId, filePath).catch((error) => {
      this.logger.error(\`Error in async video processing: \${error.message}\`, error.stack);
      this.fileProcessingGateway.emitProcessingFailed(videoId, error.message);
    });
  }

  /**
   * Process video asynchronously
   * Emits progress updates via WebSocket
   */
  private async processVideoAsync(videoId: string, filePath: string): Promise<void> {
    try {
      // Emit processing started event
      this.fileProcessingGateway.emitProcessingStarted(videoId);

      // Update database: mark as processing
      await this.fileMetadataRepository.updateVideoProcessingStatus(videoId, {
        isProcessed: false,
        processingProgress: 0,
      });

      // Emit initial progress via event bridge
      const event = this.videoProcessingEvent(videoId);
      this.eventBridgeService.emit(event, {
        progress: 0,
        status: 'processing',
        message: 'Starting video analysis...',
        timestamp: new Date().toISOString(),
      });

      // Also emit via WebSocket for backwards compatibility
      this.fileProcessingGateway.emitProcessingProgress(videoId, {
        progress: 0,
        status: 'processing',
        message: 'Starting video analysis...',
      });

      // TODO: Step 1 - Extract video metadata (ffprobe)
      await this.sleep(1000); // Simulated delay
      this.emitProgress(videoId, 20, 'Extracting video metadata...');

      // TODO: Step 2 - Generate thumbnail
      await this.sleep(1000); // Simulated delay
      this.emitProgress(videoId, 40, 'Generating thumbnail...');

      // TODO: Step 3 - Extract audio info
      await this.sleep(1000); // Simulated delay
      this.emitProgress(videoId, 60, 'Analyzing audio track...');

      // TODO: Step 4 - Check if transcoding needed
      await this.sleep(1000); // Simulated delay
      this.emitProgress(videoId, 80, 'Finalizing...');

      // Update database: mark as complete
      await this.fileMetadataRepository.updateVideoProcessingStatus(videoId, {
        isProcessed: true,
        processingProgress: 100,
      });

      // Emit completion
      this.fileProcessingGateway.emitProcessingProgress(videoId, {
        progress: 100,
        status: 'completed',
        message: 'Processing complete',
      });

      this.fileProcessingGateway.emitProcessingCompleted(videoId, {
        duration: 0,  // TODO: actual video duration
        width: 1920,  // TODO: actual width
        height: 1080, // TODO: actual height
      });

      this.logger.log(\`Video processing completed for: \${videoId}\`);
    } catch (error) {
      this.logger.error(\`Video processing failed for \${videoId}: \${error.message}\`);
      
      // Update database with error
      await this.fileMetadataRepository.updateVideoProcessingStatus(videoId, {
        isProcessed: false,
        processingError: error.message,
      });

      // Emit failure via event bridge
      const failureEvent = this.videoProcessingEvent(videoId);
      this.eventBridgeService.emit(failureEvent, {
        progress: 0,
        status: 'failed',
        message: error.message,
        timestamp: new Date().toISOString(),
      });

      // Also emit via WebSocket for backwards compatibility
      this.fileProcessingGateway.emitProcessingFailed(videoId, error.message);
      throw error;
    }
  }

  /**
   * Helper method to emit progress to both event bridge and WebSocket
   */
  private emitProgress(videoId: string, progress: number, message: string): void {
    const event = this.videoProcessingEvent(videoId);
    
    // Emit via event bridge
    this.eventBridgeService.emit(event, {
      progress,
      status: 'processing',
      message,
      timestamp: new Date().toISOString(),
    });

    // Also emit via WebSocket for backwards compatibility
    this.fileProcessingGateway.emitProcessingProgress(videoId, {
      progress,
      status: 'processing',
      message,
    });
  }

  /**
   * Utility: Sleep for testing/simulation
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
