import { Controller } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { capsuleContract } from '@repo/api-contracts';
import { CapsuleService } from '../services/capsule.service';
import { CapsuleEventService } from '../events/capsule.event';
import { StorageEventService } from '../../storage/events/storage.event';
import { AllowAnonymous, Session as SessionDecorator } from '../../../core/modules/auth/decorators/decorators';
import { combineAsyncIterators } from '../../../core/utils/async-iterators';
import type { Session } from '@repo/auth';

@Controller()
export class CapsuleController {
  constructor(
    private readonly capsuleService: CapsuleService,
    private readonly capsuleEventService: CapsuleEventService,
    private readonly storageEventService: StorageEventService,
  ) {}

  @AllowAnonymous()
  @Implement(capsuleContract.list)
  list() {
    return implement(capsuleContract.list).handler(async ({ input }) => {
      const result = await this.capsuleService.getCapsules(input);
      return result;
    });
  }

  // IMPORTANT: Specific routes (/month, /day, /recent) must come BEFORE wildcard routes (/:id)
  // to prevent the wildcard from matching "month", "day", or "recent" as an ID
  
  @AllowAnonymous()
  @Implement(capsuleContract.getRecent)
  getRecent() {
    return implement(capsuleContract.getRecent).handler(async () => {
      return await this.capsuleService.getRecentCapsules();
    });
  }

  @AllowAnonymous()
  @Implement(capsuleContract.findByMonth)
  findByMonth() {
    return implement(capsuleContract.findByMonth).handler(async ({ input }) => {
      try {
        const validInput = input as { month: string };
        const result = await this.capsuleService.getCapsulesForMonth(validInput.month);
        
        // Log all capsules to see the data structure
        console.error('[Controller] ALL CAPSULES DATA:');
        result.capsules.forEach((cap: any, idx: number) => {
          console.error(`\n[Controller] === Capsule ${String(idx)} ===`);
          console.error(JSON.stringify(cap, null, 2));
        });
        
        // Test validation
        const { capsuleFindByMonthOutput } = await import('@repo/api-contracts/modules/capsule/findByMonth');
        try {
          capsuleFindByMonthOutput.parse(result);
          console.error('[Controller] ✅ Validation SUCCESS');
        } catch (validationError: unknown) {
          console.error('[Controller] ❌ Validation FAILED');
          if (validationError instanceof Error) {
            console.error('[Controller] Error:', validationError.message);
            if ('issues' in validationError && validationError.issues) {
              console.error('[Controller] Issues:', JSON.stringify(validationError.issues, null, 2));
            }
          }
        }
        
        return result;
      } catch (error) {
        console.error('[Controller] EXCEPTION:', error);
        throw error;
      }
    });
  }

  @AllowAnonymous()
  @Implement(capsuleContract.findByDay)
  findByDay() {
    return implement(capsuleContract.findByDay).handler(async ({ input }) => {
      const validInput = input as { day: string };
      return await this.capsuleService.getCapsulesByDay(validInput.day);
    });
  }

  @AllowAnonymous()
  @Implement(capsuleContract.findById)
  findById() {
    return implement(capsuleContract.findById).handler(async ({ input }) => {
      const validInput = input as { id: string };
      return await this.capsuleService.findCapsuleById(validInput.id);
    });
  }

  @Implement(capsuleContract.create)
  create() {
    return implement(capsuleContract.create).handler(async ({ input }) => {
      const capsule = await this.capsuleService.createCapsule(input);
      return capsule;
    });
  }

  @Implement(capsuleContract.update)
  update() {
    return implement(capsuleContract.update).handler(async ({ input }) => {
      const validInput = input as { id: string; openingDate?: string; content?: string; openingMessage?: string };
      const capsule = await this.capsuleService.updateCapsule(validInput.id, validInput);
      if (!capsule) {
        throw new Error('Capsule not found');
      }
      return capsule;
    });
  }

  @AllowAnonymous()
  @Implement(capsuleContract.subscribeUploadProgress)
  subscribeUploadProgress() {
    const capsuleEventService = this.capsuleEventService;
    return implement(capsuleContract.subscribeUploadProgress).handler(async function* ({ input }) {
      const { operationId } = input;
      
      // Subscribe to upload progress events for this operation
      yield* capsuleEventService.subscribe('uploadProgress', { operationId });
    });
  }

  @Implement(capsuleContract.delete)
  delete() {
    return implement(capsuleContract.delete).handler(async ({ input }) => {
      const validInput = input as { id: string };
      const capsule = await this.capsuleService.deleteCapsule(validInput.id);
      if (!capsule) {
        return { success: false };
      }
      return { success: true };
    });
  }

  @Implement(capsuleContract.unlock)
  unlock(@SessionDecorator() session: Session) {
    return implement(capsuleContract.unlock).handler(async ({ input }) => {
      const validInput = input as {
        id: string;
        code?: string;
        voiceTranscript?: string;
        deviceAction?: 'shake' | 'tilt' | 'tap';
        apiResponse?: unknown;
      };
      
      // Extract user from session
      const user = session.user;
      
      const result = await this.capsuleService.unlockCapsule(validInput, user);
      
      // Convert null to undefined for contract compatibility
      return {
        success: result.success,
        message: result.message,
        capsule: result.capsule === null ? undefined : result.capsule,
      };
    });
  }

