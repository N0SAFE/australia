import { Injectable, Inject } from '@nestjs/common';
import type { ReadStream } from 'fs';
import { LazyFile } from '@mjackson/lazy-file';
import type { IStorageProvider, StreamOptions } from '../interfaces/storage-provider.interface';
import { FileUploadRepository } from '../repositories/file-upload.repository';

/**
 * Core file service that handles all file operations with namespace-based organization
 * 
 * Provides comprehensive file management including:
 * - File uploads with namespace-based organization
 * - File retrieval (by ID, stream, buffer)
 * - File deletion
 * - Path computation from namespace + storedFilename
 * - Metadata management
 * 
 * Namespace paths define the directory structure:
 * - ['capsule', 'video'] → uploads/capsule/video/{fileId}.{ext}
 * - ['capsule', 'image'] → uploads/capsule/image/{fileId}.{ext}
 * - ['presentation', 'video'] → uploads/presentation/video/{fileId}.{ext}
 * - ['storage'] → uploads/storage/{fileId}.{ext}
 * 
 * This service uses the storage provider abstraction for all file operations.
 */
@Injectable()
export class FileService {
  constructor(
    @Inject('STORAGE_PROVIDER')
    private readonly storageProvider: IStorageProvider,
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
    storedFilename: string;
  }> {
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
    const storedFilename = `${fileRecord.id}.${ext}`;
    
    // Build relative path: namespace + filename
    const feature = namespace.join('/');
    const filePath = `${feature}/${storedFilename}`;
    
    // Ensure directory exists and save file using storage provider
    await this.storageProvider.ensureDirectory(feature);
    await this.storageProvider.save(file, filePath);
    
    // Get absolute path (only for response, not used for storage operations)
    const absolutePath = this.storageProvider.getAbsolutePath(filePath);

    // Step 3: Update the database record with namespace and stored filename
    await this.fileUploadRepository.updateFileMetadata(fileRecord.id, {
      namespace: feature,
      storedFilename,
    });

    return {
      fileId: fileRecord.id,
      filename: file.name,
      size: file.size,
      mimeType: file.type,
      filePath, // Computed path (not stored in database)
      absolutePath,
      namespace,
      storedFilename, // Add stored filename to return value
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
   * Get video with file metadata by file ID
   * 
   * @param fileId - The file ID
   * @returns File and video metadata, null if not found or not a video
   */
  async getVideoByFileId(fileId: string) {
    return this.fileUploadRepository.getVideoByFileId(fileId);
  }

  /**
   * Get image with file metadata by file ID
   * 
   * @param fileId - The file ID
   * @returns File and image metadata, null if not found or not an image
   */
  async getImageByFileId(fileId: string) {
    return this.fileUploadRepository.getImageByFileId(fileId);
  }

  /**
   * Get audio with file metadata by file ID
   * 
   * @param fileId - The file ID
   * @returns File and audio metadata, null if not found or not audio
   */
  async getAudioByFileId(fileId: string) {
    return this.fileUploadRepository.getAudioByFileId(fileId);
  }

  /**
   * Get raw file with file metadata by file ID
   * 
   * @param fileId - The file ID
   * @returns File and raw metadata, null if not found or not a raw file
   */
  async getRawFileByFileId(fileId: string) {
    return this.fileUploadRepository.getRawFileByFileId(fileId);
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
    }
  ) {
    return this.fileUploadRepository.updateVideoProcessingStatus(
      videoId,
      status
    );
  }

  /**
   * Build relative file path from namespace and stored filename
   * This computes the relative path that the storage provider expects
   * 
   * @param namespace - Feature namespace path (e.g., 'capsule/video')
   * @param storedFilename - Filename on disk (e.g., 'fileId.mp4')
   * @returns Computed relative path (e.g., 'capsule/video/fileId.mp4')
   */
  buildRelativePath(namespace: string, storedFilename: string): string {
    return `${namespace}/${storedFilename}`;
  }

  /**
   * Build relative file path from a file record
   * Convenience method for building paths from database records
   * 
   * @param file - File record with namespace and storedFilename
   * @returns Computed relative path
   */
  buildRelativePathFromFile(file: { namespace: string; storedFilename: string }): string {
    return this.buildRelativePath(file.namespace, file.storedFilename);
  }

  /**
   * Delete a file by its file ID
   * 
   * @param fileId - The file ID
   */
  async deleteFile(fileId: string): Promise<void> {
    const file = await this.fileUploadRepository.getFileById(fileId);
    if (!file.namespace || !file.storedFilename) {
      throw new Error(`File not found or incomplete: ${fileId}`);
    }
    const filePath = this.buildRelativePath(file.namespace, file.storedFilename);
    await this.storageProvider.delete(filePath);
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
    if (!file.namespace || !file.storedFilename) {
      throw new Error(`File not found or incomplete: ${fileId}`);
    }
    const filePath = this.buildRelativePath(file.namespace, file.storedFilename);
    return this.storageProvider.getAbsolutePath(filePath);
  }

  /**
   * Get file stream for serving/downloading
   * 
   * @param fileId - The file ID
   * @returns File stream and metadata
   */
  async getFileStream(fileId: string): Promise<{
    stream: ReadStream;
    filename: string;
    mimeType: string;
    size: number;
  }> {
    const file = await this.fileUploadRepository.getFileById(fileId);
    if (!file.namespace || !file.storedFilename) {
      throw new Error(`File not found or incomplete: ${fileId}`);
    }

    const filePath = this.buildRelativePath(file.namespace, file.storedFilename);
    const stream = await this.storageProvider.createReadStream(filePath);

    return {
      stream,
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
    if (!file.namespace || !file.storedFilename) {
      throw new Error(`File not found or incomplete: ${fileId}`);
    }

    // Read file using storage provider stream
    const filePath = this.buildRelativePath(file.namespace, file.storedFilename);
    const stream = await this.storageProvider.createReadStream(filePath);
    
    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    return {
      buffer,
      filename: file.filename,
      mimeType: file.mimeType,
      size: file.size,
    };
  }

  /**
   * Create a read stream for a file by fileId
   * Supports range requests via start/end options
   * 
   * @param fileId - The file ID
   * @param options - Stream options (start/end for range requests)
   */
  async createReadStream(
    fileId: string,
    options?: StreamOptions,
  ): Promise<ReadStream> {
    // Get file metadata
    const file = await this.fileUploadRepository.getFileById(fileId);
    if (!file.namespace || !file.storedFilename) {
      throw new Error(`File not found or incomplete: ${fileId}`);
    }

    // Build relative path
    const relativePath = this.buildRelativePath(file.namespace, file.storedFilename);
    
    return this.storageProvider.createReadStream(relativePath, options);
  }

  /**
   * Create a LazyFile wrapper for ORPC responses
   * Converts Node.js ReadStream to Web ReadableStream
   * 
   * @param fileId - The file ID
   * @param options - Stream options (start/end for range requests)
   */
  async createLazyFile(
    fileId: string,
    options?: StreamOptions,
  ): Promise<LazyFile> {
    // Get file metadata
    const file = await this.fileUploadRepository.getFileById(fileId);
    if (!file.namespace || !file.storedFilename) {
      throw new Error(`File not found or incomplete: ${fileId}`);
    }

    // Build relative path
    const relativePath = this.buildRelativePath(file.namespace, file.storedFilename);
    
    const stream = await this.createReadStream(fileId, options);
    const fileSize = await this.storageProvider.getSize(relativePath);
    
    // Calculate content length based on range
    const contentLength =
      options?.start !== undefined && options.end !== undefined
        ? options.end - options.start + 1
        : fileSize;
    
    const lazyContent = this.createLazyContent(stream, contentLength);
    return new LazyFile(lazyContent, file.filename, {
      type: file.mimeType,
    });
  }

  /**
   * Convert Node.js ReadStream to Web ReadableStream for LazyFile
   * @private
   */
  private createLazyContent(
    stream: ReadStream,
    byteLength: number,
  ): { stream: () => ReadableStream<Uint8Array>; byteLength: number } {
    return {
      byteLength,
      stream: () => {
        return new ReadableStream({
          start(controller) {
            stream.on('data', (chunk: string | Buffer) => {
              const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
              controller.enqueue(new Uint8Array(buffer));
            });

            stream.on('end', () => {
              controller.close();
            });

            stream.on('error', (error) => {
              controller.error(error);
            });
          },
          cancel() {
            stream.destroy();
          },
        });
      },
    };
  }

  /**
   * Close a stream (for cleanup)
   */
  closeStream(stream: ReadStream): void {
    if (!stream.destroyed) {
      stream.destroy();
    }
  }
}
