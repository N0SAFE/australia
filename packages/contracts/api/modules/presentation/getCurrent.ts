import { oc } from '@orpc/contract';
import { z } from 'zod/v4';

export const presentationGetCurrentInput = z.object({});

export const presentationGetCurrentOutput = z.object({
  id: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  size: z.coerce.number(),
  duration: z.coerce.number().nullable(),
  width: z.coerce.number().nullable(),
  height: z.coerce.number().nullable(),
  thumbnailPath: z.string().nullable(),
  uploadedAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  url: z.string(),
  isProcessed: z.coerce.boolean(),
  processingProgress: z.coerce.number().nullable(),
  processingError: z.string().nullable(),
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
