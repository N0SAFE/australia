import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@/core/modules/database/services/database.service';
import { file, imageFile, videoFile, audioFile, textFile } from '@/config/drizzle/schema';
import { eq } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import type { IVideoProcessingRepository } from '@/core/modules/video-processing';

/**
 * Repository for file metadata database operations
 * Handles all database interactions for file management
 * Implements IVideoProcessingRepository for video processing integration
 */
@Injectable()
export class FileMetadataRepository implements IVideoProcessingRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Create a video file entry in the database
   */
  async createVideoFile(data: {
    filePath: string;
    filename: string;
    storedFilename: string;
    mimeType: string;
    size: number;
    uploadedBy?: string;
    videoMetadata: {
      width?: number;
      height?: number;
      duration?: number;
      videoCodec?: string;
      videoBitrate?: number;
      hasAudio?: boolean;
      audioCodec?: string;
      frameRate?: number;
      aspectRatio?: string;
    };
  }) {
    const db = this.databaseService.db;

    // 1. Create video metadata entry
    const [videoMetadata] = await db
      .insert(videoFile)
      .values({
        width: data.videoMetadata.width ?? 0,
        height: data.videoMetadata.height ?? 0,
        duration: data.videoMetadata.duration ?? 0,
        videoCodec: data.videoMetadata.videoCodec,
        videoBitrate: data.videoMetadata.videoBitrate,
        hasAudio: data.videoMetadata.hasAudio ?? true,
        audioCodec: data.videoMetadata.audioCodec,
        frameRate: data.videoMetadata.frameRate,
        aspectRatio: data.videoMetadata.aspectRatio,
        isProcessed: false,
      })
      .returning();

    // 2. Create file entry
    const [fileEntry] = await db
      .insert(file)
      .values({
        type: 'video',
        contentId: videoMetadata.id,
        filePath: data.filePath,
        filename: data.filename,
        storedFilename: data.storedFilename,
        mimeType: data.mimeType,
        size: data.size,
        extension: data.filename.split('.').pop() ?? '',
        uploadedBy: data.uploadedBy,
        isPublic: false,
      })
      .returning();

    return { file: fileEntry, videoMetadata };
  }

  /**
   * Create an image file entry in the database
   */
  async createImageFile(data: {
    filePath: string;
    filename: string;
    storedFilename: string;
    mimeType: string;
    size: number;
    uploadedBy?: string;
    imageMetadata?: {
      width?: number;
      height?: number;
      aspectRatio?: number;
      format?: string;
      hasAlpha?: boolean;
    };
  }) {
    const db = this.databaseService.db;

    // 1. Create image metadata entry
    const [imageMetadata] = await db
      .insert(imageFile)
      .values({
        width: data.imageMetadata?.width ?? 0,
        height: data.imageMetadata?.height ?? 0,
        aspectRatio: data.imageMetadata?.aspectRatio,
        format: data.imageMetadata?.format,
        hasAlpha: data.imageMetadata?.hasAlpha,
        isProcessed: false,
      })
      .returning();

    // 2. Create file entry
    const [fileEntry] = await db
      .insert(file)
      .values({
        type: 'image',
        contentId: imageMetadata.id,
        filePath: data.filePath,
        filename: data.filename,
        storedFilename: data.storedFilename,
        mimeType: data.mimeType,
        size: data.size,
        extension: data.filename.split('.').pop() ?? '',
        uploadedBy: data.uploadedBy,
        isPublic: false,
      })
      .returning();

    return { file: fileEntry, imageMetadata };
  }

  /**
   * Create an audio file entry in the database
   */
  async createAudioFile(data: {
    filePath: string;
    filename: string;
    storedFilename: string;
    mimeType: string;
    size: number;
    uploadedBy?: string;
    audioMetadata?: {
      duration?: number;
      sampleRate?: number;
      channels?: number;
      bitrate?: number;
      audioCodec?: string;
    };
  }) {
    const db = this.databaseService.db;

    // 1. Create audio metadata entry
    const [audioMetadata] = await db
      .insert(audioFile)
      .values({
        duration: data.audioMetadata?.duration ?? 0,
        sampleRate: data.audioMetadata?.sampleRate ?? 44100,
        channels: data.audioMetadata?.channels ?? 2,
        bitrate: data.audioMetadata?.bitrate,
        audioCodec: data.audioMetadata?.audioCodec,
        isProcessed: false,
      })
      .returning();

    // 2. Create file entry
    const [fileEntry] = await db
      .insert(file)
      .values({
        type: 'audio',
        contentId: audioMetadata.id,
        filePath: data.filePath,
        filename: data.filename,
        storedFilename: data.storedFilename,
        mimeType: data.mimeType,
        size: data.size,
        extension: data.filename.split('.').pop() ?? '',
        uploadedBy: data.uploadedBy,
        isPublic: false,
      })
      .returning();

    return { file: fileEntry, audioMetadata };
  }

  /**
   * Create a text file entry in the database
   */
  async createTextFile(data: {
    filePath: string;
    filename: string;
    storedFilename: string;
    mimeType: string;
    size: number;
    uploadedBy?: string;
    textMetadata?: {
      encoding?: string;
      lineCount?: number;
      wordCount?: number;
      characterCount?: number;
    };
  }) {
    const db = this.databaseService.db;

    // 1. Create text metadata entry
    const [textMetadata] = await db
      .insert(textFile)
      .values({
        encoding: data.textMetadata?.encoding ?? 'utf-8',
        lineCount: data.textMetadata?.lineCount,
        wordCount: data.textMetadata?.wordCount,
        characterCount: data.textMetadata?.characterCount,
        isProcessed: false,
      })
      .returning();

    // 2. Create file entry
    const [fileEntry] = await db
      .insert(file)
      .values({
        type: 'text',
        contentId: textMetadata.id,
        filePath: data.filePath,
        filename: data.filename,
        storedFilename: data.storedFilename,
        mimeType: data.mimeType,
        size: data.size,
        extension: data.filename.split('.').pop() ?? '',
        uploadedBy: data.uploadedBy,
        isPublic: false,
      })
      .returning();

    return { file: fileEntry, textMetadata };
  }

  /**
   * Get file by ID
   */
  async getFileById(fileId: string) {
    const db = this.databaseService.db;
    const [fileRecord] = await db
      .select()
      .from(file)
      .where(eq(file.id, fileId));

    return fileRecord;
  }

  /**
   * Get file by path
   */
  async getFileByPath(filePath: string) {
    const db = this.databaseService.db;
    const [fileRecord] = await db
      .select()
      .from(file)
      .where(eq(file.filePath, filePath));

    return fileRecord;
  }

  /**
   * Update video processing status
   */
  async updateVideoProcessingStatus(
    videoId: string,
    status: {
      isProcessed: boolean;
      processingProgress?: number;
      processingError?: string;
    }
  ) {
    const db = this.databaseService.db;
    await db
      .update(videoFile)
      .set({
        isProcessed: status.isProcessed,
        processingProgress: status.processingProgress,
        processingError: status.processingError,
        processingCompletedAt: status.isProcessed ? new Date() : undefined,
      })
      .where(eq(videoFile.id, videoId));
  }

  /**
   * Find all videos that are not yet processed (for resume on app startup)
   * @returns Array of incomplete video records
   */
  async findIncompleteVideos(): Promise<InferSelectModel<typeof videoFile>[]> {
    const db = this.databaseService.db;
    const incompleteVideos = await db
      .select()
      .from(videoFile)
      .where(eq(videoFile.isProcessed, false));

    return incompleteVideos;
  }

  /**
   * Get the file path for a video by its ID
   * Used for resuming video processing on app startup
   * @param videoId - The video metadata ID
   * @returns The absolute file path
   * @throws Error if video or file not found
   */
  async getVideoFilePath(videoId: string): Promise<string> {
    const db = this.databaseService.db;
    
    // Find the file entry linked to this video
    const results = await db
      .select({ filePath: file.filePath })
      .from(file)
      .where(eq(file.contentId, videoId));

    if (results.length === 0) {
      throw new Error(`File path not found for video: ${videoId}`);
    }

    return results[0].filePath;
  }
}
