import { ReactNodeViewRenderer } from "@tiptap/react"
import { mergeAttributes, Node } from "@tiptap/core"
import { FileUploadNode } from "./file-upload-node"

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fileUpload: {
      addFileUpload: () => ReturnType
    }
  }
}

export interface FileUploadOptions {
  /**
   * Function that handles the actual file upload process
   */
  upload: (
    file: File,
    onProgress: (event: { progress: number }) => void,
    signal: AbortSignal
  ) => Promise<string>
  /**
   * Function to prepare file before upload (e.g., sanitize filename)
   */
  prepareForUpload?: (file: File) => File
  /**
   * Callback triggered when a file is uploaded successfully
   */
  onSuccess?: (url: string) => void
  /**
   * Callback triggered when an error occurs during upload
   */
  onError?: (error: Error) => void
  /**
   * The type of node to insert after successful upload
   * @default 'file'
   */
  type: string
}

export const FileUploadExtension = Node.create<FileUploadOptions>({
  name: "fileUpload",

  addOptions() {
    return {
      upload: () => Promise.reject(new Error("Upload function not implemented")),
      prepareForUpload: undefined,
      type: "file",
    }
  },

  group: "block",

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      accept: {
        default: "*/*",
      },
      maxSize: {
        default: 10 * 1024 * 1024, // 10MB
      },
      limit: {
        default: 1,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: "div[data-type='file-upload']",
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "file-upload" }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(FileUploadNode)
  },

  addCommands() {
    return {
      addFileUpload:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
          })
        },
    }
  },
})
