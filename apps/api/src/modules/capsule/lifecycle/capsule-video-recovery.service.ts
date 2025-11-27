import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { FfmpegService } from '@/core/modules/ffmpeg/services/ffmpeg.service';
import { FileService } from '@/core/modules/file/services/file.service';
import { CAPSULE_VIDEO_NAMESPACE } from '../constants';

/**
 * Capsule Video Recovery Service
 *
 * Handles crash recovery for video processing in the Capsule module.
 * Runs on module initialization to detect and recover dangling video files.
 *
 * Recovery logic:
 * - If file exists in DB → attempt to recover (complete storage or cleanup)
 * - If file not in DB → cleanup immediately (orphaned file)
 */
@Injectable()
export class CapsuleVideoRecoveryService implements OnModuleInit {
  private readonly logger = new Logger(CapsuleVideoRecoveryService.name);

  constructor(
    private readonly ffmpegService: FfmpegService,
    private readonly fileService: FileService,
  ) {}

  onModuleInit(): void {
    // Fire and forget - recovery runs in background
    void this.recoverDanglingFiles();
  }

  /**
   * Check for and recover any dangling files from crashed processing jobs.
   */
  private async recoverDanglingFiles(): Promise<void> {
    try {
      const danglingFiles = await this.ffmpegService.getFilesByNamespace(
        [...CAPSULE_VIDEO_NAMESPACE],
      );

      if (danglingFiles.length === 0) {
        return;
      }

      this.logger.log(
        `Found ${String(danglingFiles.length)} dangling file(s) in capsules namespace`,
      );

      for (const file of danglingFiles) {
        await this.processDanglingFile(file);
      }
    } catch (error) {
      this.logger.error('Failed to recover dangling files', error);
    }
  }

  /**
   * Process a single dangling file.
   */
  private async processDanglingFile(file: {
    fileId: string;
    isComplete: boolean;
    lockMetadata: {
      originalName: string;
    };
  }): Promise<void> {
    const { fileId, isComplete } = file;

    try {
      // Check if the file exists in the database
      const dbFile = await this.fileService.getFileById(fileId);

      if (!dbFile) {
        // File doesn't exist in DB - orphaned, cleanup immediately
        this.logger.warn(
          `File ${fileId} not found in database, cleaning up orphaned temp files`,
        );
        await this.ffmpegService.cleanup(fileId, [...CAPSULE_VIDEO_NAMESPACE]);
        return;
      }

      if (isComplete) {
        // Processing was complete but storage failed
        this.logger.log(`Recovering completed file ${fileId}`);
        await this.recoverCompletedFile(file, dbFile.id);
      } else {
        // Processing was interrupted - cleanup
        this.logger.log(`Cleaning up interrupted file ${fileId}`);
        await this.ffmpegService.cleanup(fileId, [...CAPSULE_VIDEO_NAMESPACE]);
      }
    } catch (error) {
      this.logger.error(`Failed to process dangling file ${fileId}`, error);
      // Cleanup on error
      await this.ffmpegService.cleanup(fileId, [...CAPSULE_VIDEO_NAMESPACE]).catch(() => {
        // Ignore cleanup errors
      });
    }
  }

  /**
   * Recover a file that was fully processed but storage failed.
   */
  private async recoverCompletedFile(
    danglingFile: {
      fileId: string;
      lockMetadata: {
        originalName: string;
      };
    },
    dbFileId: string,
  ): Promise<void> {
    try {
      // Get processed file from FFmpeg temp directory
      const processedFile = await this.ffmpegService.getProcessedFile(
        danglingFile.fileId,
        [...CAPSULE_VIDEO_NAMESPACE],
      );

      // Read the processed file into a Web File object
      const chunks: Uint8Array[] = [];
      for await (const chunk of processedFile.stream) {
        chunks.push(chunk as Uint8Array);
      }
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const buffer = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
      }

      const webFile = new File([buffer], danglingFile.lockMetadata.originalName, {
        type: 'video/mp4',
      });

      // Replace file content in storage
      await this.fileService.replaceFileContent(dbFileId, webFile);

      // Update file metadata
      await this.fileService.updateFileMetadata(dbFileId, {
        size: webFile.size,
        mimeType: 'video/mp4',
      });

      // Cleanup temp files
      await this.ffmpegService.cleanup(danglingFile.fileId, [...CAPSULE_VIDEO_NAMESPACE]);

      this.logger.log(`Successfully recovered file ${danglingFile.fileId}`);
    } catch (error) {
      this.logger.error(
        `Failed to recover completed file ${danglingFile.fileId}`,
        error,
      );
      throw error;
    }
  }
}
