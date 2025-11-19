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
   * Get the full file path - checks subdirectories
   */
  getFilePath(filename: string): string {
    // Determine subdirectory based on filename prefix
    let subdir = '';
    if (filename.startsWith('image-')) {
      subdir = 'images';
    } else if (filename.startsWith('video-')) {
      subdir = 'videos';
    } else if (filename.startsWith('audio-')) {
      subdir = 'audio';
    }
    
    const filePath = subdir 
      ? path.join(this.uploadDir, subdir, filename)
      : path.join(this.uploadDir, filename);
    
    console.log('[StorageService] getFilePath:', { filename, uploadDir: this.uploadDir, subdir, filePath });
    return filePath;
  }

  /**
   * Check if file exists
   */
  async fileExists(filename: string): Promise<boolean> {
    const filePath = this.getFilePath(filename);
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
   */
  async deleteFile(filename: string): Promise<void> {
    const filePath = this.getFilePath(filename);
    await fs.unlink(filePath);
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(filename: string): Promise<{ size: number; mimeType: string }> {
    const filePath = this.getFilePath(filename);
    const stats = await fs.stat(filePath);
    const ext = path.extname(filename).toLowerCase();
    
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
   */
  async saveFile(file: File, filename: string): Promise<string> {
    const filePath = this.getFilePath(filename);
    
    // Ensure directory exists
    await fs.mkdir(this.uploadDir, { recursive: true });
    
    // Convert File to Buffer and save
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    
    console.log('[StorageService] File saved:', { filename, filePath, size: file.size });
    return filePath;
  }

  /**
   * Read file and return as File object
   */
  async readFile(filename: string): Promise<File> {
    const filePath = this.getFilePath(filename);
    const buffer = await fs.readFile(filePath);
    const metadata = await this.getFileMetadata(filename);
    
    // Create a File object from buffer
    const file = new File([buffer], filename, { type: metadata.mimeType });
    console.log('[StorageService] File read:', { filename, filePath, size: file.size });
    return file;
  }
}
