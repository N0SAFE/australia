import { z } from "zod";
import { oc } from "@orpc/contract";

export const invitationValidateInput = z.object({
  token: z.string(),
  password: z.string().min(8),
  name: z.string().min(1),
});

export const invitationValidateOutput = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    message: z.string(),
    userId: z.string(),
  }),
  z.object({
    success: z.literal(false),
    message: z.string(),
  }),
]);

export const invitationValidateContract = oc
  .route({
    method: "POST",
    path: "/validate",
    summary: "Validate an invitation",
    description: "Validate an invitation token and create a user account with a password",
  })
  .input(invitationValidateInput)
  .output(invitationValidateOutput);
