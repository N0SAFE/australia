import { oc } from "@orpc/contract";
import { z } from "zod/v4";
import { 
  capsuleSchema, 
  lockTypeSchema, 
  lockConfigSchema
} from "@repo/api-contracts/common/capsule";

// Media schema for capsule creation
const addedMediaSchema = z.object({
  file: z.file(), // The actual file to upload
  contentMediaId: z.string(), // UUID generated on client, embedded in content nodes
  type: z.enum(['image', 'video', 'audio']), // Media type
});

const mediaSchema = z.object({
  kept: z.array(z.string()), // Array of contentMediaIds to keep from existing content
  added: z.array(addedMediaSchema), // New files with contentMediaIds to upload
});

// Define the input for creating a capsule
export const capsuleCreateInput = z.object({
  openingDate: z.string(), // YYYY-MM-DD format
  
  // Content - Plate.js JSON string (contains contentMediaIds for media nodes)
  content: z.string(),
  
  openingMessage: z.string().optional(),
  
  // Lock mechanism (optional)
  isLocked: z.boolean().default(false),
  lockType: lockTypeSchema.optional(),
  lockConfig: lockConfigSchema.optional(),
  
  // Media field for handling file uploads
  media: mediaSchema,
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
