import { Module, Global } from '@nestjs/common';
import { FfmpegService } from './services/ffmpeg.service';
import { FfmpegTempService } from './services/ffmpeg-temp.service';
import { HardwareAccelerationService } from './services/hardware-acceleration.service';

/**
 * FFmpeg Core Module
 * Provides video processing capabilities across the application
 * Marked as Global so it's available to all modules without explicit import
 *
 * Services:
 * - FfmpegService: Main service for video processing with namespace isolation
 * - FfmpegTempService: Manages temp files, lock files, and crash recovery
 * - HardwareAccelerationService: Detects and configures hardware acceleration
 *
 * Key Features:
 * - Namespace-based temp file isolation for multi-consumer support
 * - Crash recovery via lock files and dangling file detection
 * - Storage provider agnostic (works with S3, GCS, local disk, etc.)
 * - Hardware acceleration with automatic fallback
 */
@Global()
@Module({
  providers: [HardwareAccelerationService, FfmpegTempService, FfmpegService],
  exports: [FfmpegService, FfmpegTempService],
})
export class FfmpegModule {}

