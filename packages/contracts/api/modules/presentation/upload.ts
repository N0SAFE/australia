import { oc } from '@orpc/contract';
import { z } from 'zod/v4';

export const presentationUploadInput = z.file()
  .refine(file => file.size <= 500 * 1024 * 1024, {
    message: 'File size must not exceed 500MB',
  })
  .refine(
    file => file.type.startsWith('video/'),
    {
      message: 'Only video files are allowed',
    }
  );

export const presentationUploadOutput = z.object({
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
