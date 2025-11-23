import { useState } from "react"
import type { FileItem, UploadOptions } from "./types"

/**
 * Custom hook for managing multiple file uploads with progress tracking and cancellation
 */
export function useFileUpload(options: UploadOptions) {
  const [fileItems, setFileItems] = useState<FileItem[]>([])

  const uploadFile = async (file: File): Promise<{ url: string; meta?: unknown } | null> => {
    const abortController = new AbortController()
    const fileId = crypto.randomUUID()

    const newFileItem: FileItem = {
      id: fileId,
      file,
      progress: 0,
      status: "uploading",
      abortController,
    }

    setFileItems((prev) => [...prev, newFileItem])

    try {
      const result = await options.upload(
        file,
        (event: { progress: number }) => {
          setFileItems((prev) =>
            prev.map((item) =>
              item.id === fileId ? { ...item, progress: Math.round(event.progress) } : item
            )
          )
        },
        abortController.signal
      )

      // For blob URL strategy (local editing), meta.contentMediaId is returned
      // For API strategy (immediate upload), meta.fileId is returned
      if (!result.meta) {
        throw new Error("Upload failed: No meta object returned")
      }
      
      const meta = result.meta as Record<string, unknown>
      const hasValidId = Boolean(meta.fileId ?? meta.contentMediaId)
      
      if (!hasValidId) {
        throw new Error("Upload failed: No fileId or contentMediaId returned in meta")
      }

      if (!abortController.signal.aborted) {
        setFileItems((prev) =>
          prev.map((item) =>
            item.id === fileId
              ? { ...item, status: "success", meta: result.meta, url: result.url, progress: 100 }
              : item
          )
        )
        // Pass fileId if available (API strategy), otherwise contentMediaId (local strategy)
        const identifier = (meta.fileId ?? meta.contentMediaId) as string
        options.onSuccess?.(identifier)
        return result
      }

      return null
    } catch (error) {
      if (!abortController.signal.aborted) {
        setFileItems((prev) =>
          prev.map((item) =>
            item.id === fileId
              ? { ...item, status: "error", progress: 0 }
              : item
          )
        )
        options.onError?.(
          error instanceof Error ? error : new Error("Upload failed")
        )
      }
      return null
    }
  }

  const uploadFiles = async (files: File[]): Promise<{ url: string; meta?: unknown }[]> => {
    if (files.length === 0) {
      options.onError?.(new Error("No files to upload"))
      return []
    }

    if (options.limit && files.length > options.limit) {
      options.onError?.(
        new Error(
          `Maximum ${options.limit} file${options.limit === 1 ? "" : "s"} allowed`
        )
      )
      return []
    }

    // Upload all files concurrently
    const uploadPromises = files.map((file) => uploadFile(file))
    const results = await Promise.all(uploadPromises)

    // Filter out null results (failed uploads)
    const successfulUploads = results.filter(
      (result): result is { url: string; meta?: unknown } => result !== null
    )
    
    return successfulUploads
  }

  const removeFileItem = (fileId: string) => {
    setFileItems((prev) => {
      const fileToRemove = prev.find((item) => item.id === fileId)
      if (fileToRemove?.abortController) {
        fileToRemove.abortController.abort()
      }
      if (fileToRemove?.url) {
        URL.revokeObjectURL(fileToRemove.url)
      }
      return prev.filter((item) => item.id !== fileId)
    })
  }

  const clearAllFiles = () => {
    fileItems.forEach((item) => {
      if (item.abortController) {
        item.abortController.abort()
      }
      if (item.url) {
        URL.revokeObjectURL(item.url)
      }
    })
    setFileItems([])
  }

  return {
    fileItems,
    uploadFiles,
    removeFileItem,
    clearAllFiles,
  }
}
