import { oc } from '@orpc/contract';
import { z } from 'zod/v4';

export const presentationGetCurrentInput = z.object({});

export const presentationGetCurrentOutput = z.object({
  id: z.string(),
  filename: z.string(),
  filePath: z.string(),
  mimeType: z.string(),
  size: z.number(),
  duration: z.number().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  thumbnailPath: z.string().nullable(),
  uploadedAt: z.date(),
  updatedAt: z.date(),
  url: z.string(),
}).nullable();

export const presentationGetCurrentContract = oc
  .route({
    method: 'GET',
    path: '/current',
    summary: 'Get current presentation video',
    description: 'Get metadata for the current presentation video',
  })
  .input(presentationGetCurrentInput)
  .output(presentationGetCurrentOutput);
