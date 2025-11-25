import { Inject, Injectable } from '@nestjs/common';
import type { ReadStream } from 'fs';
import { LazyFile } from '@mjackson/lazy-file';
import type { IStorageProvider, StreamOptions } from '../interfaces/storage-provider.interface';
import { FileService } from './file.service';

/**
 * File Stream Service
 * 
 * Handles stream creation and management:
 * - Create Node.js ReadStreams
 * - Create LazyFile wrappers for ORPC
 * - Stream lifecycle management
 * 
 * Note: Uses fileId for all operations and delegates to FileService for file retrieval
 */
@Injectable()
export class FileStreamService {
  constructor(
    @Inject('STORAGE_PROVIDER')
    private readonly storageProvider: IStorageProvider,
    private readonly fileService: FileService,
  ) {}

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
    // Get file metadata from FileService
    const file = await this.fileService.getFileById(fileId);
    if (!file?.namespace || !file.storedFilename) {
      throw new Error(`File not found or incomplete: ${fileId}`);
    }

    // Build relative path using FileService
    const relativePath = this.fileService.buildRelativePath(file.namespace, file.storedFilename);
    
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
    // Get file metadata from FileService
    const file = await this.fileService.getFileById(fileId);
    if (!file?.namespace || !file.storedFilename) {
      throw new Error(`File not found or incomplete: ${fileId}`);
    }

    // Build relative path using FileService
    const relativePath = this.fileService.buildRelativePath(file.namespace, file.storedFilename);
    
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
