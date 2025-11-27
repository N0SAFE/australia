import { Inject, Injectable } from '@nestjs/common';
import type { FileStats, IStorageProvider } from '../interfaces/storage-provider.interface';
import { FileService } from './file.service';

/**
 * File Metadata Service
 * 
 * Handles file information retrieval:
 * - File size
 * - File statistics (created, modified, MIME type)
 * - File existence checks
 * - MIME type detection
 * 
 * Note: Uses fileId for all operations and delegates to FileService for file retrieval
 */
@Injectable()
export class FileMetadataService {
  constructor(
    @Inject('STORAGE_PROVIDER')
    private readonly storageProvider: IStorageProvider,
    private readonly fileService: FileService,
  ) {}

  /**
   * Get file size in bytes by fileId
   * 
   * @param fileId - The file ID
   */
  async getFileSize(fileId: string): Promise<number> {
    const file = await this.fileService.getFileById(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }
    return file.size;
  }

  /**
   * Get comprehensive file statistics by fileId
   * Includes size, MIME type, and timestamps
   * 
   * @param fileId - The file ID
   */
  async getFileStats(fileId: string): Promise<FileStats> {
    const file = await this.fileService.getFileById(fileId);
    if (!file?.namespace || !file.storedFilename) {
      throw new Error(`File not found or incomplete: ${fileId}`);
    }
    
    const relativePath = this.fileService.buildRelativePath(file.namespace, file.storedFilename);
    return this.storageProvider.getStats(relativePath);
  }

  /**
   * Check if a file exists in storage by fileId
   * 
   * @param fileId - The file ID
   */
  async fileExists(fileId: string): Promise<boolean> {
    try {
      const file = await this.fileService.getFileById(fileId);
      if (!file?.namespace || !file.storedFilename) {
        return false;
      }
      
      const relativePath = this.fileService.buildRelativePath(file.namespace, file.storedFilename);
      return await this.storageProvider.exists(relativePath);
    } catch {
      return false;
    }
  }

  /**
   * Get MIME type for a file by fileId
   * 
   * @param fileId - The file ID
   */
  async getMimeType(fileId: string): Promise<string> {
    const file = await this.fileService.getFileById(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }
    return file.mimeType;
  }

  /**
   * Get file modification date by fileId
   * 
   * @param fileId - The file ID
   */
  async getModifiedDate(fileId: string): Promise<Date> {
    const stats = await this.getFileStats(fileId);
    return stats.modifiedAt;
  }

  /**
   * Get file creation date by fileId
   * 
   * @param fileId - The file ID
   */
  async getCreatedDate(fileId: string): Promise<Date> {
    const stats = await this.getFileStats(fileId);
    return stats.createdAt;
  }
}
