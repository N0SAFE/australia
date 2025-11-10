import { z } from "zod";

export const Route = {
  name: "AdminCapsulesId",
  params: z.object({
    id: z.string(),
  })
};

