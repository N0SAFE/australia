import { oc } from '@orpc/contract';
import { z } from 'zod/v4';

export const uploadImageInput = z.file()
  .refine(
    file => file.type.startsWith('image/'),
    {
      message: 'Only image files are allowed',
    }
  );

export const uploadImageOutput = z.object({
  filename: z.string(),
  path: z.string(),
  size: z.number(),
  mimeType: z.string(),
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
