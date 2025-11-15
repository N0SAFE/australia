import { oc } from '@orpc/contract';
import { z } from 'zod/v4';

export const presentationGetVideoInput = z.object({});

export const presentationGetVideoOutput = z.instanceof(File);

export const presentationGetVideoContract = oc
  .route({
    method: 'GET',
    path: '/video',
    summary: 'Stream presentation video',
    description: 'Get the presentation video file for streaming',
  })
  .input(presentationGetVideoInput)
  .output(presentationGetVideoOutput);
