import { oc } from "@orpc/contract";
import { z } from "zod/v4";
import { capsuleSchema, lockTypeSchema, lockConfigSchema } from "@repo/api-contracts/common/capsule";

// Media schema for capsule updates
const addedMediaSchema = z.object({
  file: z.file(), // The actual file to upload
  uniqueId: z.string(), // Temporary unique ID used in content references
  type: z.enum(['image', 'video', 'audio']), // Media type
});

const mediaSchema = z.object({
  kept: z.array(z.string()), // Array of file IDs to keep from existing content
  added: z.array(addedMediaSchema), // New files with temporary IDs to upload
});

// Define the input for updating a capsule
export const capsuleUpdateInput = z.object({
  id: z.string(),
  openingDate: z.string().optional(), // YYYY-MM-DD format
  content: z.string().optional(),
  openingMessage: z.string().optional(),
  isLocked: z.boolean().optional(),
  lockType: lockTypeSchema.nullable().optional(),
  lockConfig: lockConfigSchema.nullable().optional(),
  
  // Media field for handling file uploads (optional for updates)
  media: mediaSchema.optional(),
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
