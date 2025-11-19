import { Injectable } from '@nestjs/common';
import { BaseEventService } from '@/core/modules/events/base-event.service';
import { contractBuilder, ProcessingStrategy } from '@/core/modules/events/event-contract.builder';
import { z } from 'zod';

/**
 * Storage Event Contracts
 * Defines all events related to storage and file processing
 */
export const storageEventContracts = {
  videoProcessing: contractBuilder()
    .input(z.object({
      videoId: z.uuid(),
    }))
    .output(z.object({
      progress: z.number().min(0).max(100),
      message: z.string(),
      metadata: z.object({
        duration: z.number(),
        width: z.number(),
        height: z.number(),
        codec: z.string(),
      }).optional(),
      timestamp: z.string(),
    }))
    .strategy(ProcessingStrategy.ABORT, {
      onAbort: (input, { signal: _signal }) => {
        console.log(`⚠️  Aborting video processing for ${input.videoId}`);
      },
    })
    .build(),
  
  imageProcessing: contractBuilder()
    .input(z.object({
      imageId: z.uuid(),
    }))
    .output(z.object({
      imageId: z.uuid(),
      progress: z.number().min(0).max(100),
      status: z.enum(['queued', 'processing', 'completed', 'failed']),
      currentStep: z.string().optional(),
      error: z.string().optional(),
    }))
    .strategy(ProcessingStrategy.QUEUE, {
      onQueue: (input, position) => {
        console.log(`📋 Image ${input.imageId} queued at position ${String(position)}`);
      },
    })
    .build(),
  
  audioProcessing: contractBuilder()
    .input(z.object({
      audioId: z.uuid(),
    }))
    .output(z.object({
      audioId: z.uuid(),
      progress: z.number().min(0).max(100),
      status: z.enum(['queued', 'processing', 'completed', 'failed']),
      currentStep: z.string().optional(),
      error: z.string().optional(),
    }))
    .strategy(ProcessingStrategy.QUEUE, {
      onQueue: (input, position) => {
        console.log(`📋 Audio ${input.audioId} queued at position ${String(position)}`);
      },
    })
    .build(),
  
  fileUpload: contractBuilder()
    .input(z.object({
      uploadId: z.uuid(),
    }))
    .output(z.object({
      uploadId: z.uuid(),
      progress: z.number().min(0).max(100),
      status: z.enum(['uploading', 'completed', 'failed']),
      bytesUploaded: z.number(),
      totalBytes: z.number(),
      error: z.string().optional(),
    }))
    .strategy(ProcessingStrategy.PARALLEL)
    .build(),
} as const;

/**
 * Storage Event Service
 * 
 * Handles all storage-related events with type safety
 * Implements IVideoProcessingEvents for video processing integration
 * 
 * @example
 * ```typescript
 * // Subscribe to video processing events
 * const subscription = storageEventService.subscribe('videoProcessing', { videoId: 'uuid-123' });
 * for await (const event of subscription) {
 *   console.log(`Progress: ${event.progress}%`);
 *   if (event.status === 'completed') break;
 * }
 * 
 * // Emit video processing progress
 * storageEventService.emit('videoProcessing', { videoId: 'uuid-123' }, {
 *   videoId: 'uuid-123',
 *   progress: 50,
 *   status: 'processing',
 *   currentStep: 'Extracting metadata...',
 * });
 * ```
 * 
 * - Type-safe event emission and subscription
 */
@Injectable()
export class StorageEventService extends BaseEventService<typeof storageEventContracts> {
  constructor() {
    super('storage', storageEventContracts);
  }
}
