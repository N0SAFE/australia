import { z } from "zod";

export const Route = {
  name: "InviteCode",
  params: z.object({
    code: z.string(),
  }),
  search: z.object({
    redirectUrl: z.string().optional(),
  })
};

