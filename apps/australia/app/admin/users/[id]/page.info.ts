import { z } from "zod";

export const Route = {
  name: "AdminUsersId",
  params: z.object({
    id: z.string(),
  })
};

