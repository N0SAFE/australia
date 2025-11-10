import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentRepository } from '../repositories/content.repository';
import { StorageService } from '@/modules/storage/services/storage.service';

@Injectable()
export class ContentService {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly storageService: StorageService,
  ) {}

  async findById(id: string, type: 'text' | 'image' | 'video' | 'audio') {
    const content = await this.contentRepository.findById(id, type);
    
    if (!content) {
      throw new NotFoundException(`Content with id ${id} and type ${type} not found`);
    }
    
    return content;
  }

  async getFileStream(id: string, type: 'image' | 'video' | 'audio') {
    const content = await this.findById(id, type);
    
    if (!content.filePath) {
      throw new NotFoundException('File path not found for content');
    }

    const exists = await this.storageService.fileExists(content.filename);
    if (!exists) {
      throw new NotFoundException('File not found on disk');
    }

    return {
      filePath: this.storageService.getFilePath(content.filename),
      mimeType: content.mimeType,
      filename: content.filename,
    };
  }

  async createText(textContent: string) {
    return this.contentRepository.createText({
      textContent,
    });
  }

  async createImage(data: {
    filePath: string;
    filename: string;
    mimeType: string;
    size: number;
    width?: number;
    height?: number;
    alt?: string;
  }) {
    return this.contentRepository.createImage(data);
  }

  async createVideo(data: {
    filePath: string;
    filename: string;
    mimeType: string;
    size: number;
    duration?: number;
    width?: number;
    height?: number;
    thumbnailPath?: string;
  }) {
    return this.contentRepository.createVideo(data);
  }

  async createAudio(data: {
    filePath: string;
    filename: string;
    mimeType: string;
    size: number;
    duration?: number;
    artist?: string;
    title?: string;
  }) {
    return this.contentRepository.createAudio(data);
  }

  async delete(id: string, type: 'text' | 'image' | 'video' | 'audio') {
    const content = await this.findById(id, type);
    
    // Delete file from disk if it's a file-based content type
    if (type !== 'text' && content.filename) {
      try {
        await this.storageService.deleteFile(content.filename);
      } catch (error) {
        // Log error but continue with database deletion
        console.error('Failed to delete file from disk:', error);
      }
    }
    
    await this.contentRepository.delete(id, type);
  }
}
