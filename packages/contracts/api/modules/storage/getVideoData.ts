import { oc } from '@orpc/contract';
import { z } from 'zod';

/**
 * Get video metadata and file by ID
 * GET /storage/video/:fileId
 */
export const getVideoDataContract = oc
  .route({
    method: 'GET',
    path: '/video/data/:fileId',
    summary: 'Get video file',
    description: 'Get video file and metadata by ID',
  })
  .input(z.object({
    fileId: z.uuid(),
  }))
  .output(
    z.object({
      isProcessed: z.coerce.boolean()
    })
  );
