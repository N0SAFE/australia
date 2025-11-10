import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { toast } from 'sonner'
import type { User } from '@/types/user'

/**
 * Query hook to fetch all users with pagination and sorting
 */
export function useUsers(options?: {
  pagination?: { page?: number; pageSize?: number }
  sort?: { field?: keyof User; direction?: 'asc' | 'desc' }
  filter?: Partial<Pick<User, 'id' | 'email' | 'name'>>
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
      field: (options?.sort?.field || 'name') as keyof User,
      direction: options?.sort?.direction || 'asc' as const,
    },
    filter: options?.filter,
  }

  return useQuery(orpc.user.list.queryOptions({
    input: params,
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
  }))
}

/**
 * Query hook to fetch a single user by ID
 */
export function useUser(userId: string, options?: { enabled?: boolean }) {
  return useQuery(orpc.user.findById.queryOptions({
    input: { id: userId },
    enabled: (options?.enabled ?? true) && !!userId,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
  }))
}

/**
 * Mutation hook to create a new user
 */
export function useCreateUser() {
  const queryClient = useQueryClient()
  
  return useMutation(orpc.user.create.mutationOptions({
    onSuccess: (newUser) => {
      // Invalidate affected queries
      queryClient.invalidateQueries({ 
        queryKey: orpc.user.list.queryKey({ 
          input: { 
            pagination: { limit: 20, offset: 0 },
            sort: { field: 'name', direction: 'asc' }
          }
        })
      })
      
      toast.success(`User "${newUser.name}" created successfully`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to create user: ${error.message}`)
    },
  }))
}

/**
 * Mutation hook to update an existing user
 */
export function useUpdateUser() {
  const queryClient = useQueryClient()
  
  return useMutation(orpc.user.update.mutationOptions({
    onSuccess: (updatedUser, variables) => {
      // Invalidate the specific user query
      queryClient.invalidateQueries({ 
        queryKey: orpc.user.findById.queryKey({ input: { id: variables.id } }) 
      })
      
      // Invalidate list cache (user may affect sort order)
      queryClient.invalidateQueries({ 
        queryKey: orpc.user.list.queryKey({ 
          input: { 
            pagination: { limit: 20, offset: 0 },
            sort: { field: 'name', direction: 'asc' }
          }
        })
      })
      
      toast.success(`User "${updatedUser.name}" updated successfully`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to update user: ${error.message}`)
    },
  }))
}

/**
 * Mutation hook to delete a user
 */
export function useDeleteUser() {
  const queryClient = useQueryClient()
  
  return useMutation(orpc.user.delete.mutationOptions({
    onSuccess: (_, variables) => {
      // Remove from specific cache
      queryClient.removeQueries({ 
        queryKey: orpc.user.findById.queryKey({ input: { id: variables.id } }) 
      })
      
      // Invalidate list cache
      queryClient.invalidateQueries({ 
        queryKey: orpc.user.list.queryKey({ 
          input: { 
            pagination: { limit: 20, offset: 0 },
            sort: { field: 'name', direction: 'asc' }
          }
        })
      })
      
      toast.success('User deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete user: ${error.message}`)
    },
  }))
}

/**
 * Utility hook combining all user mutations
 */
export function useUserActions() {
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()

  return {
    // Convenience methods
    createUser: createUser.mutate,
    createUserAsync: createUser.mutateAsync,
    updateUser: updateUser.mutate,
    updateUserAsync: updateUser.mutateAsync,
    deleteUser: deleteUser.mutate,
    deleteUserAsync: deleteUser.mutateAsync,
    
    // Grouped loading states
    isLoading: {
      create: createUser.isPending,
      update: updateUser.isPending,
      delete: deleteUser.isPending,
    },
    
    // Grouped error states
    errors: {
      create: createUser.error,
      update: updateUser.error,
      delete: deleteUser.error,
    },
  }
}

/**
 * Direct async function for fetching users (for server components)
 */
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
