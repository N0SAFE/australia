import { oc } from "@orpc/contract";
import { z } from "zod/v4";
import { capsuleSchema } from "@repo/api-contracts/common/capsule";

// Define the input for unlocking a capsule
export const capsuleUnlockInput = z.object({
  id: z.string(),
  // For code-based locks
  code: z.string().optional(),
  // For voice-based locks
  voiceTranscript: z.string().optional(),
  // For device-based locks
  deviceAction: z.enum(["shake", "tilt", "tap"]).optional(),
  // For API-based locks
  apiResponse: z.any().optional(),
});

// Define the output
export const capsuleUnlockOutput = z.object({
  success: z.coerce.boolean(),
  message: z.string().optional(),
  capsule: capsuleSchema.optional(), // Return updated capsule if successful
});

// Define the contract
export const capsuleUnlockContract = oc
  .route({
    method: "POST",
    path: "/:id/unlock",
    summary: "Unlock a capsule",
    description: "Attempt to unlock a locked capsule with the provided unlock method",
  })
  .input(capsuleUnlockInput)
  .output(capsuleUnlockOutput);
