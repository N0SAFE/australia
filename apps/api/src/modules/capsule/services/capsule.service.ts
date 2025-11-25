import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { CapsuleRepository, type GetCapsulesInput } from '../repositories/capsule.repository';
import type { User } from '@repo/auth';
import { FileService } from '@/core/modules/file/services/file.service';
import { StorageEventService } from '@/modules/storage/events/storage.event';
import { VideoProcessingService } from '@/core/modules/video-processing/services/video-processing.service';
import { DatabaseService } from '@/core/modules/database/services/database.service';
import { capsuleMedia } from '@/config/drizzle/schema/capsule-media';
import { capsule as capsuleTable } from '@/config/drizzle/schema/capsule';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { capsuleCreateInput, capsuleUpdateInput } from '@repo/api-contracts';
import { CapsuleEventService } from '../events/capsule.event';

// Service input types include media field (from API contract)
type CreateCapsuleInput = z.infer<typeof capsuleCreateInput>;
type UpdateCapsuleInput = z.infer<typeof capsuleUpdateInput>;

@Injectable()
export class CapsuleService {
  private readonly logger = new Logger(CapsuleService.name);

  constructor(
    private readonly capsuleRepository: CapsuleRepository,
    private readonly fileService: FileService,
    private readonly storageEventService: StorageEventService,
    private readonly videoProcessingService: VideoProcessingService,
    private readonly databaseService: DatabaseService,
    private readonly capsuleEventService: CapsuleEventService,
  ) {}

  /**
   * Upload a file, save to database, and create capsuleMedia junction record
   * For video files, this also triggers video processing in the background
   * Uses core FileService for integrated DB + filesystem operations
   */
  private async uploadAndSaveFile(
    file: File,
    type: 'image' | 'video' | 'audio',
    contentMediaId: string,
    capsuleId: string,
    order: number
  ): Promise<string> {
    // Use core FileService for integrated upload (DB + filesystem in one operation)
    let result: { fileId: string; filename: string; size: number; mimeType: string; filePath: string; absolutePath: string; namespace: string[]; storedFilename: string };
    
    // Upload file using core FileService with 'capsules' namespace
    switch (type) {
      case 'image':
        result = await this.fileService.uploadImage(
          file,
          ['capsules'],
          undefined // uploadedBy - optional for capsule uploads
        );
        break;
      
      case 'video':
        result = await this.fileService.uploadVideo(
          file,
          ['capsules'],
          undefined // uploadedBy - optional for capsule uploads
        );
        break;
      
      case 'audio':
        result = await this.fileService.uploadAudio(
          file,
          ['capsules'],
          undefined // uploadedBy - optional for capsule uploads
        );
        break;
    }

    const fileId = result.fileId;
    const absolutePath = result.absolutePath;

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

    // If this is a video file, trigger video processing in the background
    if (type === 'video') {
      this.logger.log(`Starting video processing for capsule ${capsuleId}, fileId: ${fileId}`);
      
      // Get video metadata for processing
      const videoResult = await this.fileService.getVideoByFileId(fileId);
      if (!videoResult?.videoMetadata) {
        this.logger.error(`Failed to retrieve video metadata for fileId: ${fileId}`);
        return fileId;
      }

      const videoMetadataId = videoResult.videoMetadata.id;

      // Start async video processing in background (non-blocking)
      // This is the same pattern used in StorageController.uploadVideo
      this.storageEventService
        .startProcessing("videoProcessing", { fileId }, ({ abortSignal, emit }) => {
          return this.videoProcessingService
            .processVideo(
              absolutePath,
              (progress, message) => {
                emit({
                  progress,
                  message,
                  timestamp: new Date().toISOString(),
                });
              },
              abortSignal
            )
            .then(async (metadata) => {
              // SUCCESS: Update database to mark as processed
              await this.fileService.updateVideoProcessingStatus(
                videoMetadataId,
                {
                  isProcessed: true,
                  processingProgress: 100,
                  processingError: undefined,
                }
              );

              // Emit final completion event
              emit({
                progress: 100,
                message: "Processing complete",
                metadata: {
                  duration: metadata.duration,
                  width: metadata.width,
                  height: metadata.height,
                  codec: metadata.codec,
                },
                timestamp: new Date().toISOString(),
              });
              
              this.logger.log(`Video processing completed for capsule ${capsuleId}, fileId: ${fileId}`);
            })
            .catch(async (error: unknown) => {
              const err = error instanceof Error ? error : new Error(String(error));

              // Check if this was an abort
              if (abortSignal?.aborted || err.message.includes("aborted")) {
                this.logger.warn(`Video processing aborted for capsule ${capsuleId}, fileId: ${fileId}`);
                return; // Don't mark as error in DB for aborts
              }

              // FAILURE: Update database with error
              this.logger.error(`Video processing failed for capsule ${capsuleId}, fileId: ${fileId}: ${err.message}`);
              
              await this.fileService.updateVideoProcessingStatus(
                videoMetadataId,
                {
                  isProcessed: false,
                  processingProgress: 0,
                  processingError: err.message,
                }
              );

              // Emit final completion event with error (without 'error' property)
              emit({
                progress: 0,
                message: `Processing failed: ${err.message}`,
                timestamp: new Date().toISOString(),
              });
            });
        })
        .catch((error: unknown) => {
          // If startProcessing itself fails, log it but don't block the upload
          this.logger.error(`Failed to start video processing for capsule ${capsuleId}, fileId: ${fileId}:`, error);
        });
    }

    return fileId;
  }



