import { z } from "zod";

export const Route = {
  name: "ApiCapsulesMonth",
  params: z.object({
  })
};

export const GET = {
  result: z.object({}),
};
