import { orpc } from '@/lib/orpc'

export async function getUsers(params: {
  pagination?: { page?: number; pageSize?: number }
  sort?: { field?: string; direction?: 'asc' | 'desc' }
  filter?: Record<string, unknown>
} = {}) {
  const pageSize = params.pagination?.pageSize || 20
  const page = params.pagination?.page || 1
  
  return orpc.user.list.call({
    pagination: { limit: pageSize, offset: (page - 1) * pageSize },
    sort: { field: params.sort?.field as any || 'name', direction: params.sort?.direction || 'asc' },
    filter: params.filter,
  })
}
/**
 * Direct async function for fetching a single user (for server components)
 */
export async function getUser(userId: string) {
  return orpc.user.findById.call({ id: userId })
}
