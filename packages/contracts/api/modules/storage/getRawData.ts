import { oc } from '@orpc/contract';
import { z } from 'zod';

/**
 * Get raw file by ID
 * GET /storage/file/:fileId
 */
export const getRawFileDataContract = oc
  .route({
    method: 'GET',
    path: '/file/data/:fileId',
    summary: 'Get raw file',
    description: 'Get raw file (document, archive, etc.) by ID',
  })
  .input(z.object({
    fileId: z.uuid(),
  }))
  .output(
    z.object()
  );
