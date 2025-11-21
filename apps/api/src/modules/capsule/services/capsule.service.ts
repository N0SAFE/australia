import { Injectable, NotFoundException } from '@nestjs/common';
import { CapsuleRepository, type GetCapsulesInput } from '../repositories/capsule.repository';
import type { User } from '@repo/auth';
import { FileUploadService } from '@/core/modules/file-upload/file-upload.service';
import { FileMetadataService } from '@/modules/storage/services/file-metadata.service';
import { DatabaseService } from '@/core/modules/database/services/database.service';
import { capsuleMedia } from '@/config/drizzle/schema/capsule-media';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { capsuleCreateInput, capsuleUpdateInput } from '@repo/api-contracts';

// Service input types include media field (from API contract)
type CreateCapsuleInput = z.infer<typeof capsuleCreateInput>;
type UpdateCapsuleInput = z.infer<typeof capsuleUpdateInput>;

@Injectable()
export class CapsuleService {
  constructor(
    private readonly capsuleRepository: CapsuleRepository,
    private readonly fileUploadService: FileUploadService,
    private readonly fileMetadataService: FileMetadataService,
    private readonly databaseService: DatabaseService,
  ) {}

  /**
   * Upload a file, save to database, and create capsuleMedia junction record
   */
  private async uploadAndSaveFile(
    file: File,
    type: 'image' | 'video' | 'audio',
    contentMediaId: string,
    capsuleId: string,
    order: number
  ): Promise<string> {
    // File properties from multer
    const filename = file.name;
    const mimeType = file.type;
    const size = file.size;

    // Get file paths
    const absoluteFilePath = this.fileUploadService.getFilePath(filename, mimeType);
    const relativePath = this.fileUploadService.getRelativePath(mimeType, filename);

    // Save to database based on type
    let dbResult: { file: { id: string } };
    
    switch (type) {
      case 'image':
        dbResult = await this.fileMetadataService.createImageFile({
          filePath: relativePath,
          absoluteFilePath,
          filename,
          storedFilename: filename,
          mimeType,
          size,
        });
        break;
      
      case 'video':
        dbResult = await this.fileMetadataService.createVideoFile({
          filePath: relativePath,
          absoluteFilePath,
          filename,
          storedFilename: filename,
          mimeType,
          size,
        });
        break;
      
      case 'audio':
        dbResult = await this.fileMetadataService.createAudioFile({
          filePath: relativePath,
          absoluteFilePath,
          filename,
          storedFilename: filename,
          mimeType,
          size,
        });
        break;
    }

    const fileId = dbResult.file.id;

    // Create capsuleMedia junction record
    await this.databaseService.db
      .insert(capsuleMedia)
      .values({
        capsuleId,
        fileId,
        contentMediaId,
        type,
        order,
      });

    return fileId;
  }



  /**
   * Create a new capsule with media handling
   */
  async createCapsule(input: CreateCapsuleInput) {
    // Create capsule first to get ID
    const { media, ...capsuleData } = input;
    const capsule = await this.capsuleRepository.create(capsuleData);

    if (!capsule) {
      throw new Error('Failed to create capsule');
    }

    // Upload files and create capsuleMedia junction records
    if (media && media.added && media.added.length > 0) {
      for (let i = 0; i < media.added.length; i++) {
        const mediaItem = media.added[i];
        await this.uploadAndSaveFile(
          mediaItem.file,
          mediaItem.type,
          mediaItem.contentMediaId,
          capsule.id,
          i
        );
      }
    }

    return capsule;
  }

  /**
   * Get capsule by ID
   */
  async getCapsuleById(id: string) {
    const capsule = await this.capsuleRepository.findById(id);
    if (!capsule) {
      throw new NotFoundException(`Capsule with ID ${id} not found`);
    }
    return capsule;
  }

  /**
   * Get capsule by ID (nullable version for update/delete operations)
   */
  async findCapsuleById(id: string) {
    return await this.capsuleRepository.findById(id);
  }

  /**
   * Get all capsules with pagination
   */
  async getCapsules(input: GetCapsulesInput) {
    return await this.capsuleRepository.findMany(input);
  }

  /**
   * Get capsules by day
   */
  async getCapsulesByDay(day: string) {
    const capsules = await this.capsuleRepository.findByDay(day);
    return { capsules };
  }

  /**
   * Get capsules for specified month
   */
  async getCapsulesForMonth(month: string) {
    const capsules = await this.capsuleRepository.findByMonth(month);
    return { capsules };
  }

  /**
   * Get recent capsules for home page
   * Returns capsules from past week + all locked + all unread from past
   */
  async getRecentCapsules() {
    const capsules = await this.capsuleRepository.getRecent();
    return { capsules };
  }

