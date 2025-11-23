import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { EnvService } from '@/config/env/env.service';

@Injectable()
export class StorageService {
  private readonly uploadDir: string;

  constructor(private readonly envService: EnvService) {
    this.uploadDir = this.envService.get('UPLOADS_DIR');
    console.log('[StorageService] Upload directory configured:', this.uploadDir);
  }

  /**
   * Get the full file path using feature-based organization
   * Files stored as: uploads/{feature}/{fileId}.{ext}
   * @param fileId - The unique file identifier (UUID)
   * @param feature - The feature/module (capsules, presentations, profiles, etc.)
   * @param extension - Optional file extension (e.g., 'jpg', 'mp4')
   */
  getFilePath(fileId: string, feature: string, extension?: string): string {
    const filename = extension ? `${fileId}.${extension}` : fileId;
    const filePath = path.join(this.uploadDir, feature, filename);
    
    console.log('[StorageService] getFilePath:', { fileId, feature, extension, uploadDir: this.uploadDir, filePath });
    return filePath;
  }

  /**
   * Check if file exists
   * @param fileId - The unique file identifier
   * @param feature - The feature/module name
   * @param extension - Optional file extension
   */
  async fileExists(fileId: string, feature: string, extension?: string): Promise<boolean> {
    const filePath = this.getFilePath(fileId, feature, extension);
    try {
      await fs.access(filePath);
      console.log('[StorageService] fileExists: true -', filePath);
      return true;
    } catch (error) {
      console.log('[StorageService] fileExists: false -', filePath, 'Error:', (error as Error).message);
      return false;
    }
  }

  /**
   * Delete a file
   * @param fileId - The unique file identifier
   * @param feature - The feature/module name
   * @param extension - Optional file extension
   */
  async deleteFile(fileId: string, feature: string, extension?: string): Promise<void> {
    const filePath = this.getFilePath(fileId, feature, extension);
    await fs.unlink(filePath);
  }

  /**
   * Get file metadata
   * @param fileId - The unique file identifier
   * @param feature - The feature/module name
   * @param extension - File extension (e.g., 'jpg', 'mp4')
   */
  async getFileMetadata(fileId: string, feature: string, extension: string): Promise<{ size: number; mimeType: string }> {
    const filePath = this.getFilePath(fileId, feature, extension);
    const stats = await fs.stat(filePath);
    const ext = `.${extension}`.toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
    };

    return {
      size: stats.size,
      mimeType: mimeTypes[ext] || 'application/octet-stream',
    };
  }

  /**
   * Save a File object to disk
   * @param file - The File object to save
   * @param fileId - The unique file identifier (UUID)
   * @param feature - The feature/module name (capsules, presentations, etc.)
   * @param extension - File extension (e.g., 'jpg', 'mp4')
   */
  async saveFile(file: File, fileId: string, feature: string, extension: string): Promise<string> {
    const filePath = this.getFilePath(fileId, feature, extension);
    const featurePath = path.join(this.uploadDir, feature);
    
    // Ensure feature directory exists
    await fs.mkdir(featurePath, { recursive: true });
    
    // Convert File to Buffer and save
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    
    console.log('[StorageService] File saved:', { fileId, feature, extension, filePath, size: file.size });
    return filePath;
  }

  /**
   * Read file and return as File object
   * @param fileId - The unique file identifier
   * @param feature - The feature/module name
   * @param extension - File extension
   * @param originalFilename - The original filename to set on the File object
   */
  async readFile(fileId: string, feature: string, extension: string, originalFilename: string): Promise<File> {
    const filePath = this.getFilePath(fileId, feature, extension);
    const buffer = await fs.readFile(filePath);
    const metadata = await this.getFileMetadata(fileId, feature, extension);
    
    // Create a File object from buffer with the original filename
    const file = new File([buffer], originalFilename, { type: metadata.mimeType });
    console.log('[StorageService] File read:', { fileId, feature, extension, originalFilename, filePath, size: file.size });
    return file;
  }
}
