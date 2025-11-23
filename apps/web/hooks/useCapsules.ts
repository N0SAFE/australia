'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { orpc } from '@/lib/orpc'
import { withFileUploads } from '@/lib/orpc/withFileUploads'
import { toast } from 'sonner'
import type { CapsuleUploadProgressEvent } from '@repo/api-contracts'
import type { Capsule } from '@/types/capsule'

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
 * Hook to track capsule upload progress via SSE
 * Automatically subscribes to progress updates for a given operation
 */
export function useCapsuleUploadProgress(operationId: string | null, options?: {
  onProgress?: (event: CapsuleUploadProgressEvent) => void
  onComplete?: (event: CapsuleUploadProgressEvent) => void
  onError?: (error: Error) => void
  enabled?: boolean
}) {
  return useQuery(
    orpc.capsule.subscribeUploadProgress.experimental_liveOptions({
      input: { operationId: operationId ?? '' },
      enabled: (options?.enabled ?? true) && !!operationId,
      onData: (event: CapsuleUploadProgressEvent) => {
        options?.onProgress?.(event)
        
        if (event.stage === 'completed') {
          options?.onComplete?.(event)
        }
        
        if (event.stage === 'failed') {
          options?.onError?.(new Error(event.message))
        }
      },
    })
  )
}

/**
 * Hook to create a capsule with background upload and progress tracking
 * Returns upload state and progress information
 */
export function useCreateCapsuleWithProgress(options?: {
  onUploadStart?: (operationId: string) => void
  onUploadProgress?: (event: CapsuleUploadProgressEvent) => void
  onUploadComplete?: (capsule: Capsule) => void
  onUploadError?: (error: Error) => void
}) {
  const queryClient = useQueryClient()
  const [operationId, setOperationId] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStage, setUploadStage] = useState<string | null>(null)
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)
  const [capsuleId, setCapsuleId] = useState<string | null>(null)

  // Subscribe to upload progress
  const progressQuery = useCapsuleUploadProgress(operationId, {
    enabled: !!operationId,
    onProgress: (event) => {
      setUploadProgress(event.progress)
      setUploadStage(event.stage)
      setUploadMessage(event.message)
      
      if (event.capsuleId) {
        setCapsuleId(event.capsuleId)
      }
      
      options?.onUploadProgress?.(event)
    },
    onComplete: (event) => {
      setUploadProgress(100)
      setUploadStage('completed')
      
      // Invalidate all queries after completion
      queryClient.invalidateQueries({ queryKey: orpc.capsule.list.key() })
      queryClient.invalidateQueries({ queryKey: orpc.capsule.findByMonth.key() })
      queryClient.invalidateQueries({ queryKey: orpc.capsule.findByDay.key() })
      queryClient.invalidateQueries({ queryKey: orpc.capsule.getRecent.key() })
      
      if (event.capsuleId) {
        queryClient.invalidateQueries({ 
          queryKey: orpc.capsule.findById.key({ input: { id: event.capsuleId } }) 
        })
      }
      
      toast.success('Capsule created and processed successfully')
      
      // Fetch the completed capsule and call callback
      if (event.capsuleId) {
        orpc.capsule.findById.call({ id: event.capsuleId }).then((capsule) => {
          if (capsule) {
            options?.onUploadComplete?.(capsule)
          }
        })
      }
    },
    onError: (error) => {
      setUploadStage('failed')
      toast.error(`Upload failed: ${error.message}`)
      options?.onUploadError?.(error)
    },
  })

  // Create mutation (initiates background upload)
  const uploadMutation = useMutation({
    mutationFn: async (variables: Parameters<typeof orpc.capsule.create.call>[0]) => {
      // Generate unique operation ID
      const opId = `capsule-${Date.now()}-${Math.random().toString(36).substring(7)}`
      setOperationId(opId)
      setUploadProgress(0)
      setUploadStage('creating_capsule')
      
      options?.onUploadStart?.(opId)
      
      // Call with operation ID to enable background processing
      return await orpc.capsule.create.call({
        ...variables,
        operationId: opId,
      } as any)
    },
    onError: (error: Error) => {
      setUploadStage('failed')
      toast.error(`Failed to start upload: ${error.message}`)
      options?.onUploadError?.(error)
    },
  })

  return {
    // Mutation functions
    upload: uploadMutation.mutate,
    uploadAsync: uploadMutation.mutateAsync,
    
    // Upload state
    isUploading: uploadMutation.isPending || (uploadStage !== null && uploadStage !== 'completed' && uploadStage !== 'failed'),
    uploadProgress,
    uploadStage,
    uploadMessage,
    
    // Result state
    capsuleId,
    operationId,
    
    // Error state
    uploadError: uploadMutation.error || progressQuery.error,
    
    // Combined busy state
    isBusy: uploadMutation.isPending || progressQuery.isFetching,
  }
}

