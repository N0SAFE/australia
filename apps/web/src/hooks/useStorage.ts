'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { toast } from 'sonner'

/**
 * Storage management hooks for file upload and retrieval
 * 
 * These hooks provide file management capabilities:
 * - Image upload (up to 5MB, jpg, jpeg, png, gif, webp)
 * - Video upload (up to 50MB, mp4, avi, mov, mkv, webm)
 * - Audio upload (up to 10MB, mp3, wav, ogg, m4a, aac)
 * - File retrieval by filename
 */

// Hook to upload an image file
export function useUploadImage() {
  return useMutation(orpc.storage.uploadImage.mutationOptions({
    onSuccess: (result) => {
      toast.success(`Image uploaded successfully: ${result.filename}`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload image: ${error.message}`)
    },
  }))
}

// Hook to upload a video file
export function useUploadVideo() {
  return useMutation(orpc.storage.uploadVideo.mutationOptions({
    onSuccess: (result) => {
      toast.success(`Video uploaded successfully: ${result.filename.toString()}`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload video: ${error.message}`)
    },
  }))
}

// Hook to upload an audio file
export function useUploadAudio() {
  return useMutation(orpc.storage.uploadAudio.mutationOptions({
    onSuccess: (result) => {
      toast.success(`Audio uploaded successfully: ${result.filename.toString()}`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload audio: ${error.message}`)
    },
  }))
}

// Hook to retrieve a file by filename
export function useGetFile(filename: string, options?: {
  enabled?: boolean
}) {
  return useQuery(orpc.storage.getFile.queryOptions({
    input: { filename },
    enabled: (options?.enabled ?? true) && !!filename,
    staleTime: 1000 * 60 * 5, // 5 minutes - files don't change often
    gcTime: 1000 * 60 * 10, // 10 minutes
  }))
}

// Utility hook that combines all upload mutations
export function useStorageActions() {
  const uploadImage = useUploadImage()
  const uploadVideo = useUploadVideo()
  const uploadAudio = useUploadAudio()

  return {
    // Mutation methods
    uploadImage: uploadImage.mutate,
    uploadImageAsync: uploadImage.mutateAsync,
    uploadVideo: uploadVideo.mutate,
    uploadVideoAsync: uploadVideo.mutateAsync,
    uploadAudio: uploadAudio.mutate,
    uploadAudioAsync: uploadAudio.mutateAsync,
    
    // Loading states
    isLoading: {
      image: uploadImage.isPending,
      video: uploadVideo.isPending,
      audio: uploadAudio.isPending,
    },
    
    // Error states
    errors: {
      image: uploadImage.error,
      video: uploadVideo.error,
      audio: uploadAudio.error,
    },
  }
}

// Type exports for components
export interface UploadResult {
  filename: string
  path: string
  size: number
  mimeType: string
}

export interface FileData {
  file: Buffer
  mimeType: string
  size: number
}
