import { oc } from '@orpc/contract';
import { z } from 'zod';

/**
 * Get image file by ID
 * GET /storage/image/:fileId
 */
export const getImageDataContract = oc
  .route({
    method: 'GET',
    path: '/image/data/:fileId',
    summary: 'Get image file',
    description: 'Get image file by ID',
  })
  .input(z.object({
    fileId: z.uuid(),
  }))
  .output(
    z.object()
  );
