import { oc } from '@orpc/contract';
import { z } from 'zod/v4';

export const uploadAudioInput = z.file()
  .refine(
    file => file.type.startsWith('audio/'),
    {
      message: 'Only audio files are allowed',
    }
  );

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
