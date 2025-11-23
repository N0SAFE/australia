import { Injectable } from '@nestjs/common';
import { FileMetadataRepository } from '../repositories/file-metadata.repository';
import { StorageService } from './storage.service';

/**
 * Service for file metadata management
 * Handles business logic for file operations
 * Uses FileMetadataRepository for database operations
 */
@Injectable()
export class FileMetadataService {
  constructor(
    private readonly fileMetadataRepository: FileMetadataRepository,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Extract video file metadata
   * TODO: Implement actual metadata extraction using ffprobe or similar
   */
  async extractVideoMetadata(filePath: string): Promise<{
    width?: number;
    height?: number;
    duration?: number;
    videoCodec?: string;
    videoBitrate?: number;
    hasAudio?: boolean;
    audioCodec?: string;
    frameRate?: number;
    aspectRatio?: string;
  }> {
    // TODO: Use ffprobe or similar library to extract real metadata
    // For now, return empty metadata (will be populated by processing)
    return {
      width: undefined,
      height: undefined,
      duration: undefined,
      videoCodec: undefined,
      videoBitrate: undefined,
      hasAudio: true,
      audioCodec: undefined,
      frameRate: undefined,
      aspectRatio: undefined,
    };
  }

  /**
   * Extract image file metadata
   * TODO: Implement actual metadata extraction using sharp or similar
   */
  async extractImageMetadata(filePath: string): Promise<{
    width?: number;
    height?: number;
    aspectRatio?: number;
    format?: string;
    hasAlpha?: boolean;
  }> {
    // TODO: Use sharp or similar library to extract real metadata
    // For now, return empty metadata (will be populated by processing)
    return {
      width: undefined,
      height: undefined,
      aspectRatio: undefined,
      format: undefined,
      hasAlpha: undefined,
    };
  }

  /**
   * Extract audio file metadata
   * TODO: Implement actual metadata extraction using ffprobe or similar
   */
  async extractAudioMetadata(filePath: string): Promise<{
    duration?: number;
    sampleRate?: number;
    channels?: number;
    bitrate?: number;
    audioCodec?: string;
  }> {
    // TODO: Use ffprobe or similar library to extract real metadata
    // For now, return defaults
    return {
      duration: undefined,
      sampleRate: 44100,
      channels: 2,
      bitrate: undefined,
      audioCodec: undefined,
    };
  }

  /**
   * Extract text file metadata
   * TODO: Implement actual metadata extraction (encoding detection, counting, etc.)
   */
  async extractTextMetadata(filePath: string): Promise<{
    encoding?: string;
    lineCount?: number;
    wordCount?: number;
    characterCount?: number;
  }> {
    // TODO: Read file and extract real metadata
    // For now, return defaults
    return {
      encoding: 'utf-8',
      lineCount: undefined,
      wordCount: undefined,
      characterCount: undefined,
    };
  }

  /**
   * Determine file subdirectory based on mime type
   */
  getSubdirectory(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'images';
    if (mimeType.startsWith('video/')) return 'videos';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'files';
  }

  /**
   * Build relative file path
   */
  buildRelativePath(mimeType: string, filename: string): string {
    const subdir = this.getSubdirectory(mimeType);
    return `${subdir}/${filename}`;
  }

  /**
   * Create video file record with metadata extraction
   */
  async createVideoFile(data: {
    file: File;
    filePath: string;
    absoluteFilePath: string;
    storedFilename: string;
    uploadedBy?: string;
  }) {
    // Extract metadata from the file
    const videoMetadata = await this.extractVideoMetadata(data.absoluteFilePath);
    
    // Calculate aspect ratio if dimensions are available
    if (videoMetadata.width && videoMetadata.height) {
      videoMetadata.aspectRatio = `${videoMetadata.width.toString()}:${videoMetadata.height.toString()}`;
    }

    // Save to database via repository
    return this.fileMetadataRepository.createVideoFile({
      filePath: data.filePath,
      filename: data.file.name,
      storedFilename: data.storedFilename,
      mimeType: data.file.type,
      size: data.file.size,
      uploadedBy: data.uploadedBy,
      videoMetadata,
    });
  }

  /**
   * Create image file record with metadata extraction
   */
  async createImageFile(data: {
    file: File;
    filePath: string;
    absoluteFilePath: string;
    storedFilename: string;
    uploadedBy?: string;
  }) {
    // Extract metadata from the file
    const imageMetadata = await this.extractImageMetadata(data.absoluteFilePath);

    // Save to database via repository
    return this.fileMetadataRepository.createImageFile({
      filePath: data.filePath,
      filename: data.file.name,
      storedFilename: data.storedFilename,
      mimeType: data.file.type,
      size: data.file.size,
      uploadedBy: data.uploadedBy,
      imageMetadata,
    });
  }

  /**
   * Create audio file record with metadata extraction
   */
  async createAudioFile(data: {
    file: File;
    filePath: string;
    absoluteFilePath: string;
    storedFilename: string;
    uploadedBy?: string;
  }) {
    // Extract metadata from the file
    const audioMetadata = await this.extractAudioMetadata(data.absoluteFilePath);

    // Save to database via repository
    return this.fileMetadataRepository.createAudioFile({
      filePath: data.filePath,
      filename: data.file.name,
      storedFilename: data.storedFilename,
      mimeType: data.file.type,
      size: data.file.size,
      uploadedBy: data.uploadedBy,
      audioMetadata,
    });
  }

  /**
   * Create raw file record (for generic/document files)
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
    // For raw files, we don't extract metadata
    // Just save to database via repository
    return this.fileMetadataRepository.createRawFile({
      filePath: data.filePath,
      absoluteFilePath: data.absoluteFilePath,
      filename: data.filename,
      storedFilename: data.storedFilename,
      mimeType: data.mimeType,
      size: data.size,
      uploadedBy: data.uploadedBy,
    });
  }

  /**
   * Get file by ID
   */
  async getFileById(fileId: string) {
    return this.fileMetadataRepository.getFileById(fileId);
  }

  /**
   * Get video with file metadata by file ID
   * Returns null if not found or if file is not a video
   */
  async getVideoByFileId(fileId: string) {
    return this.fileMetadataRepository.getVideoByFileId(fileId);
  }

  /**
   * Get file by path
   */
  async getFileByPath(filePath: string) {
    return this.fileMetadataRepository.getFileByPath(filePath);
  }

  /**
   * Update video processing status
   * Called after video processing completes or fails
   * @param videoId - Video metadata ID
   * @param status - Processing status update
   * @param fileId - Optional file ID to update file path
   * @param newFilePath - Optional new file path (when video was converted)
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
    return this.fileMetadataRepository.updateVideoProcessingStatus(videoId, status, fileId, newFilePath);
  }

  /**
   * Get image with file metadata by file ID
   * Returns undefined if not found or if file is not an image
   */
  async getImageByFileId(fileId: string) {
    return this.fileMetadataRepository.getImageByFileId(fileId);
  }

  /**
   * Get audio with file metadata by file ID
   * Returns undefined if not found or if file is not an audio
   */
  async getAudioByFileId(fileId: string) {
    return this.fileMetadataRepository.getAudioByFileId(fileId);
  }

  /**
   * Get raw file with file metadata by file ID
   * Returns undefined if not found or if file is not a raw file
   */
  async getRawFileByFileId(fileId: string) {
    return this.fileMetadataRepository.getRawFileByFileId(fileId);
  }

  /**
   * Upload an image file with proper feature-based storage
   * Creates DB record first to get fileId, then saves file with that ID as filename
   */
  async uploadImage(
    file: File,
    feature: string,
    uploadedBy?: string,
  ): Promise<{
    fileId: string;
    filename: string;
    size: number;
    mimeType: string;
    filePath: string;
  }> {
    // Step 1: Create placeholder database record to get fileId
    const fileRecord = await this.fileMetadataRepository.createPlaceholderFile({
      type: 'image',
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      uploadedBy,
    });

    // Step 2: Save file using the generated fileId as the filename
    const ext = file.name.split('.').pop() ?? 'bin';
    const absolutePath = await this.storageService.saveFile(
      file,
      fileRecord.id,
      feature,
      ext,
    );

    // Step 3: Build the paths for database
    const storedFilename = `${fileRecord.id}.${ext}`;
    const filePath = `${feature}/${storedFilename}`;

    // Step 4: Update the database record with actual paths
    await this.fileMetadataRepository.updateFilePaths(fileRecord.id, {
      filePath,
      storedFilename,
    });

    return {
      fileId: fileRecord.id,
      filename: file.name,
      size: file.size,
      mimeType: file.type,
      filePath,
    };
  }

  /**
   * Upload a video file with proper feature-based storage
   * Creates DB record first to get fileId, then saves file with that ID as filename
   */
  async uploadVideo(
    file: File,
    feature: string,
    uploadedBy?: string,
  ): Promise<{
    fileId: string;
    filename: string;
    size: number;
    mimeType: string;
    filePath: string;
    absolutePath: string;
  }> {
    // Step 1: Create placeholder database record to get fileId
    const fileRecord = await this.fileMetadataRepository.createPlaceholderFile({
      type: 'video',
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      uploadedBy,
    });

    // Step 2: Save file using the generated fileId as the filename
    const ext = file.name.split('.').pop() ?? 'bin';
    const absolutePath = await this.storageService.saveFile(
      file,
      fileRecord.id,
      feature,
      ext,
    );

    // Step 3: Build the paths for database
    const storedFilename = `${fileRecord.id}.${ext}`;
    const filePath = `${feature}/${storedFilename}`;

    // Step 4: Update the database record with actual paths
    await this.fileMetadataRepository.updateFilePaths(fileRecord.id, {
      filePath,
      storedFilename,
    });

    return {
      fileId: fileRecord.id,
      filename: file.name,
      size: file.size,
      mimeType: file.type,
      filePath,
      absolutePath,
    };
  }

  /**
   * Upload an audio file with proper feature-based storage
   * Creates DB record first to get fileId, then saves file with that ID as filename
   */
  async uploadAudio(
    file: File,
    feature: string,
    uploadedBy?: string,
  ): Promise<{
    fileId: string;
    filename: string;
    size: number;
    mimeType: string;
    filePath: string;
  }> {
    // Step 1: Create placeholder database record to get fileId
    const fileRecord = await this.fileMetadataRepository.createPlaceholderFile({
      type: 'audio',
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      uploadedBy,
    });

    // Step 2: Save file using the generated fileId as the filename
    const ext = file.name.split('.').pop() ?? 'bin';
    const absolutePath = await this.storageService.saveFile(
      file,
      fileRecord.id,
      feature,
      ext,
    );

    // Step 3: Build the paths for database
    const storedFilename = `${fileRecord.id}.${ext}`;
    const filePath = `${feature}/${storedFilename}`;

    // Step 4: Update the database record with actual paths
    await this.fileMetadataRepository.updateFilePaths(fileRecord.id, {
      filePath,
      storedFilename,
    });

    return {
      fileId: fileRecord.id,
      filename: file.name,
      size: file.size,
      mimeType: file.type,
      filePath,
    };
  }
}
