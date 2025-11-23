import { oc } from '@orpc/contract';
import { z } from 'zod/v4';
import { videoSchema } from '../../common/utils/file';

export const presentationUploadInput = z.object({
  file: videoSchema,
});

export const presentationUploadOutput = z.object({
  id: z.string(),
  filename: z.string(),
  filePath: z.string(),
  mimeType: z.string(),
  size: z.coerce.number(),
  duration: z.coerce.number().nullable(),
  width: z.coerce.number().nullable(),
  height: z.coerce.number().nullable(),
  thumbnailPath: z.string().nullable(),
  uploadedAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  url: z.string(),
});

export const presentationUploadContract = oc
  .route({
    method: 'POST',
    path: '/upload',
    summary: 'Upload presentation video',
    description: 'Upload or replace the presentation video (up to 500MB)',
  })
  .input(presentationUploadInput)
  .output(presentationUploadOutput);
