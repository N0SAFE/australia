import { oc } from '@orpc/contract';
import { z } from 'zod';

/**
 * Get audio file by ID
 * GET /storage/audio/:fileId
 */
export const getAudioDataContract = oc
  .route({
    method: 'GET',
    path: '/audio/data/:fileId',
    summary: 'Get audio file',
    description: 'Get audio file by ID',
  })
  .input(z.object({
    fileId: z.uuid(),
  }))
  .output(
    z.object({})
  );
