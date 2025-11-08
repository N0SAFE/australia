import { oc } from "@orpc/contract";
import { z } from "zod/v4";
import { capsuleSchema } from "@repo/api-contracts/common/capsule";

// Define the input for finding capsules by day
export const capsuleFindByDayInput = z.object({
  day: z.string(), // YYYY-MM-DD format
});

// Define the output
export const capsuleFindByDayOutput = z.object({
  capsules: z.array(capsuleSchema),
});

// Define the contract
export const capsuleFindByDayContract = oc
  .route({
    method: "GET",
    path: "/day/:day",
    summary: "Get capsules by day",
    description: "Retrieve all capsules for a specific day",
  })
  .input(capsuleFindByDayInput)
  .output(capsuleFindByDayOutput);
