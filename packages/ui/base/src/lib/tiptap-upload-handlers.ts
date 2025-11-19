/**
 * Upload Handler Utilities for Tiptap Editor
 * 
 * These functions serve as bridges between the Tiptap editor and the useStorage hooks,
 * providing file validation, progress tracking, and error handling for media uploads.
 */

import { toast } from "sonner"

// File size limits removed - no restrictions

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const value = Math.round(bytes / Math.pow(k, i) * 100) / 100
  return `${String(value)} ${sizes[i]}`
}

/**
 * Handle image upload
 * 
 * @param file - The image file to upload
 * @param uploadImageFn - The upload function from useStorage hook
 * @param onProgress - Optional progress callback
 * @param signal - Optional AbortSignal for cancellation
 * @returns Promise resolving to the image URL
 */
export async function handleImageUpload(
  file: File,
  uploadImageFn: (file: File) => Promise<{ path: string }>,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
): Promise<string> {
  try {
    // Check if upload was aborted
    if (signal?.aborted) {
      throw new Error("Upload cancelled")
    }

    // Call upload function
    const result = await uploadImageFn(file)
    
    // Return the image URL
    return result.path
  } catch (error) {
    console.error("Image upload failed:", error)
    throw error
  }
}

/**
 * Handle video upload
 * 
 * @param file - The video file to upload
 * @param uploadVideoFn - The upload function from useStorage hook
 * @param onProgress - Optional progress callback
 * @param signal - Optional AbortSignal for cancellation
 * @returns Promise resolving to video URL and videoId for processing subscription
 */
export async function handleVideoUpload(
  file: File,
  uploadVideoFn: (file: File) => Promise<{ 
    videoId: string
    path: string
    isProcessed: boolean 
  }>,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
): Promise<{ url: string; videoId: string; isProcessed: boolean }> {
  try {
    // Check if upload was aborted
    if (signal?.aborted) {
      throw new Error("Upload cancelled")
    }

    // Call upload function
    const result = await uploadVideoFn(file)
    
    // Return video URL and videoId for processing subscription
    return {
      url: result.path,
      videoId: result.videoId,
      isProcessed: result.isProcessed
    }
  } catch (error) {
    console.error("Video upload failed:", error)
    throw error
  }
}

/**
 * Handle audio upload
 * 
 * @param file - The audio file to upload
 * @param uploadAudioFn - The upload function from useStorage hook
 * @param onProgress - Optional progress callback
 * @param signal - Optional AbortSignal for cancellation
 * @returns Promise resolving to the audio URL
 */
export async function handleAudioUpload(
  file: File,
  uploadAudioFn: (file: File) => Promise<{ path: string }>,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
): Promise<string> {
  try {
    // Check if upload was aborted
    if (signal?.aborted) {
      throw new Error("Upload cancelled")
    }

    // Call upload function
    const result = await uploadAudioFn(file)
    
    // Return the audio URL
    return result.path
  } catch (error) {
    console.error("Audio upload failed:", error)
    throw error
  }
}

/**
 * Handle generic file upload
 * 
 * @param file - The file to upload
 * @param uploadFileFn - The upload function (can reuse uploadImage for now)
 * @param onProgress - Optional progress callback
 * @param signal - Optional AbortSignal for cancellation
 * @returns Promise resolving to file metadata
 */
export async function handleFileUpload(
  file: File,
  uploadFileFn: (file: File) => Promise<{ 
    path: string
    name?: string
    size?: number 
  }>,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
): Promise<{ url: string; name: string; size: number }> {
  try {
    // Check if upload was aborted
    if (signal?.aborted) {
      throw new Error("Upload cancelled")
    }

    // Call upload function
    const result = await uploadFileFn(file)
    
    // Return file metadata
    return {
      url: result.path,
      name: result.name ?? file.name,
      size: result.size ?? file.size
    }
  } catch (error) {
    console.error("File upload failed:", error)
    throw error
  }
}


