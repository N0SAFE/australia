import type { z } from 'zod'
import { userListOutput } from '@repo/api-contracts'
import { userSchema } from '@repo/api-contracts/common/user'

export type User = z.infer<typeof userSchema> & {
  /**
   * Legacy role information added by the auth layer or mock API.
   * The real API currently exposes only `name`, `email`, etc.,
   * so this remains optional and should be feature-gated at usage sites.
   */
  roles?: Array<'admin' | 'user' | 'content'>
}

export type UserListResponse = z.infer<typeof userListOutput>

export type NewUser = {
  name: string;
  email: string;
  password: string;
}