  /**
   * Update capsule by ID with media handling
   */
  async updateCapsule(id: string, input: Omit<UpdateCapsuleInput, "id">) {
    const existingCapsule = await this.capsuleRepository.findById(id);
    if (!existingCapsule) {
      return null;
    }

    // Handle media deletion (remove capsuleMedia records not in kept list)
    if (input.media) {
      const keptContentMediaIds = new Set(input.media.kept || []);
      
      // Get existing capsuleMedia records for this capsule
      const existingMedia = await this.databaseService.db
        .select()
        .from(capsuleMedia)
        .where(eq(capsuleMedia.capsuleId, id));
      
      // Delete capsuleMedia records that are not in the kept list
      for (const media of existingMedia) {
        if (!keptContentMediaIds.has(media.contentMediaId)) {
          await this.databaseService.db
            .delete(capsuleMedia)
            .where(eq(capsuleMedia.id, media.id));
          // File will be cascade deleted if no other capsules reference it
        }
      }

      // Upload new files and create capsuleMedia records
      if (input.media.added && input.media.added.length > 0) {
        const currentMaxOrder = existingMedia.length > 0 
          ? Math.max(...existingMedia.map(m => m.order || 0))
          : -1;
        
        for (let i = 0; i < input.media.added.length; i++) {
          const mediaItem = input.media.added[i];
          await this.uploadAndSaveFile(
            mediaItem.file,
            mediaItem.type,
            mediaItem.contentMediaId,
            id,
            currentMaxOrder + i + 1
          );
        }
      }
    }

    // Update capsule (content already contains contentMediaId references)
    const { media, ...capsuleData } = input;
    return await this.capsuleRepository.update(id, capsuleData);
  }

  /**
   * Delete capsule by ID
   */
  async deleteCapsule(id: string) {
    const existingCapsule = await this.capsuleRepository.findById(id);
    if (!existingCapsule) {
      return null;
    }

    return await this.capsuleRepository.delete(id);
  }

  /**
   * Attempt to unlock a capsule with the provided unlock method
   * @param user - The user attempting to unlock (used for admin detection)
   */
  async unlockCapsule(input: {
    id: string;
    code?: string;
    voiceTranscript?: string;
    deviceAction?: 'shake' | 'tilt' | 'tap';
    apiResponse?: unknown;
  }, user?: User) {
    const capsule = await this.capsuleRepository.findById(input.id);
    
    if (!capsule) {
      return { success: false, message: 'Capsule not found' };
    }

    if (!capsule.isLocked) {
      return { success: false, message: 'Capsule is not locked' };
    }

    if (capsule.unlockedAt) {
      return { success: false, message: 'Capsule is already unlocked' };
    }

    // Validate unlock attempt based on lock type
    const lockConfig = capsule.lockConfig as { type: string; code?: string; phrase?: string; endpoint?: string } | null;
    
    if (!lockConfig) {
      return { success: false, message: 'Invalid lock configuration' };
    }

    let unlockSuccessful = false;

    switch (lockConfig.type) {
      case 'code': {
        if (input.code && lockConfig.code && input.code === lockConfig.code) {
          unlockSuccessful = true;
        }
        break;
      }

      case 'voice': {
        if (input.voiceTranscript && lockConfig.phrase) {
          // Case-insensitive comparison, trim whitespace
          const provided = input.voiceTranscript.toLowerCase().trim();
          const expected = lockConfig.phrase.toLowerCase().trim();
          unlockSuccessful = provided === expected;
        }
        break;
      }

      case 'device_shake':
      case 'device_tilt':
      case 'device_tap': {
        if (input.deviceAction) {
          const expectedAction = lockConfig.type.replace('device_', '');
          unlockSuccessful = input.deviceAction === expectedAction;
        }
        break;
      }

      case 'api': {
        // For API-based locks, validate the API response
        // This is a simple check - in production you'd want more robust validation
        if (input.apiResponse) {
          unlockSuccessful = true; // Simplified - actual implementation would validate response
        }
        break;
      }

      case 'time_based': {
        // For time-based locks, check if enough time has passed
        const delayMinutes = (lockConfig as { delayMinutes?: number }).delayMinutes ?? 0;
        const openingDate = new Date(capsule.openingDate);
        const now = new Date();
        const minutesPassed = (now.getTime() - openingDate.getTime()) / (1000 * 60);
        unlockSuccessful = minutesPassed >= delayMinutes;
        break;
      }

      default:
        return { success: false, message: 'Unknown lock type' };
    }

    if (unlockSuccessful) {
      // Check if user is admin - if so, preview mode (no DB modification)
      const isAdmin = user?.role === 'admin' || user?.role?.includes('admin');
      
      if (isAdmin) {
        return {
          success: true,
          message: 'Capsule unlock validated (admin preview - no database change)',
          capsule: capsule,
        };
      }
      
      // Normal mode: unlock and update database
      const unlockedCapsule = await this.capsuleRepository.unlock(input.id);
      return {
        success: true,
        message: 'Capsule unlocked successfully',
        capsule: unlockedCapsule,
      };
    }

    return { success: false, message: 'Unlock attempt failed' };
  }

  /**
   * Mark a capsule as opened (first view)
   * @param user - The user opening the capsule (used for admin detection)
   */
  async markCapsuleAsOpened(id: string, user?: User) {
    const capsule = await this.capsuleRepository.findById(id);
    
    if (!capsule) {
      return { success: false, message: 'Capsule not found' };
    }

    if (capsule.openedAt) {
      return { success: false, message: 'Capsule is already marked as opened' };
    }

    // Check if user is admin - if so, preview mode (no DB modification)
    const isAdmin = user?.role === 'admin' || user?.role?.includes('admin');
    
    if (isAdmin) {
      return {
        success: true,
        message: 'Capsule open validated (admin preview - no database change)',
        capsule: capsule,
      };
    }
    
    // Normal mode: mark as opened and update database
    const openedCapsule = await this.capsuleRepository.markAsOpened(id);
    return {
      success: true,
      message: 'Capsule marked as opened successfully',
      capsule: openedCapsule,
    };
  }
}
