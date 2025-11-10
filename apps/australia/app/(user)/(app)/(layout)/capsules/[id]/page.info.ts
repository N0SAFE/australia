import { z } from "zod";

export const Route = {
  name: "UserAppLayoutCapsulesId",
  params: z.object({
    id: z.string(),
  })
};

