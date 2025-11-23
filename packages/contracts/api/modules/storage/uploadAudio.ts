import { oc } from '@orpc/contract';
import { z } from 'zod/v4';
import { audioSchema } from '../../common/utils/file';

export const uploadAudioInput = z.object({
  file: audioSchema,
});

export const uploadAudioOutput = z.object({
  filename: z.string(),
  size: z.coerce.number(),
  mimeType: z.string(),
  fileId: z.string(),
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
