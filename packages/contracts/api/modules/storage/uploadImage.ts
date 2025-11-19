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

export const uploadImageInput = z.object({
  file: fileSchema
    .refine(
      file => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name),
      {
        message: 'Only image files (jpg, jpeg, png, gif, webp, svg) are allowed',
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
