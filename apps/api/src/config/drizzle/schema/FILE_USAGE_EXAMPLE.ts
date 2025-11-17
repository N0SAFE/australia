/**
 * FILE USAGE EXAMPLES
 * 
 * This file demonstrates how to use the file management schema in your application.
 * These are example implementations that show the patterns for working with the tables.
 */

import { eq, and } from 'drizzle-orm';
import { file, imageFile, videoFile, audioFile, textFile } from './file';
// Assume db is your Drizzle database instance
// import { db } from '@/config/database';

// ============================================================================
// EXAMPLE 1: Creating a Video File Entry
// ============================================================================

export async function createVideoFile(
  db: any,
  fileData: {
    filePath: string;
    filename: string;
    storedFilename: string;
    mimeType: string;
    size: number;
    uploadedBy: string;
  },
  videoData: {
    width: number;
    height: number;
    duration: number;
    videoCodec?: string;
    videoBitrate?: number;
    hasAudio?: boolean;
    audioCodec?: string;
  }
) {
  // 1. First, create the video metadata entry
  const [videoMetadata] = await db
    .insert(videoFile)
    .values({
      width: videoData.width,
      height: videoData.height,
      duration: videoData.duration,
      videoCodec: videoData.videoCodec,
      videoBitrate: videoData.videoBitrate,
      hasAudio: videoData.hasAudio ?? true,
      audioCodec: videoData.audioCodec,
      isProcessed: false,
      aspectRatio: `${videoData.width}:${videoData.height}`,
    })
    .returning();

  // 2. Then create the main file entry referencing the video metadata
  const [fileEntry] = await db
    .insert(file)
    .values({
      type: 'video',
      contentId: videoMetadata.id,
      filePath: fileData.filePath,
      filename: fileData.filename,
      storedFilename: fileData.storedFilename,
      mimeType: fileData.mimeType,
      size: fileData.size,
      extension: fileData.filename.split('.').pop(),
      uploadedBy: fileData.uploadedBy,
      isPublic: false,
    })
    .returning();

  return { file: fileEntry, videoMetadata };
}

// ============================================================================
// EXAMPLE 2: Updating Video Processing Status
// ============================================================================

export async function startVideoProcessing(db: any, videoId: string) {
  await db
    .update(videoFile)
    .set({
      isProcessed: false,
      processingStartedAt: new Date(),
      processingProgress: 0,
      processingError: null,
    })
    .where(eq(videoFile.id, videoId));
}

export async function updateVideoProcessingProgress(
  db: any,
  videoId: string,
  progress: number
) {
  await db
    .update(videoFile)
    .set({
      processingProgress: progress,
    })
    .where(eq(videoFile.id, videoId));
}

export async function completeVideoProcessing(
  db: any,
  videoId: string,
  thumbnailPath?: string
) {
  await db
    .update(videoFile)
    .set({
      isProcessed: true,
      processingCompletedAt: new Date(),
      processingProgress: 100,
      thumbnailPath,
    })
    .where(eq(videoFile.id, videoId));
}

export async function failVideoProcessing(
  db: any,
  videoId: string,
  error: string
) {
  await db
    .update(videoFile)
    .set({
      isProcessed: false,
      processingError: error,
      processingProgress: 0,
    })
    .where(eq(videoFile.id, videoId));
}

// ============================================================================
// EXAMPLE 3: Creating an Image File Entry
// ============================================================================

export async function createImageFile(
  db: any,
  fileData: {
    filePath: string;
    filename: string;
    storedFilename: string;
    mimeType: string;
    size: number;
    uploadedBy: string;
  },
  imageData: {
    width: number;
    height: number;
    format?: string;
    hasAlpha?: boolean;
    exifData?: Record<string, any>;
  }
) {
  // 1. Create image metadata entry
  const [imageMetadata] = await db
    .insert(imageFile)
    .values({
      width: imageData.width,
      height: imageData.height,
      aspectRatio: imageData.width / imageData.height,
      format: imageData.format,
      hasAlpha: imageData.hasAlpha,
      exifData: imageData.exifData,
      isProcessed: false,
    })
    .returning();

  // 2. Create file entry
  const [fileEntry] = await db
    .insert(file)
    .values({
      type: 'image',
      contentId: imageMetadata.id,
      filePath: fileData.filePath,
      filename: fileData.filename,
      storedFilename: fileData.storedFilename,
      mimeType: fileData.mimeType,
      size: fileData.size,
      extension: fileData.filename.split('.').pop(),
      uploadedBy: fileData.uploadedBy,
    })
    .returning();

  return { file: fileEntry, imageMetadata };
}

// ============================================================================
// EXAMPLE 4: Creating an Audio File Entry
// ============================================================================

