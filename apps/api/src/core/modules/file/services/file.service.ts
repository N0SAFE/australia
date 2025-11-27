import { Injectable, Inject, Logger } from '@nestjs/common';
import type { ReadStream } from 'fs';
import { promises as fsPromises } from 'fs';
import { LazyFile } from '@mjackson/lazy-file';
import { lookup } from 'mime-types';
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
  private readonly logger = new Logger(FileService.name);

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
    // Ensure MIME type is never empty - detect from extension if needed
    let mimeType = file.type;
    if (!mimeType || mimeType.trim() === '') {
      const ext = file.name.split('.').pop()?.toLowerCase();
      mimeType = lookup(ext ?? '') || 'application/octet-stream';
      console.warn(`[FileService] Empty MIME type for ${file.name}, detected: ${mimeType}`);
    }

    // Step 1: Create placeholder database record to get fileId
    const fileRecord = await this.fileUploadRepository.createPlaceholderFile({
      type,
      filename: file.name,
      mimeType,
      size: file.size,
      uploadedBy,
    });
    
    if (!fileRecord) {
      throw new Error('Failed to create file record in database');
    }

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
      mimeType, // Use the corrected mimeType, not file.type
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
   * Refresh file size from disk and update database
   * Used after video processing when the file has been converted in-place
   * 
   * @param fileId - The file ID
   * @returns The new file size
   */
  async refreshFileSizeFromDisk(fileId: string): Promise<number> {
    // Get file metadata to find the path
    const fileRecord = await this.fileUploadRepository.getFileById(fileId);
    
    // Check if file exists and has required fields
    if (!fileRecord) {
      throw new Error(`File not found: ${fileId}`);
    }
    if (!fileRecord.namespace || !fileRecord.storedFilename) {
      throw new Error(`File incomplete (missing namespace or storedFilename): ${fileId}`);
    }

    // Build relative path and get actual size from disk
    const relativePath = this.buildRelativePath(fileRecord.namespace, fileRecord.storedFilename);
    const actualSize = await this.storageProvider.getSize(relativePath);

    // Update database with actual size
    await this.fileUploadRepository.updateFileSize(fileId, actualSize);

    return actualSize;
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
   * Check if a file exists on the filesystem
   * 
   * @param fileId - The file ID
   * @returns True if file exists, false otherwise
   */
  async fileExists(fileId: string): Promise<boolean> {
    try {
      const file = await this.fileUploadRepository.getFileById(fileId);
      if (!file?.namespace || !file.storedFilename) {
        return false;
      }
      const filePath = this.buildRelativePath(file.namespace, file.storedFilename);
      return await this.storageProvider.exists(filePath);
    } catch {
      return false;
    }
  }

  /**
   * Delete a file by its file ID
   * 
   * @param fileId - The file ID
   */
  async deleteFile(fileId: string): Promise<void> {
    const file = await this.fileUploadRepository.getFileById(fileId);
    if (!file?.namespace || !file.storedFilename) {
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
    if (!file?.namespace || !file.storedFilename) {
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
    if (!file?.namespace || !file.storedFilename) {
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
    if (!file?.namespace || !file.storedFilename) {
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
    if (!file?.namespace || !file.storedFilename) {
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
   * @param mimeType - Optional MIME type override (useful when database MIME is empty/incorrect)
   */
  async createLazyFile(
    fileId: string,
    options?: StreamOptions,
    mimeType?: string,
  ): Promise<LazyFile> {
    // Get file metadata
    const file = await this.fileUploadRepository.getFileById(fileId);
    if (!file?.namespace || !file.storedFilename) {
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
    // Use provided mimeType override, fallback to file.mimeType
    const finalMimeType = mimeType ?? file.mimeType;
    return new LazyFile(lazyContent, file.filename, {
      type: finalMimeType,
    });
  }

  /**
   * Create a standard File object with exact bytes for HTTP Range requests
   * This method reads the exact byte range into memory and returns a File object
   * Use this instead of createLazyFile when HTTP/2 Content-Length precision is critical
   * 
   * @param fileId - The file ID
   * @param options - Stream options (start/end for range requests)
   * @param mimeType - Optional MIME type override
   * @returns Standard File object containing exactly the requested bytes
   */
  async createRangeFile(
    fileId: string,
    options?: StreamOptions,
    mimeType?: string,
  ): Promise<File> {
    // Get file metadata
    const file = await this.fileUploadRepository.getFileById(fileId);
    if (!file?.namespace || !file.storedFilename) {
      throw new Error(`File not found or incomplete: ${fileId}`);
    }

    // Build relative path and get absolute path
    const relativePath = this.buildRelativePath(file.namespace, file.storedFilename);
    const absolutePath = this.storageProvider.getAbsolutePath(relativePath);
    const fileSize = await this.storageProvider.getSize(relativePath);

    // Determine byte range
    const start = options?.start ?? 0;
    const end = options?.end ?? (fileSize - 1);
    const contentLength = end - start + 1;

    // Open file and read exact bytes
    const fileHandle = await fsPromises.open(absolutePath, 'r');
    try {
      const buffer = Buffer.alloc(contentLength);
      const { bytesRead } = await fileHandle.read(buffer, 0, contentLength, start);
      
      // Verify we read the expected number of bytes
      if (bytesRead !== contentLength) {
        console.warn(`[FileService] createRangeFile: Expected ${String(contentLength)} bytes, read ${String(bytesRead)}`);
      }

      // Create a standard File object with exact bytes
      const finalMimeType = mimeType ?? (file.mimeType || 'application/octet-stream');
      const rangeFile = new File(
        [buffer.subarray(0, bytesRead)], // Use only bytes actually read
        file.filename,
        { type: finalMimeType }
      );
      
      return rangeFile;
    } finally {
      await fileHandle.close();
    }
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

  /**
   * Replace the content of an existing file with new content.
   * Used after video processing to replace original with processed version.
   *
   * @param fileId - The file ID to replace content for
   * @param newFile - The new file content (Web File object)
   */
  async replaceFileContent(fileId: string, newFile: File): Promise<void> {
    const file = await this.fileUploadRepository.getFileById(fileId);
    if (!file?.namespace || !file.storedFilename) {
      throw new Error(`File not found or incomplete: ${fileId}`);
    }

    // Build the relative path
    const relativePath = this.buildRelativePath(file.namespace, file.storedFilename);

    // Save new content (overwrites existing file)
    await this.storageProvider.save(newFile, relativePath);
  }

  /**
   * Update file metadata in the database.
   * Used after video processing to update size and mimeType.
   *
   * @param fileId - The file ID to update
   * @param metadata - Metadata to update (size, mimeType)
   */
  async updateFileMetadata(
    fileId: string,
    metadata: { size?: number; mimeType?: string }
  ): Promise<void> {
    // Use existing method for size update
    if (metadata.size !== undefined) {
      await this.fileUploadRepository.updateFileSize(fileId, metadata.size);
    }
    // TODO: Add mimeType update to repository if needed
  }

  /**
   * Get a file as a Web File object.
   * Reads the file from storage and returns it as a standard File object.
   *
   * @param fileId - The file ID
   * @returns Web File object or null if not found
   */
  async getFileAsWebFile(fileId: string): Promise<File | null> {
    const file = await this.fileUploadRepository.getFileById(fileId);
    if (!file?.namespace || !file.storedFilename) {
      return null;
    }

    try {
      const { buffer, filename, mimeType } = await this.getFileBuffer(fileId);
      return new File([buffer], filename, { type: mimeType });
    } catch (error) {
      this.logger.error(`Failed to get file as Web File: ${fileId}`, error);
      return null;
    }
  }
}