  /**
   * Create a new capsule with media handling
   * Optionally accepts operationId for progress tracking
   */
  async createCapsule(input: CreateCapsuleInput & { operationId?: string }) {
    const { media = { kept: [], added: [] }, operationId, ...capsuleData } = input;
    
    try {
      // Emit creating_capsule stage
      if (operationId) {
        this.capsuleEventService.emit('uploadProgress', { operationId }, {
          progress: 0,
          stage: 'creating_capsule',
          message: 'Creating capsule...',
          timestamp: new Date().toISOString(),
        });
      }
      
      // Create capsule first to get ID
      const capsule = await this.capsuleRepository.create(capsuleData);

      if (!capsule) {
        throw new Error('Failed to create capsule');
      }

      // Emit progress with capsule ID
      if (operationId) {
        this.capsuleEventService.emit('uploadProgress', { operationId }, {
          capsuleId: capsule.id,
          progress: 10,
          stage: 'creating_capsule',
          message: 'Capsule created, preparing uploads...',
          timestamp: new Date().toISOString(),
        });
      }

      // Upload files and create capsuleMedia junction records
      if (media.added.length > 0) {
        const totalFiles = media.added.length;
        
        // Emit uploading_files stage
        if (operationId) {
          this.capsuleEventService.emit('uploadProgress', { operationId }, {
            capsuleId: capsule.id,
            progress: 15,
            stage: 'uploading_files',
            message: `Uploading ${String(totalFiles)} file(s)...`,
            filesCompleted: 0,
            totalFiles,
            timestamp: new Date().toISOString(),
          });
        }

        for (let i = 0; i < media.added.length; i++) {
          const mediaItem = media.added[i];
          if (!mediaItem) continue;
          
          // Emit progress for current file
          if (operationId) {
            const fileProgress = 15 + ((i / totalFiles) * 70); // 15-85% for file uploads
            this.capsuleEventService.emit('uploadProgress', { operationId }, {
              capsuleId: capsule.id,
              progress: Math.round(fileProgress),
              stage: 'uploading_files',
              message: `Uploading ${mediaItem.file.name}...`,
              currentFile: mediaItem.file.name,
              filesCompleted: i,
              totalFiles,
              timestamp: new Date().toISOString(),
            });
          }
          
          await this.uploadAndSaveFile(
            mediaItem.file,
            mediaItem.type,
            mediaItem.contentMediaId,
            capsule.id,
            i
          );
          
          // Emit completion for this file
          if (operationId) {
            const fileProgress = 15 + (((i + 1) / totalFiles) * 70);
            this.capsuleEventService.emit('uploadProgress', { operationId }, {
              capsuleId: capsule.id,
              progress: Math.round(fileProgress),
              stage: 'uploading_files',
              message: `Uploaded ${String(i + 1)} of ${String(totalFiles)} file(s)`,
              filesCompleted: i + 1,
              totalFiles,
              timestamp: new Date().toISOString(),
            });
          }
        }
      }

      // Emit finalizing stage
      if (operationId) {
        this.capsuleEventService.emit('uploadProgress', { operationId }, {
          capsuleId: capsule.id,
          progress: 90,
          stage: 'finalizing',
          message: 'Finalizing capsule...',
          timestamp: new Date().toISOString(),
        });
      }

      // Update capsule status to completed directly via database
      if (operationId) {
        await this.databaseService.db
          .update(capsuleTable)
          .set({
            uploadStatus: 'completed',
            uploadProgress: 100,
            uploadMessage: 'Upload completed successfully',
            operationId: operationId,
            updatedAt: new Date(),
          })
          .where(eq(capsuleTable.id, capsule.id));
      }

      // Emit completed stage
      if (operationId) {
        this.capsuleEventService.emit('uploadProgress', { operationId }, {
          capsuleId: capsule.id,
          progress: 100,
          stage: 'completed',
          message: 'Capsule created successfully!',
          timestamp: new Date().toISOString(),
        });
      }

      return capsule;
    } catch (error) {
      // Emit failed stage on error
      if (operationId) {
        this.capsuleEventService.emit('uploadProgress', { operationId }, {
          progress: 0,
          stage: 'failed',
          message: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString(),
        });
      }
      
      throw error;
    }
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
   * Optionally accepts operationId for progress tracking
   */
  async updateCapsule(id: string, input: Omit<UpdateCapsuleInput, "id"> & { operationId?: string }) {
    const existingCapsule = await this.capsuleRepository.findById(id);
    if (!existingCapsule) {
      return null;
    }

    const { operationId, media, ...capsuleData } = input;

    try {
      // Emit creating_capsule stage (preparing update)
      if (operationId) {
        this.capsuleEventService.emit('uploadProgress', { operationId }, {
          capsuleId: id,
          progress: 0,
          stage: 'creating_capsule',
          message: 'Preparing capsule update...',
          timestamp: new Date().toISOString(),
        });
      }

      // Handle media deletion (remove capsuleMedia records not in kept list)
      if (media) {
        const keptContentMediaIds = new Set(media.kept);
        
        // Get existing capsuleMedia records for this capsule
        const existingMedia = await this.databaseService.db
          .select()
          .from(capsuleMedia)
          .where(eq(capsuleMedia.capsuleId, id));
        
        // Emit progress
        if (operationId) {
          this.capsuleEventService.emit('uploadProgress', { operationId }, {
            capsuleId: id,
            progress: 10,
            stage: 'creating_capsule',
            message: 'Cleaning up removed media...',
            timestamp: new Date().toISOString(),
          });
        }
        
        // Delete capsuleMedia records that are not in the kept list
        for (const mediaRecord of existingMedia) {
          if (!keptContentMediaIds.has(mediaRecord.contentMediaId)) {
            await this.databaseService.db
              .delete(capsuleMedia)
              .where(eq(capsuleMedia.id, mediaRecord.id));
            // File will be cascade deleted if no other capsules reference it
          }
        }

        // Upload new files and create capsuleMedia records
        if (media.added.length > 0) {
          const totalFiles = media.added.length;
          const currentMaxOrder = existingMedia.length > 0 
            ? Math.max(...existingMedia.map(m => m.order ?? 0))
            : -1;
          
          // Emit uploading_files stage
          if (operationId) {
            this.capsuleEventService.emit('uploadProgress', { operationId }, {
              capsuleId: id,
              progress: 15,
              stage: 'uploading_files',
              message: `Uploading ${String(totalFiles)} new file(s)...`,
              filesCompleted: 0,
              totalFiles,
              timestamp: new Date().toISOString(),
            });
          }
          
          for (let i = 0; i < media.added.length; i++) {
            const mediaItem = media.added[i];
            if (!mediaItem) continue;
            
            // Emit progress for current file
            if (operationId) {
              const fileProgress = 15 + ((i / totalFiles) * 70); // 15-85% for file uploads
              this.capsuleEventService.emit('uploadProgress', { operationId }, {
                capsuleId: id,
                progress: Math.round(fileProgress),
                stage: 'uploading_files',
                message: `Uploading ${mediaItem.file.name}...`,
                currentFile: mediaItem.file.name,
                filesCompleted: i,
                totalFiles,
                timestamp: new Date().toISOString(),
              });
            }
            
            await this.uploadAndSaveFile(
              mediaItem.file,
              mediaItem.type,
              mediaItem.contentMediaId,
              id,
              currentMaxOrder + i + 1
            );
            
            // Emit completion for this file
            if (operationId) {
              const fileProgress = 15 + (((i + 1) / totalFiles) * 70);
              this.capsuleEventService.emit('uploadProgress', { operationId }, {
                capsuleId: id,
                progress: Math.round(fileProgress),
                stage: 'uploading_files',
                message: `Uploaded ${String(i + 1)} of ${String(totalFiles)} file(s)`,
                filesCompleted: i + 1,
                totalFiles,
                timestamp: new Date().toISOString(),
              });
            }
          }
        }
      }

      // Emit finalizing stage
      if (operationId) {
        this.capsuleEventService.emit('uploadProgress', { operationId }, {
          capsuleId: id,
          progress: 90,
          stage: 'finalizing',
          message: 'Finalizing update...',
          timestamp: new Date().toISOString(),
        });
      }

      // Update capsule (content already contains contentMediaId references)
      const updatedCapsule = await this.capsuleRepository.update(id, capsuleData);

      // Update capsule status to completed directly via database
      if (operationId) {
        await this.databaseService.db
          .update(capsuleTable)
          .set({
            uploadStatus: 'completed',
            uploadProgress: 100,
            uploadMessage: 'Update completed successfully',
            operationId: operationId,
            updatedAt: new Date(),
          })
          .where(eq(capsuleTable.id, id));
      }

      // Emit completed stage
      if (operationId) {
        this.capsuleEventService.emit('uploadProgress', { operationId }, {
          capsuleId: id,
          progress: 100,
          stage: 'completed',
          message: 'Capsule updated successfully!',
          timestamp: new Date().toISOString(),
        });
      }

      return updatedCapsule;
    } catch (error) {
      // Emit failed stage on error
      if (operationId) {
        this.capsuleEventService.emit('uploadProgress', { operationId }, {
          capsuleId: id,
          progress: 0,
          stage: 'failed',
          message: `Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString(),
        });
      }
      
      throw error;
    }
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
