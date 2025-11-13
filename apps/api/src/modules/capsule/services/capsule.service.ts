import { Injectable, NotFoundException } from '@nestjs/common';
import { CapsuleRepository, type CreateCapsuleInput, type UpdateCapsuleInput, type GetCapsulesInput } from '../repositories/capsule.repository';
import type { User } from '@repo/auth';

@Injectable()
export class CapsuleService {
  constructor(private readonly capsuleRepository: CapsuleRepository) {}

  /**
   * Create a new capsule
   */
  async createCapsule(input: CreateCapsuleInput) {
    return await this.capsuleRepository.create(input);
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
   * Update capsule by ID
   */
  async updateCapsule(id: string, input: Omit<UpdateCapsuleInput, "id">) {
    const existingCapsule = await this.capsuleRepository.findById(id);
    if (!existingCapsule) {
      return null;
    }

    return await this.capsuleRepository.update(id, input);
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