  @AllowAnonymous()
  @Implement(capsuleContract.markAsOpened)
  markAsOpened(@SessionDecorator() session: Session | null) {
    return implement(capsuleContract.markAsOpened).handler(async ({ input }) => {
      const validInput = input as { id: string };
      
      // Extract user from session
      const user = session?.user;
      
      const result = await this.capsuleService.markCapsuleAsOpened(validInput.id, user);
      
      // Convert null to undefined for contract compatibility
      return {
        success: result.success,
        message: result.message,
        capsule: result.capsule === null ? undefined : result.capsule,
      };
    });
  }

  /**
   * Subscribe to video processing progress for all videos in a capsule
   * 
   * Aggregates progress from multiple videos and emits overall capsule progress
   * Automatically subscribes to all video processing events and calculates average progress
   */
  @AllowAnonymous()
  @Implement(capsuleContract.subscribeCapsuleVideoProcessing)
  subscribeCapsuleVideoProcessing() {
    const capsuleService = this.capsuleService;
    const storageEventService = this.storageEventService;

    return implement(capsuleContract.subscribeCapsuleVideoProcessing).handler(async function* ({ input }) {
      const { capsuleId } = input;

      // Get capsule and its videos
      const capsule = await capsuleService.getCapsuleById(capsuleId);

      // Get all video fileIds from capsule
      const videoFileIds = capsule.attachedMedia
        .filter((media) => media.type === 'video')
        .map((media) => media.fileId);

      if (videoFileIds.length === 0) {
        // No videos to process
        yield {
          overallProgress: 100,
          processingCount: 0,
          totalCount: 0,
          videoProgress: {},
          message: 'No videos in capsule',
          timestamp: new Date().toISOString(),
        };
        return;
      }

      // Track progress for each video
      const progressMap = new Map<string, number>();
      
      // Only initialize videos that are ACTUALLY processing right now
      // Don't include completed or not-yet-started videos
      const processingVideoIds: string[] = [];
      videoFileIds.forEach(fileId => {
        const isActuallyProcessing = storageEventService.isProcessing('videoProcessing', { fileId });
        if (isActuallyProcessing) {
          console.log(`✅ [subscribeCapsuleVideoProcessing] Video ${fileId} IS actively processing`);
          progressMap.set(fileId, 0);
          processingVideoIds.push(fileId);
        } else {
          console.log(`⏸️  [subscribeCapsuleVideoProcessing] Video ${fileId} is NOT processing (completed or not started)`);
        }
      });

      // If no videos are actively processing, complete immediately
      if (processingVideoIds.length === 0) {
        console.log(`✅ [subscribeCapsuleVideoProcessing] No videos actively processing for capsule ${capsuleId}`);
        yield {
          overallProgress: 100,
          processingCount: 0,
          totalCount: videoFileIds.length,
          videoProgress: {},
          message: 'All videos processed',
          timestamp: new Date().toISOString(),
        };
        return;
      }

      // Yield initial state (only for videos that are actively processing)
      const initialState = {
        overallProgress: 0,
        processingCount: processingVideoIds.length,
        totalCount: videoFileIds.length,
        videoProgress: Object.fromEntries(progressMap),
        message: `Processing ${String(processingVideoIds.length)} of ${String(videoFileIds.length)} video(s)...`,
        timestamp: new Date().toISOString(),
      };
      console.log(`🚀 [subscribeCapsuleVideoProcessing] Yielding initial state for capsule ${capsuleId}:`, initialState);
      yield initialState;

      // Create async iterators for each video, wrapping events with fileId
      interface VideoEvent {
        fileId: string;
        progress: number;
        message?: string;
        metadata?: any;
      }

      // Only create iterators for videos that are actively processing
      const videoIterators = processingVideoIds.map((fileId) => {
        const subscription = storageEventService.subscribe('videoProcessing', { fileId });
        // Wrap each subscription to include fileId with each event
        return (async function* () {
          for await (const event of subscription) {
            yield { fileId, ...event } as VideoEvent;
          }
        })();
      });

      // Process combined events from all video subscriptions
      for await (const event of combineAsyncIterators(videoIterators)) {
        console.log(`📥 [subscribeCapsuleVideoProcessing] Received video event:`, event);
        
        // Update progress for this video
        progressMap.set(event.fileId, event.progress);
        
        // Calculate overall progress (average of all videos)
        const progressValues = Array.from(progressMap.values());
        const totalProgress = progressValues.reduce((sum, p) => sum + p, 0);
        const overallProgress = Math.round(totalProgress / progressMap.size);
        
        // Count how many videos are still processing (< 100%)
        const processingCount = progressValues.filter(p => p < 100).length;
        
        // Yield aggregated progress update
        const progressUpdate = {
          overallProgress,
          processingCount,
          totalCount: videoFileIds.length,
          videoProgress: Object.fromEntries(progressMap),
          message: processingCount > 0 
            ? `Processing ${String(processingCount)}/${String(videoFileIds.length)} video(s)...`
            : 'All videos processed',
          timestamp: new Date().toISOString(),
        };
        console.log(`📤 [subscribeCapsuleVideoProcessing] Yielding progress update:`, progressUpdate);
        yield progressUpdate;
      }
    });
  }
}
