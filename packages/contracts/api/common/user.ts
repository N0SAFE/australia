import z from "zod/v4";

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  invitationStatus: z.enum(['pending', 'accepted', 'expired']).nullable().optional(),
  invitationToken: z.string().nullable().optional(),
});
