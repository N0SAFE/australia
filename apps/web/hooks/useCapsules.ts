import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { toast } from 'sonner'

/**
 * Query hook to fetch all capsules with pagination and sorting
 */
export function useCapsules(options?: {
  pagination?: { page?: number; pageSize?: number }
  sort?: { field?: 'openingDate' | 'createdAt'; direction?: 'asc' | 'desc' }
  enabled?: boolean
}) {
  const pageSize = options?.pagination?.pageSize || 20
  const page = options?.pagination?.page || 1
  
  const params = {
    pagination: {
      limit: pageSize,
      offset: (page - 1) * pageSize,
    },
    sort: {
      field: (options?.sort?.field || 'openingDate') as 'openingDate' | 'createdAt',
      direction: options?.sort?.direction || 'asc' as const,
    },
  }

  return useQuery(orpc.capsule.list.queryOptions({
    input: params,
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
  }))
}

/**
 * Query hook to fetch a single capsule by ID
 */
export function useCapsule(capsuleId: string, options?: { enabled?: boolean }) {
  return useQuery(orpc.capsule.findById.queryOptions({
    input: { id: capsuleId },
    enabled: (options?.enabled ?? true) && !!capsuleId,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
  }))
}

/**
 * Query hook to fetch capsules by a specific day
 */
export function useCapsulesByDay(day: string, options?: { enabled?: boolean }) {
  return useQuery(orpc.capsule.findByDay.queryOptions({
    input: { day },
    enabled: (options?.enabled ?? true) && !!day,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
  }))
}

/**
 * Query hook to fetch capsules by month
 */
export function useCapsulesByMonth(month: string, options?: { enabled?: boolean }) {
  return useQuery(orpc.capsule.findByMonth.queryOptions({
    input: { month },
    enabled: (options?.enabled ?? true) && !!month,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  }))
}

/**
 * Query hook to fetch recent capsules for home page
 * Returns capsules from past week + all locked + all unread from past
 */
export function useRecentCapsules(options?: { enabled?: boolean }) {
  return useQuery(orpc.capsule.getRecent.queryOptions({
    input: {},
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
  }))
}

/**
 * Mutation hook to create a new capsule
 */
