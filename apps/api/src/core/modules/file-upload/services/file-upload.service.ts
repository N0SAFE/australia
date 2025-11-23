import { Injectable } from '@nestjs/common';
import { StorageService } from '@/modules/storage/services/storage.service';
import { FileUploadRepository } from '../repositories/file-upload.repository';

/**
 * Core file upload service that handles file uploads with namespace-based organization
 * 
 * Namespace paths define the directory structure:
 * - ['capsule', 'video'] → uploads/capsule/video/{fileId}.{ext}
 * - ['capsule', 'image'] → uploads/capsule/image/{fileId}.{ext}
 * - ['presentation', 'video'] → uploads/presentation/video/{fileId}.{ext}
 * - ['storage'] → uploads/storage/{fileId}.{ext}
 * 
 * This service follows the layered architecture:
 * Controller → FileUploadService → Repository → DatabaseService
 *                              ↓
 *                      StorageService (file I/O)
 */
@Injectable()
export class FileUploadService {
  constructor(
    private readonly storageService: StorageService,
    private readonly fileUploadRepository: FileUploadRepository,
  ) {}

  /**
   * Upload a file with namespace-based organization
   * 
   * @param file - The File object to upload
   * @param namespace - Array of path segments (e.g., ['capsule', 'video'])
   * @param type - File type: 'image' | 'video' | 'audio' | 'raw'
   * @param uploadedBy - Optional user ID who uploaded the file
   * @returns Upload result with fileId, paths, and metadata
   */
  async uploadFile(
    file: File,
    namespace: string[],
    type: 'image' | 'video' | 'audio' | 'raw',
    uploadedBy?: string,
  ): Promise<{
    fileId: string;
    filename: string;
    size: number;
    mimeType: string;
    filePath: string;
    absolutePath: string;
    namespace: string[];
  }> {
    // Build the feature path from namespace
    const feature = namespace.join('/');

    // Step 1: Create placeholder database record to get fileId
    const fileRecord = await this.fileUploadRepository.createPlaceholderFile({
      type,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      uploadedBy,
    });

    // Step 2: Save file using the generated fileId as the filename
    // Normalize extension to lowercase to avoid case-sensitivity issues
    const ext = (file.name.split('.').pop() ?? 'bin').toLowerCase();
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
    await this.fileUploadRepository.updateFilePaths(fileRecord.id, {
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
      namespace,
    };
  }

  /**
   * Upload an image file with namespace-based organization
   * 
   * @param file - The image file to upload
   * @param namespace - Array of path segments (e.g., ['capsule', 'image'])
   * @param uploadedBy - Optional user ID
   */
  async uploadImage(
    file: File,
    namespace: string[],
    uploadedBy?: string,
  ) {
    return this.uploadFile(file, namespace, 'image', uploadedBy);
  }

  /**
   * Upload a video file with namespace-based organization
   * 
   * @param file - The video file to upload
   * @param namespace - Array of path segments (e.g., ['capsule', 'video'])
   * @param uploadedBy - Optional user ID
   */
  async uploadVideo(
    file: File,
    namespace: string[],
    uploadedBy?: string,
  ) {
    return this.uploadFile(file, namespace, 'video', uploadedBy);
  }

  /**
   * Upload an audio file with namespace-based organization
   * 
   * @param file - The audio file to upload
   * @param namespace - Array of path segments (e.g., ['capsule', 'audio'])
   * @param uploadedBy - Optional user ID
   */
  async uploadAudio(
    file: File,
    namespace: string[],
    uploadedBy?: string,
  ) {
    return this.uploadFile(file, namespace, 'audio', uploadedBy);
  }

  /**
   * Upload a raw/generic file with namespace-based organization
   * 
   * @param file - The raw file to upload
   * @param namespace - Array of path segments (e.g., ['documents', 'pdf'])
   * @param uploadedBy - Optional user ID
   */
  async uploadRawFile(
    file: File,
    namespace: string[],
    uploadedBy?: string,
  ) {
    return this.uploadFile(file, namespace, 'raw', uploadedBy);
  }

  /**
   * Get file metadata by ID
   * 
   * @param fileId - The file ID
   * @returns File record with metadata
   */
  async getFileById(fileId: string) {
    return this.fileUploadRepository.getFileById(fileId);
  }

  /**
   * Get video metadata for a specific file
   * 
   * @param fileId - The file ID
   * @returns Video metadata if file is a video, null otherwise
   */
  async getVideoMetadataByFileId(fileId: string) {
    return this.fileUploadRepository.getVideoMetadataByFileId(fileId);
  }

  /**
   * Update video processing status
   * 
   * @param videoId - The video ID
   * @param status - Processing status information
   * @param fileId - Optional file ID for processed video
   * @param newFilePath - Optional new file path for converted video
   */
  async updateVideoProcessingStatus(
    videoId: string,
    status: {
      isProcessed: boolean;
      processingProgress?: number;
      processingError?: string;
    },
    fileId?: string,
    newFilePath?: string,
  ) {
    return this.fileUploadRepository.updateVideoProcessingStatus(
      videoId,
      status,
      fileId,
      newFilePath,
    );
  }

  /**
   * Delete a file by its file ID
   * 
   * @param fileId - The file ID
   */
  async deleteFile(fileId: string): Promise<void> {
    const file = await this.fileUploadRepository.getFileById(fileId);
    if (!file?.filePath) {
      throw new Error(`File not found: ${fileId}`);
    }
    return this.storageService.deleteFile(file.filePath);
  }

  /**
   * Update file paths in database
   * Used when a file is moved or renamed
   * 
   * @param fileId - The file ID
   * @param paths - New filePath and storedFilename
   */
  async updateFilePaths(
    fileId: string,
    paths: {
      filePath: string;
      storedFilename: string;
    }
  ): Promise<void> {
    await this.fileUploadRepository.updateFilePaths(fileId, paths);
  }

  /**
   * Get the absolute file path for a file ID
   * Used internally for operations that need the physical file
   * 
   * @param fileId - The file ID
   * @returns Absolute path to the file
   */
  async getAbsoluteFilePath(fileId: string): Promise<string> {
    const file = await this.fileUploadRepository.getFileById(fileId);
    if (!file?.filePath) {
      throw new Error(`File not found: ${fileId}`);
    }
    const path = await import('path');
    const { UPLOADS_DIR } = await import('@/config/storage.config');
    return path.join(UPLOADS_DIR, file.filePath);
  }

  /**
   * Get file stream for serving/downloading
   * 
   * @param fileId - The file ID
   * @returns File stream and metadata
   */
  async getFileStream(fileId: string): Promise<{
    stream: ReadableStream;
    filename: string;
    mimeType: string;
    size: number;
  }> {
    const file = await this.fileUploadRepository.getFileById(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    const absolutePath = await this.getAbsoluteFilePath(fileId);
    const { createReadStream } = await import('fs');
    const stream = createReadStream(absolutePath);

    return {
      stream: stream as any,
      filename: file.filename,
      mimeType: file.mimeType,
      size: file.size,
    };
  }

  /**
   * Get file buffer for processing
   * 
   * @param fileId - The file ID
   * @returns File buffer and metadata
   */
  async getFileBuffer(fileId: string): Promise<{
    buffer: Buffer;
    filename: string;
    mimeType: string;
    size: number;
  }> {
    const file = await this.fileUploadRepository.getFileById(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    const absolutePath = await this.getAbsoluteFilePath(fileId);
    const { readFile } = await import('fs/promises');
    const buffer = await readFile(absolutePath);

    return {
      buffer,
      filename: file.filename,
      mimeType: file.mimeType,
      size: file.size,
    };
  }
}
