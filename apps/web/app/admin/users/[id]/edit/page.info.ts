import { z } from "zod";

export const Route = {
  name: "AdminUsersIdEdit",
  params: z.object({
    id: z.string(),
  })
};