/**
 * Hook to update a capsule with background upload and progress tracking
 * Similar to create but for updates
 */
export function useUpdateCapsuleWithProgress(options?: {
  onUploadStart?: (operationId: string) => void
  onUploadProgress?: (event: CapsuleUploadProgressEvent) => void
  onUploadComplete?: (capsule: Capsule) => void
  onUploadError?: (error: Error) => void
}) {
  const queryClient = useQueryClient()
  const [operationId, setOperationId] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStage, setUploadStage] = useState<string | null>(null)
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)
  const [capsuleId, setCapsuleId] = useState<string | null>(null)

  // Subscribe to upload progress
  const progressQuery = useCapsuleUploadProgress(operationId, {
    enabled: !!operationId,
    onProgress: (event) => {
      setUploadProgress(event.progress)
      setUploadStage(event.stage)
      setUploadMessage(event.message)
      
      if (event.capsuleId) {
        setCapsuleId(event.capsuleId)
      }
      
      options?.onUploadProgress?.(event)
    },
    onComplete: (event) => {
      setUploadProgress(100)
      setUploadStage('completed')
      
      // Invalidate all queries after completion
      queryClient.invalidateQueries({ queryKey: orpc.capsule.list.key() })
      queryClient.invalidateQueries({ queryKey: orpc.capsule.findByMonth.key() })
      queryClient.invalidateQueries({ queryKey: orpc.capsule.findByDay.key() })
      queryClient.invalidateQueries({ queryKey: orpc.capsule.getRecent.key() })
      
      if (event.capsuleId) {
        queryClient.invalidateQueries({ 
          queryKey: orpc.capsule.findById.key({ input: { id: event.capsuleId } }) 
        })
      }
      
      toast.success('Capsule updated and processed successfully')
      
      // Fetch the completed capsule and call callback
      if (event.capsuleId) {
        orpc.capsule.findById.call({ id: event.capsuleId }).then((capsule) => {
          if (capsule) {
            options?.onUploadComplete?.(capsule)
          }
        })
      }
    },
    onError: (error) => {
      setUploadStage('failed')
      toast.error(`Update failed: ${error.message}`)
      options?.onUploadError?.(error)
    },
  })

  // Update mutation (initiates background upload)
  const uploadMutation = useMutation({
    mutationFn: async (variables: Parameters<typeof orpc.capsule.update.call>[0]) => {
      // Generate unique operation ID
      const opId = `capsule-update-${Date.now()}-${Math.random().toString(36).substring(7)}`
      setOperationId(opId)
      setUploadProgress(0)
      setUploadStage('creating_capsule')
      setCapsuleId(variables.id)
      
      options?.onUploadStart?.(opId)
      
      // Call with operation ID to enable background processing
      return await orpc.capsule.update.call({
        ...variables,
        operationId: opId,
      } as any)
    },
    onError: (error: unknown) => {
      setUploadStage('failed')
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to start update: ${message}`)
      options?.onUploadError?.(error instanceof Error ? error : new Error(String(error)))
    },
  })

  return {
    // Mutation functions
    update: uploadMutation.mutate,
    updateAsync: uploadMutation.mutateAsync,
    
    // Upload state
    isUpdating: uploadMutation.isPending || (uploadStage !== null && uploadStage !== 'completed' && uploadStage !== 'failed'),
    uploadProgress,
    uploadStage,
    uploadMessage,
    
    // Result state
    capsuleId,
    operationId,
    
    // Error state
    uploadError: uploadMutation.error || progressQuery.error,
    
    // Combined busy state
    isBusy: uploadMutation.isPending || progressQuery.isFetching,
  }
}
