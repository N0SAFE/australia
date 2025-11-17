import { Injectable, Logger } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * FFmpeg Core Service
 * Provides video processing capabilities including format conversion
 * This is a core infrastructure service following the Core Module Architecture
 */
@Injectable()
export class FfmpegService {
  private readonly logger = new Logger(FfmpegService.name);

  /**
   * Convert video to H.264 (MP4) format
   * @param inputPath - Path to the input video file
   * @param outputPath - Path where the converted video will be saved
   * @returns Promise<void>
   */
  async convertToH264(inputPath: string, outputPath: string): Promise<void> {
    this.logger.log(`Converting video to H.264: ${inputPath} -> ${outputPath}`);

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .format('mp4')
        // Optimize for web streaming
        .outputOptions([
          '-preset fast',
          '-crf 23',
          '-movflags +faststart',
        ])
        .on('start', (commandLine) => {
          this.logger.debug(`FFmpeg command: ${commandLine}`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            this.logger.debug(`Processing: ${Math.round(progress.percent)}% done`);
          }
        })
        .on('end', () => {
          this.logger.log(`Video conversion completed: ${outputPath}`);
          resolve();
        })
        .on('error', (err, stdout, stderr) => {
          this.logger.error(`FFmpeg error: ${err.message}`);
          this.logger.debug(`FFmpeg stdout: ${stdout}`);
          this.logger.debug(`FFmpeg stderr: ${stderr}`);
          reject(new Error(`Video conversion failed: ${err.message}`));
        })
        .save(outputPath);
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
        if (err) {
          this.logger.error(`Failed to get video metadata: ${err.message}`);
          reject(new Error(`Failed to get video metadata: ${err.message}`));
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
          duration: metadata.format.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          codec: videoStream.codec_name || 'unknown',
          format: metadata.format.format_name || 'unknown',
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
      return new Promise((resolve) => {
        ffmpeg.getAvailableFormats((err, formats) => {
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
   * @returns Promise<void>
   */
  async convertVideoToH264AndReplace(originalPath: string): Promise<void> {
    const tempOutputPath = `${originalPath}.temp.mp4`;

    try {
      // Convert to H.264
      await this.convertToH264(originalPath, tempOutputPath);

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
