import { oc } from "@orpc/contract";
import { z } from "zod/v4";
import { capsuleSchema } from "@repo/api-contracts/common/capsule";

// Define the output for getting recent capsules
export const capsuleGetRecentOutput = z.object({
  capsules: z.array(capsuleSchema),
});

// Define the contract
export const capsuleGetRecentContract = oc
  .route({
    method: "GET",
    path: "/recent",
    summary: "Get recent capsules for home page",
    description: "Retrieve capsules from the past week, plus all locked and unread capsules from the past",
  })
  .input(z.object({}))
  .output(capsuleGetRecentOutput);
