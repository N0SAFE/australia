import z from "zod/v4";

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  emailVerified: z.coerce.boolean(),
  image: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  role: z.string().nullable().optional(),
  invitationStatus: z.enum(['pending', 'accepted', 'expired']).nullable().optional(),
  invitationToken: z.string().nullable().optional(),
});
