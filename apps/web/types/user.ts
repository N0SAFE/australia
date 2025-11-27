import type { z } from 'zod'
import { userListOutput } from '@repo/api-contracts'
import { userSchema } from '@repo/api-contracts/common/user'

export type User = z.infer<typeof userSchema> & {
  /**
   * Roles array computed from the role field for backward compatibility
   * with components expecting an array format.
   */
  roles?: Array<'admin' | 'user' | 'content' | 'sarah'>
}

export type UserListResponse = z.infer<typeof userListOutput>

export type NewUser = {
  name: string;
  email: string;
  password: string;
}