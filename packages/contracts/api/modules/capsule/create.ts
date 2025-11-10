import { oc } from "@orpc/contract";
import { z } from "zod/v4";
import { 
  capsuleSchema, 
  lockTypeSchema, 
  lockConfigSchema
} from "@repo/api-contracts/common/capsule";

// Define the input for creating a capsule
export const capsuleCreateInput = z.object({
  openingDate: z.string(), // YYYY-MM-DD format
  
  // Content - Plate.js JSON string (can contain text, images, videos, audio, etc.)
  content: z.string(),
  
  openingMessage: z.string().optional(),
  
  // Lock mechanism (optional)
  isLocked: z.boolean().default(false),
  lockType: lockTypeSchema.optional(),
  lockConfig: lockConfigSchema.optional(),
});

// Define the output
export const capsuleCreateOutput = capsuleSchema;

// Define the contract
export const capsuleCreateContract = oc
  .route({
    method: "POST",
    path: "/",
    summary: "Create a new capsule",
    description: "Create a new time capsule with multi-type content and optional lock mechanism",
  })
  .input(capsuleCreateInput)
  .output(capsuleCreateOutput);
