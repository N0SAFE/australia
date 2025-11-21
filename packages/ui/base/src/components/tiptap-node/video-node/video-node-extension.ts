import { mergeAttributes, Node } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { VideoNodeView } from "./video-node"

interface ProcessingProgress {
  progress: number
  status: 'processing' | 'completed' | 'failed'
  message?: string
}

type ProgressCallback = (progress: ProcessingProgress) => void
type UnsubscribeFunction = () => void

export interface VideoNodeOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HTMLAttributes: Record<string, any>
  /**
   * Media URL resolver callbacks by ID
   */
  injectMediaUrl?: Record<string, (src: string) => Promise<string> | string>
  /**
   * Subscribe to processing progress updates for a specific video
   * @param videoId - The video identifier (srcUrlId or src)
   * @param callback - Function to call with progress updates
   * @returns Unsubscribe function
   */
  onProgressUpdate?: (videoId: string, callback: ProgressCallback) => UnsubscribeFunction
  /**
   * Enable progress bar display for a specific video
   */
  enableProgress?: (videoId: string) => void
  /**
   * Disable progress bar display for a specific video
   */
  disableProgress?: (videoId: string) => void
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    video: {
      setVideo: (options: { src: string; title?: string; controls?: boolean; width?: number; height?: number }) => ReturnType
    }
  }
}

export const VideoNode = Node.create<VideoNodeOptions>({
  name: "video",

  group: "block",

  atom: true,

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      injectMediaUrl: {},
      onProgressUpdate: undefined,
      enableProgress: undefined,
      disableProgress: undefined,
    }
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
      srcUrlId: {
        default: null,
      },
      contentMediaId: {
        default: null, // UUID linking content node to capsule media record
      },
      strategy: {
        default: 'api', // 'local' for blob URLs, 'api' for server files, 'contentMediaId' for pending/uploaded
      },
      fileRef: {
        default: null, // Store File reference for local strategy (not serialized)
        rendered: false,
      },
      title: {
        default: null,
      },
      controls: {
        default: true,
      },
      width: {
        default: "100%",
      },
      height: {
        default: null,
      },
      align: {
        default: "center",
      },
      meta: {
        default: null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: "div[data-type='video']",
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "video" })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoNodeView)
  },

  addCommands() {
    return {
      setVideo:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          })
        },
    }
  },
})
