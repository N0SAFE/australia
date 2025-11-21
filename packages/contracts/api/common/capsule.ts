import z from "zod/v4";

// Lock types for capsule unlock mechanisms
export const lockTypeSchema = z.enum([
  "code", // PIN or password
  "voice", // Voice recognition phrase
  "device_shake", // Shake the device
  "device_tilt", // Tilt the device
  "device_tap", // Tap pattern
  "api", // External API call
  "time_based", // Automatically unlocks after a certain time
]);

// Lock configuration schemas for different lock types
export const codeLockConfigSchema = z.object({
  type: z.literal("code"),
  code: z.string(), // The code to enter
  attempts: z.number().optional(), // Max attempts allowed
});

export const voiceLockConfigSchema = z.object({
  type: z.literal("voice"),
  phrase: z.string(), // The phrase to speak (e.g., "Alohomora")
  language: z.string().optional(), // Language code (e.g., "en-US")
});

export const deviceLockConfigSchema = z.object({
  type: z.union([
    z.literal("device_shake"),
    z.literal("device_tilt"),
    z.literal("device_tap"),
  ]),
  threshold: z.number().optional(), // Sensitivity threshold
  pattern: z.array(z.number()).optional(), // Tap pattern if applicable
});

export const apiLockConfigSchema = z.object({
  type: z.literal("api"),
  endpoint: z.string(), // API endpoint to call
  method: z.enum(["GET", "POST"]).optional(),
  headers: z.record(z.string(), z.string()).optional(), // Custom headers
  expectedResponse: z.any().optional(), // Expected response to match
});

export const timeBasedLockConfigSchema = z.object({
  type: z.literal("time_based"),
  delayMinutes: z.number(), // Minutes to wait after openingDate
});

export const lockConfigSchema = z.union([
  codeLockConfigSchema,
  voiceLockConfigSchema,
  deviceLockConfigSchema,
  apiLockConfigSchema,
  timeBasedLockConfigSchema,
]);

// Attached media schema for capsule responses
export const attachedMediaSchema = z.object({
  contentMediaId: z.string(), // UUID linking content node to media record
  type: z.enum(['image', 'video', 'audio']),
  fileId: z.string(), // File ID in the file table
  filePath: z.string(), // Path to the file
  filename: z.string(), // Original filename
  mimeType: z.string(),
  size: z.number(),
  // Type-specific metadata can be added as needed
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  duration: z.number().nullable().optional(), // For video/audio
  thumbnailPath: z.string().nullable().optional(), // For video
  createdAt: z.iso.datetime(),
});

export const capsuleSchema = z.object({
  id: z.string(),
  openingDate: z.string(), // YYYY-MM-DD format
  
  // Plate.js content (JSON string with contentMediaId references in media nodes)
  content: z.string(), // Stores Plate.js Value as JSON string
  
  openingMessage: z.string().nullable(),
  
  // Lock mechanism
  isLocked: z.boolean(),
  lockType: lockTypeSchema.nullable(),
  lockConfig: lockConfigSchema.nullable(),
  unlockedAt: z.iso.datetime().nullable(),
  openedAt: z.iso.datetime().nullable(),
  isOpened: z.boolean(), // Derived from openedAt: true if openedAt is not null
  
  // Attached media - No need to parse content to find media
  attachedMedia: z.array(attachedMediaSchema),
  
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
