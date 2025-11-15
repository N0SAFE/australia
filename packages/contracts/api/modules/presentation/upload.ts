import { oc } from '@orpc/contract';
import { z } from 'zod/v4';

// Custom schema that validates File-like objects
const fileSchema = z.custom<File>(
  (val) => {
    return (
      val instanceof File ||
      (typeof val === 'object' &&
        val !== null &&
        'name' in val &&
        'size' in val &&
        'type' in val &&
        typeof (val as any).name === 'string' &&
        typeof (val as any).size === 'number' &&
        typeof (val as any).type === 'string')
    );
  },
  {
    message: 'Must be a File object',
  }
);

export const presentationUploadInput = z.object({
  file: fileSchema
    .refine(file => file.size <= 500 * 1024 * 1024, {
      message: 'File size must not exceed 500MB',
    })
    .refine(
      file => file.type.startsWith('video/'),
      {
        message: 'Only video files are allowed',
      }
    ),
  _multerFiles: z.record(
    z.string(),
    z.object({
      filename: z.string(),
      originalname: z.string(),
      path: z.string(),
      size: z.number(),
      mimetype: z.string(),
    })
  ).optional(),
});

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
