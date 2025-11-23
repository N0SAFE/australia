import { ReactNodeViewRenderer } from "@tiptap/react"
import { Node, mergeAttributes } from "@tiptap/core"
import { VideoUploadNode } from "./video-upload-node"

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    videoUpload: {
      addVideoUpload: () => ReturnType
    }
  }
}

/**
 * Video upload function type that returns upload result with URL and optional metadata
 */
export type VideoUploadFunction = (
  file: File,
  onProgress: (event: { progress: number }) => void,
  signal: AbortSignal
) => Promise<{ url: string; meta?: unknown }>

export interface VideoUploadOptions {
  /**
   * Maximum allowed file size in bytes (no limit by default)
   * @default Infinity
   */
  maxSize: number
  /**
   * Maximum number of files that can be uploaded at once
   * @default 1
   */
  limit: number
  /**
   * String specifying acceptable file types (MIME types or extensions)
   * 
   * @default "video/*"
   */
  accept: string
  /**
   * Function that handles the actual file upload process
   * @param {File} file - The file to be uploaded
   * @param {Function} onProgress - Callback function to report upload progress
   * @param {AbortSignal} signal - Signal that can be used to abort the upload
   * @returns {Promise<UploadResult>} Promise resolving to upload result with URL and optional meta
   */
  upload: VideoUploadFunction
  /**
   * Function to prepare file before upload (e.g., sanitize filename)
   * @param {File} file - The original file
   * @returns {File} The modified file
   * @optional
   */
  prepareForUpload?: (file: File) => File
  /**
   * Callback triggered when a file is uploaded successfully
   * @param {string} url - URL of the successfully uploaded file
   * @optional
   */
  onSuccess?: (url: string) => void
  /**
   * Callback triggered when an error occurs during upload
   * @param {Error} error - The error that occurred
   * @optional
   */
  onError?: (error: Error) => void
  /**
   * The type of node to insert after successful upload
   * @default "video"
   */
  type: string
}

export const VideoUploadExtension = Node.create<VideoUploadOptions>({
  name: "videoUpload",

  group: "block",

  atom: true,

  draggable: true,

  addOptions() {
    return {
      maxSize: Infinity, // No size limit
      limit: 1,
      accept: "video/*",
      upload: async () => {
        throw new Error("Upload function not implemented")
      },
      prepareForUpload: undefined,
      type: "video",
    }
  },

  addAttributes() {
    return {
      maxSize: {
        default: this.options.maxSize,
      },
      limit: {
        default: this.options.limit,
      },
      accept: {
        default: this.options.accept,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: "div[data-video-upload]",
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-video-upload": "" })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoUploadNode)
  },

  addCommands() {
    return {
      addVideoUpload:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
          })
        },
    }
  },
})
