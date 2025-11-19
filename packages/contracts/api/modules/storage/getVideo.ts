import { oc } from '@orpc/contract';
import { z } from 'zod';

/**
 * Get video metadata and file by ID
 * GET /storage/video/:videoId
 */
export const getVideoContract = oc
  .route({
    method: 'GET',
    path: '/video/:videoId',
    summary: 'Get video file',
    description: 'Get video file and metadata by ID',
  })
  .input(z.object({
    videoId: z.string().uuid(),
  }))
  .output(
    z.custom<File>((val) => val instanceof File, {
      message: 'Must be a File object',
    })
  );