export async function createAudioFile(
  db: any,
  fileData: {
    filePath: string;
    filename: string;
    storedFilename: string;
    mimeType: string;
    size: number;
    uploadedBy: string;
  },
  audioData: {
    duration: number;
    sampleRate: number;
    channels: number;
    bitrate?: number;
    audioCodec?: string;
    title?: string;
    artist?: string;
    album?: string;
  }
) {
  // 1. Create audio metadata entry
  const [audioMetadata] = await db
    .insert(audioFile)
    .values({
      duration: audioData.duration,
      sampleRate: audioData.sampleRate,
      channels: audioData.channels,
      bitrate: audioData.bitrate,
      audioCodec: audioData.audioCodec,
      title: audioData.title,
      artist: audioData.artist,
      album: audioData.album,
      isProcessed: false,
    })
    .returning();

  // 2. Create file entry
  const [fileEntry] = await db
    .insert(file)
    .values({
      type: 'audio',
      contentId: audioMetadata.id,
      filePath: fileData.filePath,
      filename: fileData.filename,
      storedFilename: fileData.storedFilename,
      mimeType: fileData.mimeType,
      size: fileData.size,
      extension: fileData.filename.split('.').pop(),
      uploadedBy: fileData.uploadedBy,
    })
    .returning();

  return { file: fileEntry, audioMetadata };
}

// ============================================================================
// EXAMPLE 5: Creating a Text File Entry
// ============================================================================

export async function createTextFile(
  db: any,
  fileData: {
    filePath: string;
    filename: string;
    storedFilename: string;
    mimeType: string;
    size: number;
    uploadedBy: string;
  },
  textData: {
    format?: string;
    encoding?: string;
    lineCount?: number;
    wordCount?: number;
    characterCount?: number;
    isCode?: boolean;
    programmingLanguage?: string;
    fullText?: string;
  }
) {
  // 1. Create text metadata entry
  const [textMetadata] = await db
    .insert(textFile)
    .values({
      format: textData.format,
      encoding: textData.encoding || 'utf-8',
      lineCount: textData.lineCount,
      wordCount: textData.wordCount,
      characterCount: textData.characterCount,
      isCode: textData.isCode,
      programmingLanguage: textData.programmingLanguage,
      fullText: textData.fullText,
      isProcessed: false,
    })
    .returning();

  // 2. Create file entry
  const [fileEntry] = await db
    .insert(file)
    .values({
      type: 'text',
      contentId: textMetadata.id,
      filePath: fileData.filePath,
      filename: fileData.filename,
      storedFilename: fileData.storedFilename,
      mimeType: fileData.mimeType,
      size: fileData.size,
      extension: fileData.filename.split('.').pop(),
      uploadedBy: fileData.uploadedBy,
    })
    .returning();

  return { file: fileEntry, textMetadata };
}

// ============================================================================
// EXAMPLE 6: Querying Files
// ============================================================================

export async function getFileById(db: any, fileId: string) {
  const [fileRecord] = await db
    .select()
    .from(file)
    .where(eq(file.id, fileId));

  return fileRecord;
}

export async function getVideoWithMetadata(db: any, fileId: string) {
  const result = await db
    .select()
    .from(file)
    .leftJoin(videoFile, eq(file.contentId, videoFile.id))
    .where(and(eq(file.id, fileId), eq(file.type, 'video')));

  return result[0];
}

export async function getImageWithMetadata(db: any, fileId: string) {
  const result = await db
    .select()
    .from(file)
    .leftJoin(imageFile, eq(file.contentId, imageFile.id))
    .where(and(eq(file.id, fileId), eq(file.type, 'image')));

  return result[0];
}

export async function getUnprocessedVideos(db: any) {
  const videos = await db
    .select()
    .from(file)
    .leftJoin(videoFile, eq(file.contentId, videoFile.id))
    .where(and(eq(file.type, 'video'), eq(videoFile.isProcessed, false)));

  return videos;
}

export async function getFilesByUser(db: any, userId: string) {
  const files = await db
    .select()
    .from(file)
    .where(eq(file.uploadedBy, userId));

  return files;
}

export async function getPublicFiles(db: any) {
  const files = await db.select().from(file).where(eq(file.isPublic, true));

  return files;
}

// ============================================================================
// EXAMPLE 7: Soft Deleting a File
// ============================================================================

export async function softDeleteFile(
  db: any,
  fileId: string,
  deletedBy: string
) {
  await db
    .update(file)
    .set({
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy,
    })
    .where(eq(file.id, fileId));
}

export async function restoreFile(db: any, fileId: string) {
  await db
    .update(file)
    .set({
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    })
    .where(eq(file.id, fileId));
}

// ============================================================================
// EXAMPLE 8: File Versioning
// ============================================================================

