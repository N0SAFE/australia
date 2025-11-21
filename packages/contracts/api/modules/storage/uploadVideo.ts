import { oc } from '@orpc/contract';
import { z } from 'zod/v4';

export const uploadVideoInput = z.file()
  .refine(
    file => file.type.startsWith('video/'),
    {
      message: 'Only video files are allowed',
    }
  );

export const uploadVideoOutput = z.object({
  filename: z.string(),
  path: z.string(),
  size: z.number(),
  mimeType: z.string(),
  fileId: z.uuid(),
  videoId: z.uuid(),
  isProcessed: z.boolean(),
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
