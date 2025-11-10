import { oc } from '@orpc/contract';
import { z } from 'zod/v4';

export const getFileInput = z.object({
  filename: z.string().min(1, 'Filename is required'),
});

export const getFileOutput = z.instanceof(File)

export const getFileContract = oc
  .route({
    method: 'GET',
    path: '/files/:filename',
    summary: 'Get a file by filename',
    description: 'Retrieve a previously uploaded file by its filename',
  })
  .input(getFileInput)
  .output(getFileOutput);
