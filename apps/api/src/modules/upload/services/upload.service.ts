import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { UPLOADS_DIR } from '@/config/multer.config';

@Injectable()
export class UploadService {
  async uploadFile(file: Express.Multer.File): Promise<{
    url: string;
    filename: string;
    mimetype: string;
    size: number;
  }> {
    if (!file) {
      throw new Error('No file provided');
    }

    // Determine the subdirectory based on mimetype
    let subdir = 'images';
    if (file.mimetype.startsWith('video/')) {
      subdir = 'videos';
    } else if (file.mimetype.startsWith('audio/')) {
      subdir = 'audio';
    }

    // Generate the URL path
    const url = `/uploads/${subdir}/${file.filename}`;

    return {
      url,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
    };
  }
}
