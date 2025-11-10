import { z } from "zod";

export const Route = {
  name: "ApiCapsules",
  params: z.object({
  })
};

export const GET = {
  result: z.object({}),
};
