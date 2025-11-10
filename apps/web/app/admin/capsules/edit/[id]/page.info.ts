import { z } from "zod";

export const Route = {
  name: "AdminCapsulesEditId",
  params: z.object({
    id: z.string(),
  })
};

