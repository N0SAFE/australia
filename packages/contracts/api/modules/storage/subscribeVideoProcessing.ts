import { oc, eventIterator } from '@orpc/contract';
import { z } from 'zod';

/**
 * Subscribe to video processing events
 * 
 * Client can subscribe to real-time processing updates for a specific video
 * using Server-Sent Events (SSE) via ORPC event iterator
 * 
 * @example
 * ```typescript
 * // Client-side subscription
 * for await (const event of client.storage.subscribeVideoProcessing({ videoId: 'uuid-123' })) {
 *   console.log(`${event.progress}% - ${event.message}`);
 *   if (event.status === 'completed') break;
 * }
 * ```
 */
export const subscribeVideoProcessingContract = oc
  .route({
    method: 'GET',
    path: '/subscribe/video/:videoId',
  })
  .input(
    z.object({
      videoId: z.string().uuid(),
    })
  )
  .output(
    eventIterator(
      z.object({
        progress: z.number().min(0).max(100),
        message: z.string(),
        metadata: z.object({
          duration: z.number(),
          width: z.number(),
          height: z.number(),
          codec: z.string(),
        }).optional(),
        timestamp: z.string(),
      })
    )
  );

export type SubscribeVideoProcessingContract = typeof subscribeVideoProcessingContract;
