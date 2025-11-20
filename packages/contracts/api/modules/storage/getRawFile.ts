import { oc } from '@orpc/contract';
import { z } from 'zod';

/**
 * Get raw file by ID
 * GET /storage/file/:fileId
 */
export const getRawFileContract = oc
  .route({
    method: 'GET',
    path: '/file/:fileId',
    summary: 'Get raw file',
    description: 'Get raw file (document, archive, etc.) by ID',
  })
  .input(z.object({
    fileId: z.uuid(),
  }))
  .output(
    z.custom<File>((val) => val instanceof File, {
      message: 'Must be a File object',
    })
  );
