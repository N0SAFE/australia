import { oc } from '@orpc/contract';
import { z } from 'zod/v4';

export const presentationDeleteInput = z.object({});

export const presentationDeleteOutput = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const presentationDeleteContract = oc
  .route({
    method: 'DELETE',
    path: '/video',
    summary: 'Delete presentation video',
    description: 'Delete the current presentation video',
  })
  .input(presentationDeleteInput)
  .output(presentationDeleteOutput);
