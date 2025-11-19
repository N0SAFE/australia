import { Module, Global } from '@nestjs/common';
import { FfmpegService } from './services/ffmpeg.service';
import { HardwareAccelerationService } from './services/hardware-acceleration.service';

/**
 * FFmpeg Core Module
 * Provides video processing capabilities across the application
 * Marked as Global so it's available to all modules without explicit import
 */
@Global()
@Module({
  providers: [HardwareAccelerationService, FfmpegService],
  exports: [FfmpegService],
})
export class FfmpegModule {}
