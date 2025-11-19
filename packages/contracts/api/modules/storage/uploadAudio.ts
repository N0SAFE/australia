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

export const uploadAudioInput = z.object({
  file: fileSchema
    .refine(
      file => /\.(mp3|wav|ogg|m4a)$/i.test(file.name),
      {
        message: 'Only audio files (mp3, wav, ogg, m4a) are allowed',
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

export const uploadAudioOutput = z.object({
  filename: z.string(),
  path: z.string(),
  size: z.number(),
  mimeType: z.string(),
});

export const uploadAudioContract = oc
  .route({
    method: 'POST',
    path: '/upload/audio',
    summary: 'Upload an audio file',
    description: 'Upload an audio file (mp3, wav, ogg, m4a, flac) up to 10MB',
  })
  .input(uploadAudioInput)
  .output(uploadAudioOutput);
