import { oc } from "@orpc/contract";
import { z } from "zod/v4";
import { capsuleSchema } from "@repo/api-contracts/common/capsule";

// Define the input for marking a capsule as opened
export const capsuleMarkAsOpenedInput = z.object({
  id: z.string(),
});

// Define the output
export const capsuleMarkAsOpenedOutput = z.object({
  success: z.coerce.boolean(),
  message: z.string().optional(),
  capsule: capsuleSchema.optional(), // Return updated capsule if successful
});

// Define the contract
export const capsuleMarkAsOpenedContract = oc
  .route({
    method: "POST",
    path: "/:id/open",
    summary: "Mark capsule as opened",
    description: "Mark a capsule as opened when it is first viewed. Admin users can preview without database modification.",
  })
  .input(capsuleMarkAsOpenedInput)
  .output(capsuleMarkAsOpenedOutput);