export async function createNewFileVersion(
  db: any,
  originalFileId: string,
  newFileData: {
    filePath: string;
    filename: string;
    storedFilename: string;
    size: number;
  }
) {
  // Get original file
  const [originalFile] = await db
    .select()
    .from(file)
    .where(eq(file.id, originalFileId));

  // Create new version
  const [newFile] = await db
    .insert(file)
    .values({
      ...originalFile,
      ...newFileData,
      version: originalFile.version + 1,
      previousVersionId: originalFileId,
      uploadedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return newFile;
}

export async function getFileVersionHistory(db: any, fileId: string) {
  const versions = [];
  let currentFileId: string | null = fileId;

  while (currentFileId) {
    const [fileRecord] = await db
      .select()
      .from(file)
      .where(eq(file.id, currentFileId));

    if (!fileRecord) break;

    versions.push(fileRecord);
    currentFileId = fileRecord.previousVersionId;
  }

  return versions;
}

// ============================================================================
// EXAMPLE 9: Updating File Permissions
// ============================================================================

export async function updateFilePermissions(
  db: any,
  fileId: string,
  permissions: {
    read?: string[];
    write?: string[];
    delete?: string[];
  }
) {
  await db
    .update(file)
    .set({
      permissions,
    })
    .where(eq(file.id, fileId));
}

export async function makeFilePublic(db: any, fileId: string) {
  await db
    .update(file)
    .set({
      isPublic: true,
    })
    .where(eq(file.id, fileId));
}

export async function makeFilePrivate(db: any, fileId: string) {
  await db
    .update(file)
    .set({
      isPublic: false,
    })
    .where(eq(file.id, fileId));
}

// ============================================================================
// EXAMPLE 10: Searching Files by Tags
// ============================================================================

export async function getFilesByTags(db: any, tags: string[]) {
  // Note: This is a simplified example. In production, you'd use PostgreSQL's
  // JSONB operators for more efficient tag searching
  const files = await db.select().from(file);

  return files.filter((f) => {
    if (!f.tags) return false;
    return tags.some((tag) => f.tags.includes(tag));
  });
}

// ============================================================================
// EXAMPLE 11: Complete File Upload Pipeline
// ============================================================================

export async function handleFileUpload(
  db: any,
  uploadedFile: Express.Multer.File,
  userId: string,
  fileType: 'image' | 'video' | 'audio' | 'text',
  metadata: Record<string, any>
) {
  const fileData = {
    filePath: uploadedFile.path,
    filename: uploadedFile.originalname,
    storedFilename: uploadedFile.filename,
    mimeType: uploadedFile.mimetype,
    size: uploadedFile.size,
    uploadedBy: userId,
  };

  switch (fileType) {
    case 'video':
      return await createVideoFile(db, fileData, metadata);
    case 'image':
      return await createImageFile(db, fileData, metadata);
    case 'audio':
      return await createAudioFile(db, fileData, metadata);
    case 'text':
      return await createTextFile(db, fileData, metadata);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

// ============================================================================
// EXAMPLE 12: Type-Safe File Retrieval with Discriminated Union
// ============================================================================

export type FileWithMetadata =
  | {
      file: typeof file.$inferSelect;
      metadata: typeof videoFile.$inferSelect;
      type: 'video';
    }
  | {
      file: typeof file.$inferSelect;
      metadata: typeof imageFile.$inferSelect;
      type: 'image';
    }
  | {
      file: typeof file.$inferSelect;
      metadata: typeof audioFile.$inferSelect;
      type: 'audio';
    }
  | {
      file: typeof file.$inferSelect;
      metadata: typeof textFile.$inferSelect;
      type: 'text';
    };

export async function getFileWithMetadata(
  db: any,
  fileId: string
): Promise<FileWithMetadata | null> {
  const [fileRecord] = await db
    .select()
    .from(file)
    .where(eq(file.id, fileId));

  if (!fileRecord) return null;

  switch (fileRecord.type) {
    case 'video': {
      const [metadata] = await db
        .select()
        .from(videoFile)
        .where(eq(videoFile.id, fileRecord.contentId));
      return { file: fileRecord, metadata, type: 'video' };
    }
    case 'image': {
      const [metadata] = await db
        .select()
        .from(imageFile)
        .where(eq(imageFile.id, fileRecord.contentId));
      return { file: fileRecord, metadata, type: 'image' };
    }
    case 'audio': {
      const [metadata] = await db
        .select()
        .from(audioFile)
        .where(eq(audioFile.id, fileRecord.contentId));
      return { file: fileRecord, metadata, type: 'audio' };
    }
    case 'text': {
      const [metadata] = await db
        .select()
        .from(textFile)
        .where(eq(textFile.id, fileRecord.contentId));
      return { file: fileRecord, metadata, type: 'text' };
    }
  }
}
