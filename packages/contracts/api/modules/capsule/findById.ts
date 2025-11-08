import { oc } from "@orpc/contract";
import { z } from "zod/v4";
import { capsuleSchema } from "@repo/api-contracts/common/capsule";

// Define the input for finding a capsule by ID
export const capsuleFindByIdInput = z.object({
  id: z.string(),
});

// Define the output
export const capsuleFindByIdOutput = capsuleSchema.nullable();

// Define the contract
export const capsuleFindByIdContract = oc
  .route({
    method: "GET",
    path: "/:id",
    summary: "Get capsule by ID",
    description: "Retrieve a single capsule by its unique identifier",
  })
  .input(capsuleFindByIdInput)
  .output(capsuleFindByIdOutput);
