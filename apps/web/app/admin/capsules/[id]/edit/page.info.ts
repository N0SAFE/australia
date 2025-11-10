import { z } from "zod";

export const Route = {
  name: "AdminCapsulesIdEdit",
  params: z.object({
    id: z.string(),
  })
};

