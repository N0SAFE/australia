import { oc } from "@orpc/contract";
import { z } from "zod/v4";
import { capsuleSchema } from "@repo/api-contracts/common/capsule";

// Define the input for creating a capsule
export const capsuleCreateInput = z.object({
  openingDate: z.string(), // YYYY-MM-DD format
  content: z.string(),
  openingMessage: z.string().optional(),
});

// Define the output
export const capsuleCreateOutput = capsuleSchema;

// Define the contract
export const capsuleCreateContract = oc
  .route({
    method: "POST",
    path: "/",
    summary: "Create a new capsule",
    description: "Create a new time capsule",
  })
  .input(capsuleCreateInput)
  .output(capsuleCreateOutput);
