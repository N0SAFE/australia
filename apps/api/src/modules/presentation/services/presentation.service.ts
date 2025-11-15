import { Injectable, NotFoundException } from '@nestjs/common';
import { PresentationRepository, type PresentationVideoRecord } from '../repositories/presentation.repository';
import { FileStorageService } from '@/core/modules/file-storage/file-storage.service';
import { StorageService } from '@/modules/storage/services/storage.service';

@Injectable()
export class PresentationService {
  constructor(
    private readonly presentationRepository: PresentationRepository,
    private readonly fileStorageService: FileStorageService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Upload or replace presentation video
   */
  async uploadVideo(file: Express.Multer.File): Promise<PresentationVideoRecord & { url: string }> {
    // Process file upload
    const fileData = this.fileStorageService.processUploadedFile(file);

    // Get current video to delete old file
    const currentVideo = await this.presentationRepository.findCurrent();
    
    // Delete old file if exists
    if (currentVideo?.filePath) {
      try {
        await this.storageService.deleteFile(currentVideo.filePath);
      } catch (error) {
        // Ignore deletion errors - continue with upload
        console.warn('Failed to delete old presentation video:', error);
      }
    }

    // Save to database
    const video = await this.presentationRepository.upsert({
      filePath: fileData.filePath,
      filename: fileData.filename,
      mimeType: fileData.mimetype,
      size: fileData.size,
    });

    return {
      ...video,
      url: fileData.url,
    };
  }

  /**
   * Get current presentation video
   */
  async getCurrentVideo(): Promise<(PresentationVideoRecord & { url: string }) | null> {
    const video = await this.presentationRepository.findCurrent();

    if (!video) {
      return null;
    }

    return {
      ...video,
      url: this.fileStorageService.getUrl(video.filePath),
    };
  }

  /**
   * Delete presentation video
   */
  async deleteVideo() {
    const video = await this.presentationRepository.findCurrent();

    if (!video) {
      throw new NotFoundException('No presentation video found');
    }

    // Delete file from storage
    await this.storageService.deleteFile(video.filePath);

    // Delete from database
    await this.presentationRepository.delete();
  }

  /**
   * Get video stream path for serving
   */
  async getVideoPath(): Promise<string> {
    const video = await this.presentationRepository.findCurrent();

    if (!video) {
      throw new NotFoundException('No presentation video found');
    }

    return this.fileStorageService.getAbsolutePath(video.filePath);
  }
}
