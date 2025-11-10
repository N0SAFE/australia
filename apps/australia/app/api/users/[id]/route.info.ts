import { z } from "zod";

export const Route = {
  name: "ApiUsersId",
  params: z.object({
    id: z.string(),
  })
};

export const GET = {
  result: z.object({}),
};
