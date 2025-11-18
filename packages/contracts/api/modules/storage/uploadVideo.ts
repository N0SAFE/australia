import { oc } from '@orpc/contract';
import { z } from 'zod/v4';

// Custom schema that validates File-like objects (more flexible than instanceof)
const fileSchema = z.custom<File>(
  (val) => {
    // Check if it's a File-like object
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

export const uploadVideoInput = z.object({  
  file: fileSchema
    .refine(file => file.size <= 500 * 1024 * 1024, {
      message: 'File size must not exceed 500MB',
    })
    .refine(
      file => /\.(mp4|webm|ogg)$/i.test(file.name),
      {
        message: 'Only video files (mp4, webm, ogg) are allowed',
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
