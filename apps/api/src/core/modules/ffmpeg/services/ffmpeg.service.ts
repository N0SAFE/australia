import { Injectable, Logger } from '@nestjs/common';
import ffmpeg, { FfmpegCommand } from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import * as path from 'path';
import { HardwareAccelerationService } from './hardware-acceleration.service';
import { FfmpegTempService } from './ffmpeg-temp.service';
import type {
  FfmpegInput,
  ProcessingResult,
  ProcessVideoOptions,
  ProcessedFileContent,
  DanglingFile,
  ProcessingJob,
} from '../interfaces/ffmpeg.interfaces';

/**
 * FFmpeg Core Service
 * Provides video processing capabilities including format conversion
 * This is a core infrastructure service following the Core Module Architecture
 *
 * Features:
 * - Hardware acceleration (VAAPI/NVENC/QSV) with automatic fallback to software encoding
 * - Segment-based processing for memory efficiency
 * - Progress tracking per segment
 * - Namespace-based temp file management for multi-consumer isolation
 * - Crash recovery via lock files and dangling file detection
 * - Storage provider agnostic (works with S3, GCS, local disk, etc.)
 *
 * Usage Flow (for consumers):
 * 1. Get file from storage provider (could be S3, etc.)
 * 2. Call processVideo(file, namespace) - FFmpeg creates local copy
 * 3. Call getProcessedFile(fileId, namespace) - Get processed result
 * 4. Store in storage provider
 * 5. Call cleanup(fileId, namespace) - Delete temp files
 *
 * Crash Recovery (implement OnModuleInit in consumer):
 * 1. Call getFilesByNamespace(namespace) - Find dangling files
 * 2. For each: check DB, if exists → retry storage, else → cleanup
 */
@Injectable()
export class FfmpegService {
  private readonly logger = new Logger(FfmpegService.name);
  private readonly SEGMENT_DURATION = 30; // seconds per segment

  /** Track active processing jobs in memory */
  private readonly activeJobs = new Map<string, ProcessingJob>();

