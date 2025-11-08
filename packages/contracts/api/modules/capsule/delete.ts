import { oc } from "@orpc/contract";
import { z } from "zod/v4";

// Define the input for deleting a capsule
export const capsuleDeleteInput = z.object({
  id: z.string(),
});

// Define the output
export const capsuleDeleteOutput = z.object({
  success: z.boolean(),
});

// Define the contract
export const capsuleDeleteContract = oc
  .route({
    method: "DELETE",
    path: "/:id",
    summary: "Delete a capsule",
    description: "Delete a time capsule by ID",
  })
  .input(capsuleDeleteInput)
  .output(capsuleDeleteOutput);
