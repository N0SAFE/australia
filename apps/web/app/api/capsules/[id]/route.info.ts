import { z } from "zod";

export const Route = {
  name: "ApiCapsulesId",
  params: z.object({
    id: z.string(),
  })
};

export const GET = {
  result: z.object({}),
};
