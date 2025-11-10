import { z } from "zod";

export const Route = {
  name: "UserAppLayoutCapsulesDateDate",
  params: z.object({
    date: z.string(),
  })
};

