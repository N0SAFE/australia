import { oc, eventIterator } from '@orpc/contract';
import { z } from 'zod';

/**
 * Subscribe to presentation video processing progress
 * Returns async iterator for real-time progress updates via SSE
 * 
 * GET /presentation/subscribe-processing
 */
export const presentationSubscribeProcessingProgressContract = oc
  .route({
    method: 'GET',
    path: '/subscribe-processing',
    summary: 'Subscribe to presentation video processing progress',
    description: 'Returns async iterator with real-time processing updates via Server-Sent Events',
  })
  .input(z.object({}))
  .output(
    eventIterator(
      z.object({
        progress: z.coerce.number().min(0).max(100),
        message: z.string(),
        metadata: z.object({
          duration: z.coerce.number(),
          width: z.coerce.number(),
          height: z.coerce.number(),
          codec: z.string(),
        }).optional(),
        timestamp: z.string(),
      })
    )
  );
