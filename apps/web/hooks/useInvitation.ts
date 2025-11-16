import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { orpc } from '@/lib/orpc'

/**
 * Query hook to check invitation token validity
 */
export function useCheckInvitation(token: string, options?: { enabled?: boolean }) {
  return useQuery(orpc.invitation.check.queryOptions({
    input: { token },
    enabled: (options?.enabled ?? true) && !!token,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: false, // Don't retry failed invitation checks
  }))
}

/**
 * Mutation hook to check invitation token validity
 */
export function useCheckInvitationMutation() {
  return useMutation(orpc.invitation.check.mutationOptions({
    onError: (error: Error) => {
      toast.error(`Failed to check invitation: ${error.message}`)
    },
  }))
}

/**
 * Hook to validate invitation and create user account
 */
export function useValidateInvitation() {
  const queryClient = useQueryClient()
  
  return useMutation(orpc.invitation.validate.mutationOptions({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message || 'Account created successfully!')
        // Invalidate user queries if needed
        queryClient.invalidateQueries({ queryKey: ['user'] })
      } else {
        toast.error(result.message || 'Failed to create account')
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to validate invitation: ${error.message}`)
    },
  }))
}

/**
 * Hook to create invitation (admin only)
 */
export function useCreateInvitation() {
  const queryClient = useQueryClient()
  
  return useMutation(orpc.invitation.create.mutationOptions({
    onSuccess: () => {
      toast.success('Invitation created successfully')
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
    },
    onError: (error: Error) => {
      toast.error(`Failed to create invitation: ${error.message}`)
    },
  }))
}

/**
 * Composite hook for invitation actions
 */
export function useInvitationActions() {
  const checkInvitationMutation = useCheckInvitationMutation()
  const validateInvitation = useValidateInvitation()
  const createInvitation = useCreateInvitation()

  return {
    // Convenience methods
    checkInvitation: checkInvitationMutation.mutate,
    checkInvitationAsync: checkInvitationMutation.mutateAsync,
    validateInvitation: validateInvitation.mutate,
    validateInvitationAsync: validateInvitation.mutateAsync,
    createInvitation: createInvitation.mutate,
    createInvitationAsync: createInvitation.mutateAsync,
    
    // Grouped loading states
    isLoading: {
      check: checkInvitationMutation.isPending,
      validate: validateInvitation.isPending,
      create: createInvitation.isPending,
    },
    
    // Grouped error states
    errors: {
      check: checkInvitationMutation.error,
      validate: validateInvitation.error,
      create: createInvitation.error,
    },
  }
}
