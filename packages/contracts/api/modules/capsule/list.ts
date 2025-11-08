import { oc } from "@orpc/contract";
import { z } from "zod/v4";
import { paginatedInput, paginatedOutput } from "@repo/api-contracts/common/utils/paginate";
import { capsuleSchema } from "@repo/api-contracts/common/capsule";

// Define the input for the list endpoint
export const capsuleListInput = z.object({
  pagination: paginatedInput.optional(),
  sort: z.object({
    field: z.enum(['openingDate', 'createdAt']),
    direction: z.enum(['asc', 'desc']),
  }).optional(),
});

// Define the output for the list endpoint
export const capsuleListOutput = z.object({
  capsules: z.array(capsuleSchema),
  meta: z.object({ pagination: paginatedOutput }),
});

// Define the contract
export const capsuleListContract = oc
  .route({
    method: "GET",
    path: "/",
    summary: "Get all capsules",
    description: "Retrieve a paginated list of capsules sorted by opening date",
  })
  .input(capsuleListInput)
  .output(capsuleListOutput);
