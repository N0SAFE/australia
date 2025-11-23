import { oc } from "@orpc/contract";
import z from "zod/v4";

const invitationCheckInputSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

const invitationCheckOutputSchema = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    email: z.email(),
  }),
  z.object({
    success: z.literal(false),
    message: z.string(),
  }),
]);

export const invitationCheckContract = oc
  .input(invitationCheckInputSchema)
  .output(invitationCheckOutputSchema)
  .route({
    method: "POST",
    path: "/check",
    summary: "Check invitation validity",
    description: "Check if an invitation token is valid without creating an account",
  });

export type InvitationCheckInput = z.infer<typeof invitationCheckInputSchema>;
export type InvitationCheckOutput = z.infer<typeof invitationCheckOutputSchema>;
