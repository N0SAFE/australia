import { oc } from "@orpc/contract";
import { userSchema } from "@repo/api-contracts/common/user";
import { z } from "zod";

export const userUpdateInput = userSchema.partial().omit({
  image: true,
}).extend({
  id: userSchema.shape.id,
  password: z.string().min(6).optional(),
})

export const userUpdateOutput = userSchema;

export const userUpdateContract = oc
  .route({
    method: "PUT",
    path: "/{id}",
    summary: "Update an existing user",
    description: "Update an existing user in the system",
  })
  .input(userUpdateInput)
  .output(userUpdateOutput);
