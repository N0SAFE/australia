import { Injectable, NotFoundException } from '@nestjs/common';
import { CapsuleRepository, type GetCapsulesInput } from '../repositories/capsule.repository';
import type { User } from '@repo/auth';
import { FileUploadService } from '@/core/modules/file-upload/file-upload.service';
import { FileMetadataService } from '@/modules/storage/services/file-metadata.service';
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
  ) {}

  /**
   * Upload a file and save to database
   */
  private async uploadAndSaveFile(file: File, type: 'image' | 'video' | 'audio'): Promise<string> {
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

    return dbResult.file.id;
  }

  /**
   * Replace uniqueId references in Plate.js content with actual fileIds
   */
  private replaceUniqueIdsInContent(content: string, uniqueIdToFileIdMap: Map<string, string>): string {
    try {
      const plateData = JSON.parse(content);
      
      // Recursively traverse Plate.js content tree
      const replaceInNode = (node: unknown): unknown => {
        if (typeof node !== 'object' || node === null) {
          return node;
        }

        if (Array.isArray(node)) {
          return node.map(replaceInNode);
        }

        const obj = node as Record<string, unknown>;
        const newObj: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(obj)) {
          // Check for url properties containing uniqueIds
          if (key === 'url' && typeof value === 'string') {
            // Check if the URL contains a uniqueId
            for (const [uniqueId, fileId] of uniqueIdToFileIdMap.entries()) {
              if (value.includes(uniqueId)) {
                // Replace uniqueId with fileId in URL
                newObj[key] = value.replace(uniqueId, fileId);
                continue;
              }
            }
            newObj[key] = value;
          } else if (typeof value === 'object' && value !== null) {
            newObj[key] = replaceInNode(value);
          } else {
            newObj[key] = value;
          }
        }

        return newObj;
      };

      const updatedPlateData = replaceInNode(plateData);
      return JSON.stringify(updatedPlateData);
    } catch (error) {
      console.error('Error replacing uniqueIds in content:', error);
      return content; // Return original if parsing fails
    }
  }

  /**
   * Create a new capsule with media handling
   */
  async createCapsule(input: CreateCapsuleInput) {
    // Handle media uploads if provided
    const uniqueIdToFileIdMap = new Map<string, string>();
    
    if (input.media && input.media.added && input.media.added.length > 0) {
      // Upload all new files
      for (const mediaItem of input.media.added) {
        const fileId = await this.uploadAndSaveFile(mediaItem.file, mediaItem.type);
        uniqueIdToFileIdMap.set(mediaItem.uniqueId, fileId);
      }
    }

    // Replace uniqueIds in content with actual fileIds
    const processedContent = uniqueIdToFileIdMap.size > 0
      ? this.replaceUniqueIdsInContent(input.content, uniqueIdToFileIdMap)
      : input.content;

    // Create capsule with processed content
    // Omit media field as it's handled separately
    const { media, ...capsuleData } = input;
    
    return await this.capsuleRepository.create({
      ...capsuleData,
      content: processedContent,
    });
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

    // Handle media uploads if provided
    const uniqueIdToFileIdMap = new Map<string, string>();
    
    if (input.media && input.media.added && input.media.added.length > 0) {
      // Upload all new files
      for (const mediaItem of input.media.added) {
        const fileId = await this.uploadAndSaveFile(mediaItem.file, mediaItem.type);
        uniqueIdToFileIdMap.set(mediaItem.uniqueId, fileId);
      }
    }

    // Replace uniqueIds in content with actual fileIds (if content is being updated)
    let processedContent = input.content;
    if (input.content && uniqueIdToFileIdMap.size > 0) {
      processedContent = this.replaceUniqueIdsInContent(input.content, uniqueIdToFileIdMap);
    }

    // Update capsule with processed content
    // Omit media field as it's handled separately
    const { media, ...capsuleData } = input;
    
    return await this.capsuleRepository.update(id, {
      ...capsuleData,
      content: processedContent,
    });
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