  constructor(
    private readonly hardwareAccelService: HardwareAccelerationService,
    private readonly tempService: FfmpegTempService
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
    
    const hoursPart = parts[0];
    const minutesPart = parts[1];
    const secondsPart = parts[2];
    
    if (!hoursPart || !minutesPart || !secondsPart) return 0;
    
    const hours = parseInt(hoursPart, 10);
    const minutes = parseInt(minutesPart, 10);
    const seconds = parseFloat(secondsPart);
    
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
        .on('progress', (progress) => {
          // Calculate percentage from timemark and duration
          let percent: number | undefined;
          if (progress.timemark && duration > 0) {
            const currentTime = this.parseTimemark(progress.timemark);
            percent = Math.min(100, (currentTime / duration) * 100);
          }
          
          onProgress?.({
            percent,
            currentFps: progress.currentFps,
            currentKbps: progress.currentKbps
          });
        })
        .on('end', () => {
          onProgress?.({ percent: 100 });
          resolve();
        })
        .on('error', (err, _stdout, _stderr) => {
          this.logger.error(`FFmpeg error: ${err.message}`);
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
      const concatListPath = path.join(tempDir, 'concat_list.txt');
      const concatList = segmentFiles
        .map((file) => `file '${path.basename(file)}'`)
        .join('\n');
      await fs.writeFile(concatListPath, concatList);

      // Create temp output in the temp directory (ffmpeg needs it accessible)
      const tempOutputPath = path.join(tempDir, 'output.mp4');
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(concatListPath)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .outputOptions(['-c', 'copy']) // Just copy, no re-encoding
          .save(tempOutputPath)
          .on('end', () => {
            onProgress?.(100); // Report 100% progress
            resolve();
          })
          .on('error', (err) => {
            reject(err);
          });
      });

      // Atomically replace original file with converted version
      // Move from temp directory to final location (overwrites original)
      await fs.rename(tempOutputPath, originalPath);
      return originalPath; // Return same path (file replaced in-place)
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

  // ============================================================================
  // NEW API - Namespace-based processing with multi-provider support
  // ============================================================================

  /**
   * Get unique job key from fileId and namespace.
   */
  private getJobKey(fileId: string, namespace: string[]): string {
    return `${namespace.join('/')}/${fileId}`;
  }

  /**
   * Process video with namespace-based temp file management.
   *
   * Creates a local copy of the file (supports any storage provider),
   * processes it, and keeps the result until consumer calls cleanup.
   *
   * @param file - File object with content (buffer, stream, or local path)
   * @param namespace - Consumer service namespace (e.g., ['capsules'] or ['presentation', 'video'])
   * @param options - Processing options (onProgress, abortSignal, etc.)
   * @returns Processing result with path to processed file
   *
   * @example
   * ```typescript
   * // In CapsuleService
   * const fileStream = await this.fileService.getFileStream(fileRecord.id);
   * const result = await this.ffmpegService.processVideo(
   *   { id: fileRecord.id, name: fileRecord.name, mimeType: fileRecord.mimeType, stream: fileStream },
   *   ['capsules'],
   *   { onProgress: (p) => this.emitProgress(p) }
   * );
   * ```
   */
  async processVideo(
    input: FfmpegInput,
    namespace: string[],
    options?: ProcessVideoOptions
  ): Promise<ProcessingResult> {
    const jobKey = this.getJobKey(input.id, namespace);

    // Check if already processing
    if (this.activeJobs.has(jobKey)) {
      throw new Error(`File ${input.id} is already being processed in namespace ${namespace.join('/')}`);
    }

    this.logger.log(`Starting video processing: ${input.id} in namespace ${namespace.join('/')}`);

    // Initialize temp directory and write input file
    const { tempDir, inputPath, outputPath, segmentsDir } = await this.tempService.initializeProcessing(
      input,
      namespace
    );

    // Create processing job
    const job: ProcessingJob = {
      fileId: input.id,
      namespace,
      tempDir,
      startedAt: new Date(),
      progress: 0,
    };
    this.activeJobs.set(jobKey, job);

    try {
      // Get video metadata
      const metadata = await this.getVideoMetadata(inputPath);

      // Check if conversion is needed
      const needsConversion = this.needsConversion(metadata.codec, options?.forceConvert);

      if (!needsConversion) {
        // No conversion needed - just copy input to output
        await fs.copyFile(inputPath, outputPath);
        options?.onProgress?.(100);

        const stats = await fs.stat(outputPath);
        return {
          fileId: input.id,
          outputPath,
          wasConverted: false,
          newSize: stats.size,
          metadata: {
            duration: metadata.duration,
            width: metadata.width,
            height: metadata.height,
            codec: metadata.codec,
          },
        };
      }

      // Process video with segment-based conversion
      await this.processVideoSegments(
        inputPath,
        outputPath,
        segmentsDir,
        metadata.duration,
        options?.onProgress,
        options?.abortSignal,
        job
      );

      // Get output file stats
      const stats = await fs.stat(outputPath);
      const outputMetadata = await this.getVideoMetadata(outputPath);

      this.logger.log(`Video processing complete: ${input.id}, size: ${String(stats.size)} bytes`);

      return {
        fileId: input.id,
        outputPath,
        wasConverted: true,
        newSize: stats.size,
        metadata: {
          duration: outputMetadata.duration,
          width: outputMetadata.width,
          height: outputMetadata.height,
          codec: outputMetadata.codec,
        },
      };
    } catch (error) {
      this.logger.error(`Video processing failed for ${input.id}:`, error);
      // Don't cleanup on error - preserve for potential recovery
      throw error;
    } finally {
      this.activeJobs.delete(jobKey);
    }
  }

  /**
   * Check if video needs conversion based on codec.
   */
  private needsConversion(codec: string, forceConvert?: boolean): boolean {
    if (forceConvert) return true;
    // H.264 videos don't need conversion
    const h264Codecs = ['h264', 'avc1', 'avc'];
    return !h264Codecs.includes(codec.toLowerCase());
  }

  /**
   * Process video in segments.
   */
  private async processVideoSegments(
    inputPath: string,
    outputPath: string,
    segmentsDir: string,
    totalDuration: number,
    onProgress?: (progress: number) => void,
    abortSignal?: AbortSignal,
    job?: ProcessingJob
  ): Promise<void> {
    const segmentCount = Math.ceil(totalDuration / this.SEGMENT_DURATION);
    const segmentFiles: string[] = [];
    const hardwareAccelAvailable = this.hardwareAccelService.isAvailable();

    // Process each segment
    for (let i = 0; i < segmentCount; i++) {
      if (abortSignal?.aborted) {
        throw new Error('Conversion aborted');
      }

      const startTime = i * this.SEGMENT_DURATION;
      const duration = Math.min(this.SEGMENT_DURATION, totalDuration - startTime);
      const segmentPath = path.join(segmentsDir, `segment_${String(i).padStart(3, '0')}.mp4`);
      segmentFiles.push(segmentPath);

      let segmentSuccess = false;
      let useHardware = hardwareAccelAvailable;

      // Try hardware acceleration first, fallback to software if it fails
      while (!segmentSuccess) {
        try {
          const command = this.convertSegmentToH264(
            inputPath,
            segmentPath,
            startTime,
            duration,
            useHardware,
            abortSignal
          );

          await this.ffmpegCommandToPromise(command, duration, (segmentProgress) => {
            const segmentWeight = 1 / segmentCount;
            const completedSegments = i;
            const currentSegmentProgress = (segmentProgress.percent ?? 0) / 100;
            const totalProgress = (completedSegments + currentSegmentProgress) * segmentWeight * 100;
            const progress = Math.round(totalProgress);

            if (job) job.progress = progress;
            onProgress?.(progress);
          });

          segmentSuccess = true;
        } catch (error) {
          if (useHardware) {
            this.logger.warn(
              `Hardware acceleration failed for segment ${String(i + 1)}, retrying with software encoding`
            );
            useHardware = false;
          } else {
            throw error;
          }
        }
      }
    }

    // Concatenate segments
    await this.concatenateSegments(segmentsDir, segmentFiles, outputPath);
    onProgress?.(100);
  }

  /**
   * Concatenate segment files into final output.
   */
  private async concatenateSegments(
    segmentsDir: string,
    segmentFiles: string[],
    outputPath: string
  ): Promise<void> {
    const concatListPath = path.join(segmentsDir, 'concat_list.txt');
    const concatList = segmentFiles
      .map((file) => `file '${path.basename(file)}'`)
      .join('\n');
    await fs.writeFile(concatListPath, concatList);

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(concatListPath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions(['-c', 'copy'])
        .save(outputPath)
        .on('end', () => {
          resolve();
        })
        .on('error', (err) => {
          reject(err);
        });
    });
  }

