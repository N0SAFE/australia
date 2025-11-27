import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@/core/modules/database/services/database.service';
import { presentationVideo } from '@/config/drizzle/schema/presentation';
import { file, videoFile } from '@/config/drizzle/schema/file';
import { eq } from 'drizzle-orm';

/**
 * Input data for creating/updating presentation video
 * Only requires the fileId - all other metadata is in the file/videoFile tables
 */
export interface PresentationVideoData {
  fileId: string;
}

/**
 * Full presentation video data including joined file and video metadata
 */
export interface PresentationVideoWithFile {
  presentation: typeof presentationVideo.$inferSelect;
  file: typeof file.$inferSelect;
  video: typeof videoFile.$inferSelect;
}

export type PresentationVideoRecord = typeof presentationVideo.$inferSelect;

@Injectable()
export class PresentationRepository {
  constructor(
    private readonly databaseService: DatabaseService,
  ) {}

  /**
   * Upsert presentation video (insert or replace)
   * Enforces single-row constraint
   * Only stores fileId - all other metadata is in the file/videoFile tables
   */
  async upsert(data: PresentationVideoData): Promise<PresentationVideoRecord> {
    const db = this.databaseService.db;

    // Delete existing video if any
    await db.delete(presentationVideo).where(eq(presentationVideo.id, 'singleton'));

    // Insert new video with fileId reference
    const result = await db
      .insert(presentationVideo)
      .values({
        id: 'singleton',
        fileId: data.fileId,
      })
      .returning();

    const video = result[0];
    if (!video) {
      throw new Error('Failed to create presentation video');
    }

    return video;
  }

  /**
   * Get current presentation video with full file metadata
   * Joins file and videoFile tables to get complete information
   */
  async findCurrent(): Promise<PresentationVideoWithFile | null> {
    const db = this.databaseService.db;

    const result = await db
      .select({
        presentation: presentationVideo,
        file: file,
        video: videoFile,
      })
      .from(presentationVideo)
      .innerJoin(file, eq(presentationVideo.fileId, file.id))
      .innerJoin(videoFile, eq(file.contentId, videoFile.id))
      .where(eq(presentationVideo.id, 'singleton'))
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Get current presentation video (basic info only)
   * Returns just the presentation record without joins
   */
  async findCurrentBasic(): Promise<PresentationVideoRecord | null> {
    const db = this.databaseService.db;

    const result = await db
      .select()
      .from(presentationVideo)
      .where(eq(presentationVideo.id, 'singleton'))
      .limit(1);

    return result[0] ?? null;
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
   * Now queries the videoFile table via the file relationship
   */
  async findIncompleteVideos(): Promise<{
    id: string;
    isProcessed: boolean;
    [key: string]: unknown;
  }[]> {
    const db = this.databaseService.db;

    const result = await db
      .select({
        presentation: presentationVideo,
        file: file,
        video: videoFile,
      })
      .from(presentationVideo)
      .innerJoin(file, eq(presentationVideo.fileId, file.id))
      .innerJoin(videoFile, eq(file.contentId, videoFile.id))
      .where(eq(videoFile.isProcessed, false))
      .limit(1);

    return result.map(row => ({
      id: row.presentation.id,
      fileId: row.file.id,
      isProcessed: row.video.isProcessed,
      namespace: row.file.namespace,
      storedFilename: row.file.storedFilename,
      filename: row.file.filename,
    }));
  }

  /**
   * Get video file ID for processing
   * Since presentation uses singleton pattern, videoId should be 'singleton'
   * Returns the fileId which can be used with FileService
   */
  async getVideoFileId(videoId: string): Promise<string> {
    const db = this.databaseService.db;

    const result = await db
      .select({ fileId: presentationVideo.fileId })
      .from(presentationVideo)
      .where(eq(presentationVideo.id, videoId))
      .limit(1);

    if (!result[0]) {
      throw new Error(`Video not found: ${videoId}`);
    }

    return result[0].fileId;
  }

  /**
   * Get video file path for processing (DEPRECATED)
   * This method should not be used - use FileService.getFileAbsolutePath(fileId) instead
   * Kept for backward compatibility during transition
   * @deprecated Use FileService.getFileAbsolutePath() instead
   */
  getVideoFilePath(_videoId: string): Promise<string> {
    throw new Error(
      'getVideoFilePath is deprecated. Use getVideoFileId() and FileService.getFileAbsolutePath() instead'
    );
  }

  /**
   * Update video processing status
   * Now updates the videoFile table via the file relationship
   * Note: This should ideally be done through FileService
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

    // First get the fileId for this presentation video
    const presentation = await db
      .select({ fileId: presentationVideo.fileId })
      .from(presentationVideo)
      .where(eq(presentationVideo.id, videoId))
      .limit(1);

    if (!presentation[0]) {
      throw new Error(`Video not found: ${videoId}`);
    }

    // Get the file to find the contentId (videoFile id)
    const fileRecord = await db
      .select({ contentId: file.contentId })
      .from(file)
      .where(eq(file.id, presentation[0].fileId))
      .limit(1);

    if (!fileRecord[0]) {
      throw new Error(`File not found for video: ${videoId}`);
    }

    // Update the videoFile table
    await db
      .update(videoFile)
      .set({
        ...(status.isProcessed !== undefined && { isProcessed: status.isProcessed }),
        ...(status.processingProgress !== undefined && { processingProgress: status.processingProgress }),
        ...(status.processingError !== undefined && { processingError: status.processingError }),
      })
      .where(eq(videoFile.id, fileRecord[0].contentId));
  }
}
