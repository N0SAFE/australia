import { Module } from '@nestjs/common';
import { VideoProcessingService } from './services/video-processing.service';
import { FfmpegModule } from '@/core/modules/ffmpeg/ffmpeg.module';

/**
 * VideoProcessingModule
 * 
 * Provides reusable video processing functionality.
 * This module is stateless and does not manage database state.
 * 
 * Usage in a feature module:
 * ```typescript
 * @Module({
 *   imports: [VideoProcessingModule],
 *   // Use VideoProcessingService directly in your services
 * })
 * export class StorageModule {}
 * ```
 */
@Module({
  imports: [FfmpegModule],
  providers: [VideoProcessingService],
  exports: [VideoProcessingService],
})
export class VideoProcessingModule {}
