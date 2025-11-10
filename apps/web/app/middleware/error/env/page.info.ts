import { z } from "zod";

export const Route = {
  name: "MiddlewareErrorEnv",
  params: z.object({}),
  search: z.object({
    from: z.string().optional(),
  }),
};

