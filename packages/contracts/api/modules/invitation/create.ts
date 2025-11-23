import z from "zod/v4";
import { oc } from "@orpc/contract";

// Define valid roles - must match backend permission config
const roleSchema = z.enum(["admin", "sarah", "manager", "editor", "viewer", "user", "superAdmin"]);

export const invitationCreateInput = z.object({
  email: z.email(),
  role: roleSchema.optional().default("user"),
});

export const invitationCreateOutput = z.object({
  success: z.coerce.boolean(),
  token: z.string(),
  expiresAt: z.iso.datetime(),
});

export const invitationCreateContract = oc
  .route({
    method: "POST",
    path: "/create",
    summary: "Create an invitation",
    description: "Create a new invitation token for a user with an email and optional role",
  })
  .input(invitationCreateInput)
  .output(invitationCreateOutput);
