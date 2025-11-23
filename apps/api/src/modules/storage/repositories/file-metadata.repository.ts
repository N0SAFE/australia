import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@/core/modules/database/services/database.service';
import { file, imageFile, videoFile, audioFile, rawFile } from '@/config/drizzle/schema';
import { eq } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

/**
 * Repository for file metadata database operations
 * Handles all database interactions for file management
 */
@Injectable()
export class FileMetadataRepository {
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
  async createRawFile(data: {
    filePath: string;
    absoluteFilePath: string;
    filename: string;
    storedFilename: string;
    mimeType: string;
    size: number;
    uploadedBy?: string;
  }) {
    const db = this.databaseService.db;

    // 1. Create raw file metadata entry
    const [rawMetadata] = await db
      .insert(rawFile)
      .values({
        encoding: 'binary', // Default for raw files
        isProcessed: false,
      })
      .returning();

    // 2. Create file entry
    const [fileEntry] = await db
      .insert(file)
      .values({
        type: 'raw',
        contentId: rawMetadata.id,
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

    return { file: fileEntry, rawMetadata };
  }

  /**
   * Create a placeholder file entry to get an ID before saving the physical file
   * This allows us to use the fileId as the filename on disk
   */
  async createPlaceholderFile(data: {
    type: 'image' | 'video' | 'audio' | 'raw';
    filename: string;
    mimeType: string;
    size: number;
    uploadedBy?: string;
  }) {
    const db = this.databaseService.db;
    
    // Create appropriate metadata entry first
    let contentId: string;
    
    if (data.type === 'image') {
      const [metadata] = await db.insert(imageFile).values({
        width: 0, // Will be updated later
        height: 0,
        isProcessed: false,
      }).returning();
      contentId = metadata.id;
    } else if (data.type === 'video') {
      const [metadata] = await db.insert(videoFile).values({
        width: 0,
        height: 0,
        duration: 0,
        hasAudio: true,
        isProcessed: false,
      }).returning();
      contentId = metadata.id;
    } else if (data.type === 'audio') {
      const [metadata] = await db.insert(audioFile).values({
        duration: 0,
        sampleRate: 44100,
        channels: 2,
        isProcessed: false,
      }).returning();
      contentId = metadata.id;
    } else {
      const [metadata] = await db.insert(rawFile).values({
        encoding: 'binary',
        isProcessed: false,
      }).returning();
      contentId = metadata.id;
    }
    
    // Create file entry with placeholder path (will be updated after save)
    const [fileEntry] = await db
      .insert(file)
      .values({
        type: data.type,
        contentId,
        filePath: 'pending', // Temporary - will be updated
        filename: data.filename,
        storedFilename: 'pending', // Temporary - will be updated
        mimeType: data.mimeType,
        size: data.size,
        extension: data.filename.split('.').pop() ?? '',
        uploadedBy: data.uploadedBy,
        isPublic: false,
      })
      .returning();
    
    return fileEntry;
  }

  /**
   * Update file paths after physical file has been saved
   */
  async updateFilePaths(fileId: string, paths: {
    filePath: string;
    storedFilename: string;
  }) {
    const db = this.databaseService.db;
    await db
      .update(file)
      .set({
        filePath: paths.filePath,
        storedFilename: paths.storedFilename,
      })
      .where(eq(file.id, fileId));
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
   * Get video with file metadata by file ID
   * Joins file table with videoFile table
   */
  async getVideoByFileId(fileId: string): Promise<{
    file: InferSelectModel<typeof file>;
    videoMetadata: InferSelectModel<typeof videoFile> | null;
  } | undefined> {
    const db = this.databaseService.db;
    const [result] = await db
      .select({
        file: file,
        videoMetadata: videoFile,
      })
      .from(file)
      .leftJoin(videoFile, eq(file.contentId, videoFile.id))
      .where(eq(file.id, fileId));

    return result;
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
      processingStartedAt?: Date;
    },
    fileId?: string,
    newFilePath?: string
  ) {
    const db = this.databaseService.db;
    
    // Update video metadata
    await db
      .update(videoFile)
      .set({
        isProcessed: status.isProcessed,
        processingProgress: status.processingProgress,
        processingError: status.processingError,
        processingStartedAt: status.processingStartedAt,
        processingCompletedAt: status.isProcessed ? new Date() : undefined,
      })
      .where(eq(videoFile.id, videoId));
    
    // If newFilePath provided (video was converted), update the file path in file table
    if (fileId && newFilePath) {
      // Convert absolute path to relative path
      // FFmpeg returns absolute: /app/apps/api/uploads/videos/video-123.mp4
      // getAbsolutePath() does: join(UPLOADS_DIR, filePath) where UPLOADS_DIR = /app/apps/api/uploads
      // So database needs ONLY the part after uploads/: videos/video-123.mp4
      const uploadsIndex = newFilePath.indexOf('uploads/');
      const relativePath = uploadsIndex >= 0 
        ? newFilePath.substring(uploadsIndex + 'uploads/'.length)  // Skip 'uploads/' prefix
        : newFilePath;
      
      console.log('[DEBUG updateVideoProcessingStatus] Path extraction:', {
        fileId,
        newFilePath,
        uploadsIndex,
        relativePath,
      });
      
      await db
        .update(file)
        .set({
          filePath: relativePath,
          // Update stored filename to match new path
          storedFilename: relativePath.split('/').pop() || relativePath,
        })
        .where(eq(file.id, fileId));
    }
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

  /**
   * Get image file by ID
   * Returns file record with joined image metadata
   * Returns undefined if not found or if file is not an image
   */
  async getImageByFileId(fileId: string): Promise<{
    file: InferSelectModel<typeof file>;
    imageMetadata: InferSelectModel<typeof imageFile> | null;
  } | undefined> {
    const db = this.databaseService.db;
    const [result] = await db
      .select({
        file: file,
        imageMetadata: imageFile,
      })
      .from(file)
      .leftJoin(imageFile, eq(file.contentId, imageFile.id))
      .where(eq(file.id, fileId));

    return result;
  }

  /**
   * Get audio file by ID
   * Returns file record with joined audio metadata
   * Returns undefined if not found or if file is not an audio
   */
  async getAudioByFileId(fileId: string): Promise<{
    file: InferSelectModel<typeof file>;
    audioMetadata: InferSelectModel<typeof audioFile> | null;
  } | undefined> {
    const db = this.databaseService.db;
    const [result] = await db
      .select({
        file: file,
        audioMetadata: audioFile,
      })
      .from(file)
      .leftJoin(audioFile, eq(file.contentId, audioFile.id))
      .where(eq(file.id, fileId));

    return result;
  }

  /**
   * Get raw file by ID
   * Returns file record with joined raw file metadata
   * Returns undefined if not found or if file is not a raw file
   */
  async getRawFileByFileId(fileId: string): Promise<{
    file: InferSelectModel<typeof file>;
    rawMetadata: InferSelectModel<typeof rawFile> | null;
  } | undefined> {
    const db = this.databaseService.db;
    const [result] = await db
      .select({
        file: file,
        rawMetadata: rawFile,
      })
      .from(file)
      .leftJoin(rawFile, eq(file.contentId, rawFile.id))
      .where(eq(file.id, fileId));

    return result;
  }
}
