import { oc } from '@orpc/contract';
import { z } from 'zod/v4';
import { imageSchema } from '../../common/utils/file';

export const uploadImageInput = z.object({
  file: imageSchema,
});

export const uploadImageOutput = z.object({
  filename: z.string(),
  size: z.coerce.number(),
  mimeType: z.string(),
  fileId: z.string(),
});

export const uploadImageContract = oc
  .route({
    method: 'POST',
    path: '/upload/image',
    summary: 'Upload an image file',
    description: 'Upload an image file (jpg, jpeg, png, gif, webp) up to 5MB',
  })
  .input(uploadImageInput)
  .output(uploadImageOutput);