export function useCreateCapsule() {
  const queryClient = useQueryClient()
  
  return useMutation(orpc.capsule.create.mutationOptions({
    onSuccess: (newCapsule) => {
      // Invalidate all capsule list queries
      queryClient.invalidateQueries({ 
        queryKey: orpc.capsule.list.key()
      })
      
      // Invalidate all month/day queries
      queryClient.invalidateQueries({ 
        queryKey: orpc.capsule.findByMonth.key()
      })
      queryClient.invalidateQueries({ 
        queryKey: orpc.capsule.findByDay.key()
      })
      
      // Invalidate recent capsules query
      queryClient.invalidateQueries({ 
        queryKey: orpc.capsule.getRecent.key()
      })
      
      toast.success('Capsule created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create capsule: ${error.message}`)
    },
  }))
}

/**
 * Mutation hook to update an existing capsule
 */
export function useUpdateCapsule() {
  const queryClient = useQueryClient()
  
  return useMutation(orpc.capsule.update.mutationOptions({
    onSuccess: (updatedCapsule, variables) => {
      // Invalidate the specific capsule query
      queryClient.invalidateQueries({ 
        queryKey: orpc.capsule.findById.key({ input: { id: variables.id } }) 
      })
      
      // Invalidate all capsule list queries
      queryClient.invalidateQueries({ 
        queryKey: orpc.capsule.list.key()
      })
      
      // Invalidate all month/day queries
      queryClient.invalidateQueries({ 
        queryKey: orpc.capsule.findByMonth.key()
      })
      queryClient.invalidateQueries({ 
        queryKey: orpc.capsule.findByDay.key()
      })
      
      // Invalidate recent capsules query
      queryClient.invalidateQueries({ 
        queryKey: orpc.capsule.getRecent.key()
      })
      
      toast.success('Capsule updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update capsule: ${error.message}`)
    },
  }))
}

/**
 * Mutation hook to delete a capsule
 */
export function useDeleteCapsule() {
  const queryClient = useQueryClient()
  
  return useMutation(orpc.capsule.delete.mutationOptions({
    onSuccess: (_, variables) => {
      // Remove the specific capsule from cache
      queryClient.removeQueries({ 
        queryKey: orpc.capsule.findById.key({ input: { id: variables.id } }) 
      })
      
      // Invalidate all capsule list queries
      queryClient.invalidateQueries({ 
        queryKey: orpc.capsule.list.key()
      })
      
      // Invalidate all month and day queries
      queryClient.invalidateQueries({ 
        queryKey: orpc.capsule.findByMonth.key()
      })
      queryClient.invalidateQueries({ 
        queryKey: orpc.capsule.findByDay.key()
      })
      
      // Invalidate recent capsules query
      queryClient.invalidateQueries({ 
        queryKey: orpc.capsule.getRecent.key()
      })
      
      toast.success('Capsule deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete capsule: ${error.message}`)
    },
  }))
}

/**
 * Mutation hook to unlock a capsule
 */
export function useUnlockCapsule() {
  const queryClient = useQueryClient()
  
  return useMutation(orpc.capsule.unlock.mutationOptions({
    onSuccess: (result, variables) => {
      if (result.success) {
        // Invalidate ALL capsule queries to update the unlocked status everywhere
        queryClient.invalidateQueries({ 
          queryKey: orpc.capsule.key()
        })
        
        // Don't show toast for admin preview mode
        if (!result.message?.includes('admin preview')) {
          toast.success(result.message || 'Capsule déverrouillée avec succès')
        }
      } else {
        toast.error(result.message || 'Échec du déverrouillage')
      }
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors du déverrouillage: ${error.message}`)
    },
  }))
}

/**
 * Mutation hook to mark a capsule as opened
 */
export function useMarkCapsuleAsOpened() {
  const queryClient = useQueryClient()
  
  return useMutation(orpc.capsule.markAsOpened.mutationOptions({
    onSuccess: (result, variables) => {
      if (result.success) {
        // Invalidate ALL capsule queries to update the openedAt status everywhere
        queryClient.invalidateQueries({ 
          queryKey: orpc.capsule.key()
        })
        
        // Don't show toast for admin preview mode
        if (!result.message?.includes('admin preview')) {
          toast.success('Capsule marked as opened')
        }
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark capsule as opened: ${error.message}`)
    },
  }))
}

/**
 * Utility hook combining all capsule mutations
 */
export function useCapsuleActions() {
  const createCapsule = useCreateCapsule()
  const updateCapsule = useUpdateCapsule()
  const deleteCapsule = useDeleteCapsule()
  const unlockCapsule = useUnlockCapsule()
  const markAsOpened = useMarkCapsuleAsOpened()

  return {
    // Convenience methods
    createCapsule: createCapsule.mutate,
    createCapsuleAsync: createCapsule.mutateAsync,
    updateCapsule: updateCapsule.mutate,
    updateCapsuleAsync: updateCapsule.mutateAsync,
    deleteCapsule: deleteCapsule.mutate,
    deleteCapsuleAsync: deleteCapsule.mutateAsync,
    unlockCapsule: unlockCapsule.mutate,
    unlockCapsuleAsync: unlockCapsule.mutateAsync,
    markAsOpened: markAsOpened.mutate,
    markAsOpenedAsync: markAsOpened.mutateAsync,
    
    // Grouped loading states
    isLoading: {
      create: createCapsule.isPending,
      update: updateCapsule.isPending,
      delete: deleteCapsule.isPending,
      unlock: unlockCapsule.isPending,
      markAsOpened: markAsOpened.isPending,
    },
    
    // Grouped error states
    errors: {
      create: createCapsule.error,
      update: updateCapsule.error,
      delete: deleteCapsule.error,
      unlock: unlockCapsule.error,
      markAsOpened: markAsOpened.error,
    },
  }
}

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
