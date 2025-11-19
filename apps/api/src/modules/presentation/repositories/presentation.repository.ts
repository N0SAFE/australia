import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@/core/modules/database/services/database.service';
import { FileStorageService } from '@/core/modules/file-storage/file-storage.service';
import { presentationVideo } from '@/config/drizzle/schema/presentation';
import { eq } from 'drizzle-orm';

export interface PresentationVideoData {
  filePath: string;
  filename: string;
  mimeType: string;
  size: number;
  duration?: number;
  width?: number;
  height?: number;
  thumbnailPath?: string;
  isProcessed?: boolean;
  processingProgress?: number;
  processingError?: string | null;
}

export type PresentationVideoRecord = typeof presentationVideo.$inferSelect;

@Injectable()
export class PresentationRepository {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly fileStorageService: FileStorageService,
  ) {}

  /**
   * Upsert presentation video (insert or replace)
   * Enforces single-row constraint
   */
  async upsert(data: PresentationVideoData): Promise<PresentationVideoRecord> {
    const db = this.databaseService.db;

    // Delete existing video if any
    await db.delete(presentationVideo).where(eq(presentationVideo.id, 'singleton'));

    // Insert new video
    const [video] = await db
      .insert(presentationVideo)
      .values({
        id: 'singleton',
        ...data,
      })
      .returning();

    return video;
  }

  /**
   * Get current presentation video
   */
  async findCurrent(): Promise<PresentationVideoRecord | null> {
    const db = this.databaseService.db;

    const result = await db
      .select()
      .from(presentationVideo)
      .where(eq(presentationVideo.id, 'singleton'))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Delete presentation video
   */
  async delete() {
    const db = this.databaseService.db;
    await db.delete(presentationVideo).where(eq(presentationVideo.id, 'singleton'));
  }

  // IVideoProcessingRepository implementation

  /**
   * Find incomplete videos for video processing
   * Since there's only one presentation video (singleton pattern),
   * returns it only if it exists and is not fully processed
   */
  async findIncompleteVideos(): Promise<{
    id: string;
    isProcessed: boolean;
    [key: string]: unknown;
  }[]> {
    const db = this.databaseService.db;

    const result = await db
      .select()
      .from(presentationVideo)
      .where(eq(presentationVideo.isProcessed, false))
      .limit(1);

    return result.map(video => ({
      id: video.id,
      isProcessed: video.isProcessed,
      filePath: video.filePath,
      filename: video.filename,
    }));
  }

  /**
   * Get video file path for processing
   * Since presentation uses singleton pattern, videoId should be 'singleton'
   * Returns absolute path for FFmpeg processing
   */
  async getVideoFilePath(videoId: string): Promise<string> {
    const db = this.databaseService.db;

    const result = await db
      .select({ filePath: presentationVideo.filePath })
      .from(presentationVideo)
      .where(eq(presentationVideo.id, videoId))
      .limit(1);

    if (!result[0]) {
      throw new Error(`Video not found: ${videoId}`);
    }

    // Convert relative path to absolute path for FFmpeg
    return this.fileStorageService.getAbsolutePath(result[0].filePath);
  }

  /**
   * Update video processing status
   * Updates the singleton presentation video record
   */
  async updateVideoProcessingStatus(
    videoId: string,
    status: {
      isProcessed?: boolean;
      processingProgress?: number;
      processingError?: string | null;
    }
  ): Promise<void> {
    const db = this.databaseService.db;

    await db
      .update(presentationVideo)
      .set({
        ...(status.isProcessed !== undefined && { isProcessed: status.isProcessed }),
        ...(status.processingProgress !== undefined && { processingProgress: status.processingProgress }),
        ...(status.processingError !== undefined && { processingError: status.processingError }),
        updatedAt: new Date(),
      })
      .where(eq(presentationVideo.id, videoId));
  }
}
