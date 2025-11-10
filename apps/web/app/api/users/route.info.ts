import { z } from "zod";

export const Route = {
  name: "ApiUsers",
  params: z.object({
  })
};

export const GET = {
  result: z.object({}),
};
