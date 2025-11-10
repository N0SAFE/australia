import { useMutation } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { toast } from 'sonner'

/**
 * Mutation hook to upload an image file
 */
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

/**
 * Mutation hook to upload a video file
 */
export function useUploadVideo() {
  return useMutation(orpc.storage.uploadVideo.mutationOptions({
    onSuccess: (result) => {
      toast.success(`Video uploaded successfully: ${result.filename}`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload video: ${error.message}`)
    },
  }))
}

/**
 * Mutation hook to upload an audio file
 */
export function useUploadAudio() {
  return useMutation(orpc.storage.uploadAudio.mutationOptions({
    onSuccess: (result) => {
      toast.success(`Audio uploaded successfully: ${result.filename}`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload audio: ${error.message}`)
    },
  }))
}

/**
 * Composite hook for all storage operations
 */
export function useStorage() {
  const uploadImage = useUploadImage()
  const uploadVideo = useUploadVideo()
  const uploadAudio = useUploadAudio()

  return {
    // Upload methods
    uploadImage: uploadImage.mutate,
    uploadImageAsync: uploadImage.mutateAsync,
    uploadVideo: uploadVideo.mutate,
    uploadVideoAsync: uploadVideo.mutateAsync,
    uploadAudio: uploadAudio.mutate,
    uploadAudioAsync: uploadAudio.mutateAsync,
    
    // Loading states
    isUploading: {
      image: uploadImage.isPending,
      video: uploadVideo.isPending,
      audio: uploadAudio.isPending,
      any: uploadImage.isPending || uploadVideo.isPending || uploadAudio.isPending,
    },
    
    // Error states
    errors: {
      image: uploadImage.error,
      video: uploadVideo.error,
      audio: uploadAudio.error,
    },
    
    // Upload progress (if available)
    data: {
      image: uploadImage.data,
      video: uploadVideo.data,
      audio: uploadAudio.data,
    },
  }
}
