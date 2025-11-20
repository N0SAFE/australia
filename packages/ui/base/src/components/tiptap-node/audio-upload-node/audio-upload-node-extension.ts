import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { AudioUploadNode } from "./audio-upload-node"

export interface AudioUploadOptions {
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
   * Allowed file types
   * @default "audio/*"
   */
  accept: string
  /**
   * The node type to insert after successful upload
   * @default "audio"
   */
  type: string
  /**
   * Function to handle file upload
   */
  upload: (
    file: File,
    onProgress: (event: { progress: number }) => void,
    signal: AbortSignal
  ) => Promise<{ url: string; meta?: unknown }>
  /**
   * Function to prepare file before upload (e.g., sanitize filename)
   */
  prepareForUpload?: (file: File) => File
  /**
   * Callback on successful upload
   */
  onSuccess?: (url: string) => void
  /**
   * Callback on upload error
   */
  onError?: (error: Error) => void
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    audioUpload: {
      /**
       * Add an audio upload node
       */
      addAudioUpload: () => ReturnType
    }
  }
}

export const AudioUploadExtension = Node.create<AudioUploadOptions>({
  name: "audioUpload",

  group: "block",

  atom: true,

  draggable: true,

  addOptions() {
    return {
      maxSize: Infinity, // No size limit
      limit: 1,
      accept: "audio/*",
      type: "audio",
      upload: () => Promise.reject(new Error("Upload function not implemented")),
      prepareForUpload: undefined,
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
        tag: "div[data-type='audio-upload']",
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "audio-upload" }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(AudioUploadNode)
  },

  addCommands() {
    return {
      addAudioUpload:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
          })
        },
    }
  },
})
