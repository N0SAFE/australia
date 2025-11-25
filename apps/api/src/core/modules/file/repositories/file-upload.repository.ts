import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@/core/modules/database/services/database.service';
import { file, imageFile, videoFile, audioFile, rawFile } from '@/config/drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Repository for file upload database operations
 * Handles all database interactions for file metadata
 * This is the ONLY place where DatabaseService should be accessed for file operations
 */
@Injectable()
export class FileUploadRepository {
  constructor(private readonly databaseService: DatabaseService) {}

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
    
    // Create file entry with placeholder values (will be updated after save)
    const [fileEntry] = await db
      .insert(file)
      .values({
        type: data.type,
        contentId,
        namespace: '', // Will be set when file is saved
        filename: data.filename,
        storedFilename: 'pending', // Will be set to fileId.ext when saved
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
   * Update file metadata after physical file has been saved
   */
  async updateFileMetadata(fileId: string, metadata: {
    namespace: string;
    storedFilename: string;
  }) {
    const db = this.databaseService.db;
    await db
      .update(file)
      .set({
        namespace: metadata.namespace,
        storedFilename: metadata.storedFilename,
      })
      .where(eq(file.id, fileId));
  }

  /**
   * Update file size in database
   * Used after video processing when the file has been converted in-place
   */
  async updateFileSize(fileId: string, newSize: number) {
    const db = this.databaseService.db;
    await db
      .update(file)
      .set({
        size: newSize,
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
   * Get video metadata by file ID
   */
  async getVideoMetadataByFileId(fileId: string) {
    const db = this.databaseService.db;
    const [fileRecord] = await db
      .select()
      .from(file)
      .where(eq(file.id, fileId));

    if (fileRecord.type !== 'video') {
      return null;
    }

    const [videoMetadata] = await db
      .select()
      .from(videoFile)
      .where(eq(videoFile.id, fileRecord.contentId));

    return videoMetadata;
  }

  /**
   * Get image metadata by file ID
   */
  async getImageByFileId(fileId: string) {
    const db = this.databaseService.db;
    const [fileRecord] = await db
      .select()
      .from(file)
      .where(eq(file.id, fileId));

    if (!fileRecord || fileRecord.type !== 'image') {
      return null;
    }

    const [imageMetadata] = await db
      .select()
      .from(imageFile)
      .where(eq(imageFile.id, fileRecord.contentId));

    return {
      file: fileRecord,
      imageMetadata,
    };
  }

  /**
   * Get audio metadata by file ID
   */
  async getAudioByFileId(fileId: string) {
    const db = this.databaseService.db;
    const [fileRecord] = await db
      .select()
      .from(file)
      .where(eq(file.id, fileId));

    if (!fileRecord || fileRecord.type !== 'audio') {
      return null;
    }

    const [audioMetadata] = await db
      .select()
      .from(audioFile)
      .where(eq(audioFile.id, fileRecord.contentId));

    return {
      file: fileRecord,
      audioMetadata,
    };
  }

  /**
   * Get raw file metadata by file ID
   */
  async getRawFileByFileId(fileId: string) {
    const db = this.databaseService.db;
    const [fileRecord] = await db
      .select()
      .from(file)
      .where(eq(file.id, fileId));

    if (!fileRecord || fileRecord.type !== 'raw') {
      return null;
    }

    const [rawMetadata] = await db
      .select()
      .from(rawFile)
      .where(eq(rawFile.id, fileRecord.contentId));

    return {
      file: fileRecord,
      rawMetadata,
    };
  }

  /**
   * Get video with file metadata by file ID
   * Returns null if not found or if file is not a video
   */
  async getVideoByFileId(fileId: string) {
    const db = this.databaseService.db;
    const [fileRecord] = await db
      .select()
      .from(file)
      .where(eq(file.id, fileId));

    if (!fileRecord || fileRecord.type !== 'video') {
      return null;
    }

    const [videoMetadata] = await db
      .select()
      .from(videoFile)
      .where(eq(videoFile.id, fileRecord.contentId));

    return {
      file: fileRecord,
      videoMetadata,
    };
  }

  /**
   * Update video processing status
   * Note: File paths are now computed from namespace + storedFilename, not stored
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
    
    // Update video metadata
    await db
      .update(videoFile)
      .set({
        isProcessed: status.isProcessed,
        processingProgress: status.processingProgress,
        processingError: status.processingError,
      })
      .where(eq(videoFile.id, videoId));
  }
}
