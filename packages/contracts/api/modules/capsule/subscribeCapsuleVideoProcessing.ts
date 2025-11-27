import { oc, eventIterator } from '@orpc/contract';
import { z } from 'zod';

/**
 * Contract for subscribing to video processing progress for all videos in a capsule
 * 
 * Returns an SSE stream that aggregates progress from all videos being processed in the capsule
 * Emits overall capsule progress as videos complete
 * 
 * Example usage:
 * for await (const event of client.capsule.subscribeCapsuleVideoProcessing({ capsuleId: 'uuid-123' })) {
 *   console.log(`Capsule progress: ${event.overallProgress}%`);
 *   console.log(`Processing: ${event.processingCount}/${event.totalCount} videos`);
 * }
 */
export const subscribeCapsuleVideoProcessingContract = oc
  .route({
    method: 'GET',
    path: '/subscribe/capsule/:capsuleId',
    summary: 'Subscribe to capsule video processing progress',
    description: 'SSE stream that aggregates video processing progress for all videos in a capsule',
  })
  .input(
    z.object({
      capsuleId: z.string().describe('Capsule ID to monitor video processing for'),
    })
  )
  .output(
    eventIterator(
      z.object({
        overallProgress: z.number().min(0).max(100).describe('Overall progress percentage (0-100) averaged across all processing videos'),
        processingCount: z.number().describe('Number of videos currently being processed'),
        totalCount: z.number().describe('Total number of videos in the capsule'),
        videoProgress: z.record(z.string(), z.number()).describe('Progress per video: { fileId: progress }'),
        message: z.string().describe('Human-readable status message'),
        timestamp: z.string().describe('ISO timestamp of the event'),
      })
    )
  );

export type SubscribeCapsuleVideoProcessingContract = typeof subscribeCapsuleVideoProcessingContract;
