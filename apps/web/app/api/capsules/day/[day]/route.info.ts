import { z } from "zod";

export const Route = {
  name: "ApiCapsulesDayDay",
  params: z.object({
    day: z.string(),
  })
};

export const GET = {
  result: z.object({}),
};
