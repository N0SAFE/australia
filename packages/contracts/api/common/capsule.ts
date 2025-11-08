import z from "zod/v4";

export const capsuleSchema = z.object({
  id: z.string(),
  openingDate: z.string(), // YYYY-MM-DD format
  content: z.string(),
  openingMessage: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
