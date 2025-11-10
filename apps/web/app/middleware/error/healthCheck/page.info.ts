import { z } from "zod";

export const Route = {
  name: "MiddlewareErrorHealthCheck",
  params: z.object({}),
  search: z.object({
    json: z.string().optional(),
    from: z.string().optional(),
  }),
};
