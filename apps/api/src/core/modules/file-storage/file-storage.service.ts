import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { UPLOADS_DIR } from '@/config/multer.config';

/**
 * Core file storage service
 * Handles file uploads and generates URLs
 * Can be used across multiple modules
 */
@Injectable()
export class FileStorageService {
  /**
   * Process uploaded file and return metadata
   */
  processUploadedFile(file: Express.Multer.File): {
    url: string;
    filePath: string;
    filename: string;
    mimetype: string;
    size: number;
  } {

    // Determine the subdirectory based on mimetype
    let subdir = 'images';
    if (file.mimetype.startsWith('video/')) {
      subdir = 'videos';
    } else if (file.mimetype.startsWith('audio/')) {
      subdir = 'audio';
    }

    // Generate the URL path (for streaming/serving)
    const url = `/uploads/${subdir}/${file.filename}`;
    
    // Generate the file path (for file system access)
    const filePath = `${subdir}/${file.filename}`;

    return {
      url,
      filePath,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  /**
   * Get absolute file system path
   */
  getAbsolutePath(filePath: string): string {
    return join(UPLOADS_DIR, filePath);
  }

  /**
   * Generate URL from file path
   */
  getUrl(filePath: string): string {
    return `/uploads/${filePath}`;
  }
}
