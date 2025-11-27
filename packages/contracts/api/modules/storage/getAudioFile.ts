import { oc } from '@orpc/contract';
import { z } from 'zod';

/**
 * Get audio file by ID
 * GET /storage/audio/:fileId
 */
export const getAudioFileContract = oc
  .route({
    method: 'GET',
    path: '/audio/:fileId',
    summary: 'Get audio file',
    description: 'Get audio file by ID',
  })
  .input(z.object({
    fileId: z.uuid(),
  }))
  .output(
    z.custom<File>((val) => val instanceof File, {
      message: 'Must be a File object',
    })
  );
