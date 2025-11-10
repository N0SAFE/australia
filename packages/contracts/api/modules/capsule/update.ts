import { oc } from "@orpc/contract";
import { z } from "zod/v4";
import { capsuleSchema, lockTypeSchema, lockConfigSchema } from "@repo/api-contracts/common/capsule";

// Define the input for updating a capsule
export const capsuleUpdateInput = z.object({
  id: z.string(),
  openingDate: z.string().optional(), // YYYY-MM-DD format
  content: z.string().optional(),
  openingMessage: z.string().optional(),
  isLocked: z.boolean().optional(),
  lockType: lockTypeSchema.nullable().optional(),
  lockConfig: lockConfigSchema.nullable().optional(),
});

// Define the output
export const capsuleUpdateOutput = capsuleSchema;

// Define the contract
export const capsuleUpdateContract = oc
  .route({
    method: "PUT",
    path: "/:id",
    summary: "Update a capsule",
    description: "Update an existing time capsule",
  })
  .input(capsuleUpdateInput)
  .output(capsuleUpdateOutput);
