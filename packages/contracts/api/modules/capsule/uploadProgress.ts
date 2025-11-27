import { oc, eventIterator } from "@orpc/contract";
import { z } from "zod/v4";

// Upload progress event for capsule creation/update
export const capsuleUploadProgressEvent = z.object({
  capsuleId: z.string().optional(), // Only available after capsule is created
  progress: z.coerce.number().min(0).max(100), // 0-100
  stage: z.enum([
    'creating_capsule', // Initial capsule creation
    'uploading_files', // Uploading files
    'processing_media', // Processing uploaded media (videos, etc.)
    'finalizing', // Final steps
    'completed', // All done
    'failed' // Error occurred
  ]),
  message: z.string(),
  currentFile: z.string().optional(), // Current file being processed
  filesCompleted: z.coerce.number().optional(),
  totalFiles: z.coerce.number().optional(),
  timestamp: z.iso.datetime(),
});

export type CapsuleUploadProgressEvent = z.infer<typeof capsuleUploadProgressEvent>;

// Contract for subscribing to capsule upload progress
export const subscribeUploadProgressContract = oc
  .route({
    method: "GET",
    path: "/upload-progress/:operationId",
    summary: "Subscribe to capsule upload progress",
    description: "Server-sent events stream for real-time capsule upload and media processing progress",
  })
  .input(
    z.object({
      operationId: z.string(), // Unique ID for this upload operation
    })
  )
  .output(eventIterator(capsuleUploadProgressEvent));
