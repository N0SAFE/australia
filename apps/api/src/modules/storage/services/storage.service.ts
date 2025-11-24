import { Injectable, Logger } from '@nestjs/common';
import { FileRangeService } from '@/core/modules/file/services/file-range.service';
import { FileService } from '@/core/modules/file';

/**
 * Storage Service - Thin wrapper around core FileService
 * This service delegates all file operations to the core FileService
 * with 'storage' as the namespace for organization
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly STORAGE_NAMESPACE = 'storage';

  constructor(
    private readonly fileRangeService: FileRangeService,
    private readonly fileService: FileService,
  ) {
    this.logger.log('StorageService initialized with core FileService');
  }

  /**
   * Upload an image file - Delegates to core FileService
   * Uses 'storage' namespace for organization
   */
  async uploadImage(
    file: File,
    uploadedBy?: string,
  ): Promise<{
    fileId: string;
    filename: string;
    size: number;
    mimeType: string;
    namespace: string;
    storedFilename: string;
  }> {
    const result = await this.fileService.uploadImage(
      file,
      [this.STORAGE_NAMESPACE],
      uploadedBy,
    );

    return {
      fileId: result.fileId,
      filename: result.filename,
      size: result.size,
      mimeType: result.mimeType,
      namespace: result.namespace.join('/'),
      storedFilename: result.storedFilename,
    };
  }

  /**
   * Upload a video file - Delegates to core FileService
   * Uses 'storage' namespace for organization
   */
  async uploadVideo(
    file: File,
    uploadedBy?: string,
  ): Promise<{
    fileId: string;
    filename: string;
    size: number;
    mimeType: string;
    namespace: string;
    storedFilename: string;
    absolutePath: string;
  }> {
    const result = await this.fileService.uploadVideo(
      file,
      [this.STORAGE_NAMESPACE],
      uploadedBy,
    );

    return {
      fileId: result.fileId,
      filename: result.filename,
      size: result.size,
      mimeType: result.mimeType,
      namespace: result.namespace.join('/'),
      storedFilename: result.storedFilename,
      absolutePath: result.absolutePath,
    };
  }

  /**
   * Upload an audio file - Delegates to core FileService
   * Uses 'storage' namespace for organization
   */
  async uploadAudio(
    file: File,
    uploadedBy?: string,
  ): Promise<{
    fileId: string;
    filename: string;
    size: number;
    mimeType: string;
    namespace: string;
    storedFilename: string;
  }> {
    const result = await this.fileService.uploadAudio(
      file,
      [this.STORAGE_NAMESPACE],
      uploadedBy,
    );

    return {
      fileId: result.fileId,
      filename: result.filename,
      size: result.size,
      mimeType: result.mimeType,
      namespace: result.namespace.join('/'),
      storedFilename: result.storedFilename,
    };
  }

  /**
   * Get video with file metadata by file ID - Delegates to core FileService
   * Returns null if not found or if file is not a video
   */
  async getVideoByFileId(fileId: string) {
    return await this.fileService.getVideoByFileId(fileId);
  }

  /**
   * Get image with file metadata by file ID - Delegates to core FileService
   * Returns undefined if not found or if file is not an image
   */
  async getImageByFileId(fileId: string) {
    return await this.fileService.getImageByFileId(fileId);
  }

  /**
   * Get audio with file metadata by file ID - Delegates to core FileService
   * Returns undefined if not found or if file is not an audio
   */
  async getAudioByFileId(fileId: string) {
    return await this.fileService.getAudioByFileId(fileId);
  }

  /**
   * Get raw file with file metadata by file ID - Delegates to core FileService
   * Returns undefined if not found or if file is not a raw file
   */
  async getRawFileByFileId(fileId: string) {
    return await this.fileService.getRawFileByFileId(fileId);
  }

  /**
   * Update video processing status - Delegates to core FileService
   * Called after video processing completes or fails
   */
  async updateVideoProcessingStatus(
    videoId: string,
    status: {
      isProcessed: boolean;
      processingProgress?: number;
      processingError?: string;
    }
  ) {
    await this.fileService.updateVideoProcessingStatus(videoId, status);
  }

  /**
   * Stream a video file with Range support (same as presentation module)
   * Uses FileRangeService for all streaming logic
   * 
   * @param fileId - The file ID
   * @param rangeHeader - Optional Range header from request
   */
  async streamVideo(
    fileId: string,
    rangeHeader?: string,
  ) {
    // Use FileRangeService for streaming (same as presentation)
    // FileRangeService handles file retrieval internally
    return await this.fileRangeService.streamVideo(
      fileId,
      rangeHeader,
      { maxChunkSize: 512000 }, // 500KB chunks
    );
  }
  
  /**
   * Stream an audio file with Range support
   * Uses FileRangeService for all streaming logic
   * 
   * @param fileId - The file ID
   * @param rangeHeader - Optional Range header from request
   */
  async streamAudio(
    fileId: string,
    rangeHeader?: string,
  ) {
    // Use FileRangeService for streaming
    // FileRangeService handles file retrieval internally
    return await this.fileRangeService.streamAudio(
      fileId,
      rangeHeader,
      { maxChunkSize: 512000 }, // 500KB chunks
    );
  }
  
  /**
   * Stream any file with Range support (images, PDFs, etc.)
   * Uses FileRangeService for all streaming logic
   * 
   * @param fileId - The file ID
   * @param rangeHeader - Optional Range header from request
   */
  async streamFile(
    fileId: string,
    rangeHeader?: string,
  ) {
    // Use FileRangeService for streaming
    // FileRangeService handles file retrieval internally and automatically sets correct MIME type
    return await this.fileRangeService.streamFile(
      fileId,
      rangeHeader,
      { maxChunkSize: 512000 }, // 500KB chunks
    );
  }
}
