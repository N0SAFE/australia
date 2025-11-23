import { Injectable } from '@nestjs/common';
import { BaseEventService } from '@/core/modules/events/base-event.service';
import { contractBuilder, ProcessingStrategy } from '@/core/modules/events/event-contract.builder';
import { z } from 'zod';

/**
 * Capsule Event Contracts
 * Defines all events related to capsule upload and processing
 */
export const capsuleEventContracts = {
  uploadProgress: contractBuilder()
    .input(z.object({
      operationId: z.string(),
    }))
    .output(z.object({
      capsuleId: z.string().optional(),
      progress: z.number().min(0).max(100),
      stage: z.enum(['creating_capsule', 'uploading_files', 'processing_media', 'finalizing', 'completed', 'failed']),
      message: z.string(),
      currentFile: z.string().optional(),
      filesCompleted: z.number().optional(),
      totalFiles: z.number().optional(),
      timestamp: z.string(),
    }))
    .strategy(ProcessingStrategy.ABORT, {
      onAbort: (input, { signal: _signal }) => {
        console.log(`⚠️  Aborting capsule upload for operation ${input.operationId}`);
      },
    })
    .build(),
} as const;

/**
 * Capsule Event Service
 * 
 * Handles all capsule-related events with type safety
 * Implements event-based upload progress tracking
 * 
 * @example
 * ```typescript
 * // Subscribe to upload progress events
 * const subscription = capsuleEventService.subscribe('uploadProgress', { operationId: 'capsule-123' });
 * for await (const event of subscription) {
 *   console.log(`Progress: ${event.progress}%`);
 *   if (event.stage === 'completed' || event.stage === 'failed') break;
 * }
 * 
 * // Emit upload progress
 * capsuleEventService.emit('uploadProgress', { operationId: 'capsule-123' }, {
 *   capsuleId: 'uuid-456',
 *   progress: 50,
 *   stage: 'uploading_files',
 *   message: 'Uploading file 2 of 4...',
 *   currentFile: 'image.jpg',
 *   filesCompleted: 1,
 *   totalFiles: 4,
 *   timestamp: new Date().toISOString(),
 * });
 * ```
 * 
 * - Type-safe event emission and subscription
 * - Auto-cleanup on completion or failure
 */
@Injectable()
export class CapsuleEventService extends BaseEventService<typeof capsuleEventContracts> {
  constructor() {
    super('capsule', capsuleEventContracts);
  }
}
