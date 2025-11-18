import { Injectable, Logger } from '@nestjs/common';
import ffmpeg, { FfmpegCommand } from 'fluent-ffmpeg';
import { promises as fs } from 'fs';

/**
 * FFmpeg Core Service
 * Provides video processing capabilities including format conversion
 * This is a core infrastructure service following the Core Module Architecture
 */
@Injectable()
export class FfmpegService {
  private readonly logger = new Logger(FfmpegService.name);

  /**
   * Create FFmpeg command instance
   * @param inputPath - Path to the input file
   * @returns FfmpegCommand instance
   */
  ffmpeg(inputPath: string): FfmpegCommand {
    return ffmpeg(inputPath);
  }

  /**
   * Convert video to H.264 (MP4) format
   * Returns the FfmpegCommand before attaching event handlers
   * @param inputPath - Path to the input video file
   * @param outputPath - Path where the converted video will be saved
   * @param abortSignal - Optional abort signal to cancel the operation
   * @returns FfmpegCommand instance
   */
  convertToH264(
    inputPath: string,
    outputPath: string,
    abortSignal?: AbortSignal
  ): FfmpegCommand {
    this.logger.log(`Setting up H.264 conversion: ${inputPath} -> ${outputPath}`);

    const command = this.ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .format('mp4')
      // Optimize for web streaming
      .outputOptions([
        '-preset fast',
        '-crf 23',
        '-movflags +faststart',
      ])
      .save(outputPath);

    // Handle abort signal
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        this.logger.warn(`Aborting FFmpeg conversion: ${inputPath}`);
        command.kill('SIGKILL');
      });
    }

    return command;
  }

  /**
   * Convert FfmpegCommand to Promise with progress tracking
   * @param command - FfmpegCommand instance
   * @param onProgress - Optional progress callback
   * @returns Promise that resolves when command completes
   */
  ffmpegCommandToPromise(
    command: FfmpegCommand,
    onProgress?: (progress: { percent?: number; currentFps?: number; currentKbps?: number }) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      command
        .on('start', (commandLine) => {
          this.logger.debug(`FFmpeg command: ${commandLine}`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            this.logger.debug(`Processing: ${String(Math.round(progress.percent))}% done`);
          }
          onProgress?.(progress);
        })
        .on('end', () => {
          this.logger.log('Video conversion completed');
          resolve();
        })
        .on('error', (err, stdout, stderr) => {
          this.logger.error(`FFmpeg error: ${err.message}`);
          this.logger.debug(`FFmpeg stdout: ${String(stdout)}`);
          this.logger.debug(`FFmpeg stderr: ${String(stderr)}`);
          reject(new Error(`Video conversion failed: ${err.message}`));
        });
    });
  }

  /**
   * Get video metadata (duration, dimensions, codec, etc.)
   * @param filePath - Path to the video file
   * @returns Promise with video metadata
   */
  async getVideoMetadata(filePath: string): Promise<{
    duration: number;
    width: number;
    height: number;
    codec: string;
    format: string;
  }> {
    this.logger.log(`Getting video metadata: ${filePath}`);

    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err instanceof Error) {
          this.logger.error(`Failed to get video metadata: ${err.message}`);
          reject(new Error(`Failed to get video metadata: ${err.message}`));
          return;
        } else if (err) {
          this.logger.error(`Failed to get video metadata: ${String(err)}`);
          reject(new Error(`Failed to get video metadata: ${String(err)}`));
          return;
        }

        const videoStream = metadata.streams.find(
          (stream) => stream.codec_type === 'video'
        );

        if (!videoStream) {
          reject(new Error('No video stream found in file'));
          return;
        }

        resolve({
          duration: metadata.format.duration ?? 0,
          width: videoStream.width ?? 0,
          height: videoStream.height ?? 0,
          codec: videoStream.codec_name ?? 'unknown',
          format: metadata.format.format_name ?? 'unknown',
        });
      });
    });
  }

  /**
   * Check if FFmpeg is available
   * @returns Promise<boolean>
   */
  async checkFfmpegAvailability(): Promise<boolean> {
    try {
      return await new Promise((resolve) => {
        ffmpeg.getAvailableFormats((err: Error | undefined) => {
          if (err) {
            this.logger.error('FFmpeg is not available');
            resolve(false);
          } else {
            this.logger.log('FFmpeg is available');
            resolve(true);
          }
        });
      });
    } catch (error) {
      this.logger.error('Error checking FFmpeg availability', error);
      return false;
    }
  }

  /**
   * Convert video file and replace the original with H.264 version
   * This is the main method used by the upload middleware
   * @param originalPath - Path to the original video file
   * @param abortSignal - Optional abort signal to cancel the operation
   * @returns Promise<void>
   */
  async convertVideoToH264AndReplace(
    originalPath: string,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const tempOutputPath = `${originalPath}.temp.mp4`;

    try {
      // Convert to H.264
      const command = this.convertToH264(originalPath, tempOutputPath, abortSignal);
      await this.ffmpegCommandToPromise(command);

      // Delete original file
      await fs.unlink(originalPath);

      // Rename temp file to original path (but with .mp4 extension)
      const outputPath = originalPath.replace(/\.[^.]+$/, '.mp4');
      await fs.rename(tempOutputPath, outputPath);

      this.logger.log(`Video converted and replaced: ${outputPath}`);
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempOutputPath);
      } catch {
        // Ignore cleanup errors
      }

      throw error;
    }
  }
}
