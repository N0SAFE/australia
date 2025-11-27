import { oc } from '@orpc/contract';
import { z } from 'zod/v4';
import { videoSchema } from '../../common/utils/file';

export const uploadVideoInput = z.object({
  file: videoSchema,
});

export const uploadVideoOutput = z.object({
  filename: z.string(),
  size: z.coerce.number(),
  mimeType: z.string(),
  fileId: z.uuid(),
  videoId: z.uuid(),
  isProcessed: z.coerce.boolean(),
  message: z.string().optional(),
});

export const uploadVideoContract = oc
  .route({
    method: 'POST',
    path: '/upload/video',
    summary: 'Upload a video file',
    description: 'Upload a video file (mp4, webm, ogg) up to 500MB',
  })
  .input(uploadVideoInput)
  .output(uploadVideoOutput);
