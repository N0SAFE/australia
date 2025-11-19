import { Injectable, Logger } from '@nestjs/common';
import ffmpeg, { FfmpegCommand } from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import * as path from 'path';
import { HardwareAccelerationService } from './hardware-acceleration.service';

/**
 * FFmpeg Core Service
 * Provides video processing capabilities including format conversion
 * This is a core infrastructure service following the Core Module Architecture
 * 
 * Features:
 * - Hardware acceleration (VAAPI/NVENC/QSV) with automatic fallback to software encoding
 * - Segment-based processing for memory efficiency
 * - Progress tracking per segment
 */
@Injectable()
export class FfmpegService {
  private readonly logger = new Logger(FfmpegService.name);
  private readonly SEGMENT_DURATION = 30; // seconds per segment

  constructor(
    private readonly hardwareAccelService: HardwareAccelerationService
  ) {}

  /**
   * Create FFmpeg command instance
   * @param inputPath - Path to the input file
   * @returns FfmpegCommand instance
   */
  ffmpeg(inputPath: string): FfmpegCommand {
    return ffmpeg(inputPath);
  }



  /**
   * Convert a single segment to H.264
   * @param inputPath - Path to input video
   * @param outputPath - Path to output video
   * @param startTime - Start time in seconds
   * @param duration - Duration in seconds
   * @param useHardwareAccel - Whether to use hardware acceleration
   * @param abortSignal - Optional abort signal
   * @returns FfmpegCommand instance
   */
  private convertSegmentToH264(
    inputPath: string,
    outputPath: string,
    startTime: number,
    duration: number,
    useHardwareAccel: boolean,
    abortSignal?: AbortSignal
  ): FfmpegCommand {
    this.logger.log(
      `Converting segment: ${String(startTime)}s-${String(startTime + duration)}s (${useHardwareAccel ? 'hardware' : 'software'})`
    );

    let command = this.ffmpeg(inputPath);

    if (useHardwareAccel) {
      // Get hardware acceleration configuration from service
      const hwConfig = this.hardwareAccelService.getConfig();
      
      // Apply hardware acceleration settings
      if (hwConfig.inputOptions.length > 0) {
        command = command.inputOptions(hwConfig.inputOptions);
      }
      command = command.videoCodec(hwConfig.videoCodec);
      if (hwConfig.outputOptions.length > 0) {
        command = command.outputOptions(hwConfig.outputOptions);
      }
    } else {
      // Software encoding with optimized settings
      command = command
        .videoCodec('libx264')
        .outputOptions([
          '-preset ultrafast',
          '-crf 28',
          '-threads 2', // Reduced threads for lower memory
          '-bufsize 1M',
          '-maxrate 2M',
        ]);
    }

    // Common options for both hardware and software
    command = command
      .seekInput(startTime)
      .duration(duration)
      .audioCodec('aac')
      .format('mp4')
      .outputOptions([
        '-movflags', '+faststart',
        '-progress', 'pipe:1' // Enable progress reporting
      ])
      .save(outputPath);

    // Handle abort signal
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        this.logger.warn(`Aborting segment conversion: ${outputPath}`);
        command.kill('SIGKILL');
      });
    }

    return command;
  }

  /**
   * Convert timemark string to seconds
   * @param timemark - Time string in format "HH:MM:SS.ms"
   * @returns Time in seconds
   */
  private parseTimemark(timemark: string): number {
    const parts = timemark.split(':');
    if (parts.length !== 3) return 0;
    
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseFloat(parts[2]);
    
    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Convert FfmpegCommand to Promise with progress tracking
   * @param command - FfmpegCommand instance
   * @param duration - Total duration in seconds (for calculating percentage)
   * @param onProgress - Optional progress callback
   * @returns Promise that resolves when command completes
   */
  ffmpegCommandToPromise(
    command: FfmpegCommand,
    duration: number,
    onProgress?: (progress: { percent?: number; currentFps?: number; currentKbps?: number }) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      command
        .on('start', (commandLine) => {
          this.logger.debug(`FFmpeg command: ${commandLine}`);
        })
        .on('progress', (progress) => {
          // Calculate percentage from timemark and duration
          let percent: number | undefined;
          if (progress.timemark && duration > 0) {
            const currentTime = this.parseTimemark(progress.timemark);
            percent = Math.min(100, (currentTime / duration) * 100);
            this.logger.debug(`Processing: ${String(Math.round(percent))}% done (${progress.timemark}/${String(duration)}s)`);
          }
          
          onProgress?.({
            percent,
            currentFps: progress.currentFps,
            currentKbps: progress.currentKbps
          });
        })
        .on('end', () => {
          this.logger.log('Video conversion completed');
          onProgress?.({ percent: 100 });
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
   * Uses segment-based processing with hardware acceleration and automatic fallback
   * @param originalPath - Path to the original video file
   * @param abortSignal - Optional abort signal to cancel the operation
   * @param onProgress - Optional progress callback (0-100)
   * @returns Promise<string> - New file path with .mp4 extension
   */
  async convertVideoToH264AndReplace(
    originalPath: string,
    abortSignal?: AbortSignal,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const tempDir = `${originalPath}.segments`;
    const segmentFiles: string[] = [];
    
    try {
      // Get video metadata to calculate segments
      const metadata = await this.getVideoMetadata(originalPath);
      const totalDuration = metadata.duration;
      const segmentCount = Math.ceil(totalDuration / this.SEGMENT_DURATION);
      
      this.logger.log(
        `Processing video in ${String(segmentCount)} segments (${String(this.SEGMENT_DURATION)}s each, total: ${String(totalDuration)}s)`
      );

      // Create temp directory for segments
      await fs.mkdir(tempDir, { recursive: true });

      // Check hardware acceleration availability
      const hardwareAccelAvailable = this.hardwareAccelService.isAvailable();

      // Process each segment
      for (let i = 0; i < segmentCount; i++) {
        if (abortSignal?.aborted) {
          throw new Error('Conversion aborted');
        }

        const startTime = i * this.SEGMENT_DURATION;
        const duration = Math.min(this.SEGMENT_DURATION, totalDuration - startTime);
        const segmentPath = path.join(tempDir, `segment_${String(i).padStart(3, '0')}.mp4`);
        segmentFiles.push(segmentPath);

        let segmentSuccess = false;
        let useHardware = hardwareAccelAvailable;

        // Try hardware acceleration first, fallback to software if it fails
        while (!segmentSuccess) {
          try {
            const command = this.convertSegmentToH264(
              originalPath,
              segmentPath,
              startTime,
              duration,
              useHardware,
              abortSignal
            );

            await this.ffmpegCommandToPromise(command, duration, (segmentProgress) => {
              // Calculate overall progress
              const segmentWeight = 1 / segmentCount;
              const completedSegments = i;
              const currentSegmentProgress = (segmentProgress.percent ?? 0) / 100;
              const totalProgress = (completedSegments + currentSegmentProgress) * segmentWeight * 100;
              onProgress?.(Math.round(totalProgress));
            });

            segmentSuccess = true;
            this.logger.log(`Segment ${String(i + 1)}/${String(segmentCount)} completed`);
          } catch (error) {
            if (useHardware) {
              // Hardware acceleration failed, retry with software
              this.logger.warn(
                `Hardware acceleration failed for segment ${String(i + 1)}, retrying with software encoding`
              );
              useHardware = false;
            } else {
              // Software encoding also failed, propagate error
              throw error;
            }
          }
        }
      }

      // Concatenate segments
      this.logger.log('Concatenating segments...');
      const concatListPath = path.join(tempDir, 'concat_list.txt');
      const concatList = segmentFiles
        .map((file) => `file '${path.basename(file)}'`)
        .join('\n');
      await fs.writeFile(concatListPath, concatList);

      const finalOutputPath = `${originalPath}.final.mp4`;
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(concatListPath)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .outputOptions(['-c', 'copy']) // Just copy, no re-encoding
          .save(finalOutputPath)
          .on('end', () => {
            this.logger.log('Concatenation completed');
            onProgress?.(100); // Report 100% progress
            resolve();
          })
          .on('error', (err) => {
            reject(err);
          });
      });

      // Delete original file
      await fs.unlink(originalPath);

      // Rename final file to target path
      const outputPath = originalPath.replace(/\.[^.]+$/, '.mp4');
      await fs.rename(finalOutputPath, outputPath);

      this.logger.log(`Video converted and replaced: ${outputPath}`);
      return outputPath; // Return new path with .mp4 extension
    } catch (error) {
      this.logger.error('Video conversion failed', error);
      throw error;
    } finally {
      // Clean up temp directory and all segments
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        this.logger.warn('Failed to clean up temp directory', cleanupError);
      }
    }
  }
}
