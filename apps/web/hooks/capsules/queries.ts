import { orpc } from '@/lib/orpc'

/**
 * Direct async function for fetching capsules (for server components)
 */
export async function getCapsules(params: {
  pagination?: { page?: number; pageSize?: number }
  sort?: { field?: 'openingDate' | 'createdAt'; direction?: 'asc' | 'desc' }
} = {}) {
  const pageSize = params.pagination?.pageSize || 20
  const page = params.pagination?.page || 1
  
  return orpc.capsule.list.call({
    pagination: { limit: pageSize, offset: (page - 1) * pageSize },
    sort: { field: params.sort?.field || 'openingDate', direction: params.sort?.direction || 'asc' },
  })
}

/**
 * Direct async function for fetching a single capsule (for server components)
 */
export async function getCapsule(capsuleId: string) {
  return orpc.capsule.findById.call({ id: capsuleId })
}

/**
 * Direct async function for fetching capsules by day (for server components)
 */
export async function getCapsulesByDay(day: string) {
  return orpc.capsule.findByDay.call({ day })
}

/**
 * Direct async function for fetching capsules by month (for server components)
 */
export async function getCapsulesByMonth(month: string) {
  console.log(month)
  return orpc.capsule.findByMonth.call({ month })
}

/**
 * Direct async function for fetching recent capsules (for server components)
 * Returns capsules from past week + all locked + all unread from past
 */
export async function getRecentCapsules() {
  return orpc.capsule.getRecent.call({})
}
