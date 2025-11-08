import { oc } from "@orpc/contract";
import { z } from "zod/v4";
import { capsuleSchema } from "@repo/api-contracts/common/capsule";

// Define the input for finding capsules by month
export const capsuleFindByMonthInput = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
});

// Define the output for finding capsules by month
export const capsuleFindByMonthOutput = z.object({
  capsules: z.array(capsuleSchema),
});

// Define the contract
export const capsuleFindByMonthContract = oc
  .route({
    method: "GET",
    path: "/month",
    summary: "Get capsules for specified month",
    description: "Retrieve all capsules for the specified month (YYYY-MM format)",
  })
  .input(capsuleFindByMonthInput)
  .output(capsuleFindByMonthOutput);