  /**
   * Get processed file content as a readable stream.
   * Call this after processVideo completes to retrieve the result.
   *
   * @param fileId - Database file ID
   * @param namespace - Consumer service namespace
   * @returns Stream and metadata for processed file
   */
  async getProcessedFile(fileId: string, namespace: string[]): Promise<ProcessedFileContent> {
    return this.tempService.getProcessedFile(fileId, namespace);
  }

  /**
   * Get all dangling files for a namespace.
   * Consumer calls this on startup to detect files that were
   * being processed when the server crashed.
   *
   * @param namespace - Consumer service namespace
   * @returns Array of dangling files with metadata
   *
   * @example
   * ```typescript
   * // In consumer's onModuleInit:
   * const danglingFiles = await this.ffmpegService.getFilesByNamespace(['capsules']);
   * for (const file of danglingFiles) {
   *   const dbFile = await this.fileService.getFileById(file.fileId);
   *   if (dbFile) {
   *     // Re-process or retry storage
   *   } else {
   *     // File deleted from DB, cleanup
   *     await this.ffmpegService.cleanup(file.fileId, ['capsules']);
   *   }
   * }
   * ```
   */
  async getFilesByNamespace(namespace: string[]): Promise<DanglingFile[]> {
    return this.tempService.getFilesByNamespace(namespace);
  }

  /**
   * Delete temp files for a processed file.
   * Consumer MUST call this after successfully storing the processed file.
   *
   * @param fileId - Database file ID
   * @param namespace - Consumer service namespace
   */
  async cleanup(fileId: string, namespace: string[]): Promise<void> {
    const jobKey = this.getJobKey(fileId, namespace);

    // Check if still processing
    if (this.activeJobs.has(jobKey)) {
      throw new Error(`Cannot cleanup ${fileId} - still processing`);
    }

    await this.tempService.cleanup(fileId, namespace);
  }

  /**
   * Check if a file is currently being processed.
   *
   * @param fileId - Database file ID
   * @param namespace - Consumer service namespace
   * @returns true if file is being processed
   */
  async isProcessing(fileId: string, namespace: string[]): Promise<boolean> {
    const jobKey = this.getJobKey(fileId, namespace);

    // Check in-memory active jobs first
    if (this.activeJobs.has(jobKey)) {
      return true;
    }

    // Check temp service (handles stale lock detection)
    return this.tempService.isActivelyProcessing(fileId, namespace);
  }

  /**
   * Get current progress for a file being processed.
   *
   * @param fileId - Database file ID
   * @param namespace - Consumer service namespace
   * @returns Progress (0-100) or null if not processing
   */
  getProgress(fileId: string, namespace: string[]): number | null {
    const jobKey = this.getJobKey(fileId, namespace);
    const job = this.activeJobs.get(jobKey);
    return job?.progress ?? null;
  }

  /**
   * Clean up old temp files across all namespaces.
   * Call this periodically (e.g., via cron) to prevent disk space issues.
   *
   * @param maxAgeMs - Maximum age in milliseconds (default: 24 hours)
   * @returns Number of directories cleaned up
   */
  async cleanupOldFiles(maxAgeMs?: number): Promise<number> {
    return this.tempService.cleanupOldFiles(maxAgeMs);
  }

  /**
   * Get temp storage statistics.
   */
  async getTempStats() {
    return this.tempService.getStats();
  }
}

