'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { authClient } from '@/lib/auth'

/**
 * Hook to check invitation token validity
 */
export function useCheckInvitation() {
  return useMutation({
    mutationFn: async (token: string) => {
      const result = await authClient.invite.check({ token })
      if (result.error) {
        throw new Error(result.error.message ?? 'Failed to check invitation')
      }
      return result.data
    },
    onSuccess: (result) => {
      if (result?.valid) {
        toast.success('Invitation is valid')
      } else {
        toast.error(result?.message || 'Invalid invitation')
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to check invitation: ${error.message}`)
    },
  })
}

/**
 * Hook to validate invitation and create user account
 */
export function useValidateInvitation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ token, password, name }: { token: string; password: string; name: string }) => {
      const result = await authClient.invite.validate({ token, password, name })
      if (result.error) {
        throw new Error(result.error.message ?? 'Failed to validate invitation')
      }
      return result.data
    },
    onSuccess: () => {
      toast.success('Account created successfully!')
      // Invalidate session to refetch user data
      queryClient.invalidateQueries({ queryKey: ['better-auth'] })
    },
    onError: (error: Error) => {
      toast.error(`Failed to validate invitation: ${error.message}`)
    },
  })
}

/**
 * Hook to create invitation (admin only)
 */
export function useCreateInvitation() {
  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const result = await authClient.invite.create({ email, role })
      if (result.error) {
        throw new Error(result.error.message ?? 'Failed to create invitation')
      }
      return result.data
    },
    onSuccess: () => {
      toast.success('Invitation created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create invitation: ${error.message}`)
    },
  })
}

/**
 * Composite hook for invitation actions
 */
export function useInvitationActions() {
  const checkInvitation = useCheckInvitation()
  const validateInvitation = useValidateInvitation()
  const createInvitation = useCreateInvitation()

  return {
    // Convenience methods
    checkInvitation: checkInvitation.mutate,
    checkInvitationAsync: checkInvitation.mutateAsync,
    validateInvitation: validateInvitation.mutate,
    validateInvitationAsync: validateInvitation.mutateAsync,
    createInvitation: createInvitation.mutate,
    createInvitationAsync: createInvitation.mutateAsync,
    
    // Grouped loading states
    isLoading: {
      check: checkInvitation.isPending,
      validate: validateInvitation.isPending,
      create: createInvitation.isPending,
    },
    
    // Grouped error states
    errors: {
      check: checkInvitation.error,
      validate: validateInvitation.error,
      create: createInvitation.error,
    },
  }
}
