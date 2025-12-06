import { mergeAttributes, Node } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { VideoNodeView } from "./video-node"
import type { ComponentType } from "react"
import type { VideoStrategyResolver, MediaDownloadHandler } from "@/lib/media-url-resolver"

export interface ProcessingProgress {
  progress: number
  status: 'processing' | 'completed' | 'failed'
  message?: string
  error?: string
}

/**
 * Video node attributes
 */
export interface VideoNodeAttributes {
  temp?: { blobUrl?: string; fileRef?: File } | null
  strategy?: { name?: string; meta?: { contentMediaId?: string } } | null
  title?: string | null
  controls?: boolean
  width?: string | number
  height?: string | number | null
  align?: string
  name?: string | null
  size?: number | null
  type?: string | null
}

/**
 * Props passed to the VideoProgressComponent
 */
export interface VideoProgressComponentProps {
  /**
   * All video node attributes including fileId
   */
  attrs: VideoNodeAttributes
  
  /**
   * Function to render the progress bar UI
   * Called with the current progress state and visibility
   */
  renderProgress: (progress: ProcessingProgress | null, isVisible: boolean) => React.ReactNode
}

export interface VideoNodeOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HTMLAttributes: Record<string, any>
  /**
   * Video URL strategy resolver function
   * Called with meta only to resolve the final URL
   */
  videoStrategy?: VideoStrategyResolver
  /**
   * Download handler for video files
   * If not provided, download button will be hidden
   */
  downloadHandler?: MediaDownloadHandler
  /**
   * Component responsible for fetching/subscribing to video processing progress
   * and rendering the progress bar. This component receives the video attrs with meta
   * and a renderProgress function to display the progress UI.
   */
  VideoProgressComponent?: ComponentType<VideoProgressComponentProps>
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
      videoStrategy: undefined,
      downloadHandler: undefined,
      VideoProgressComponent: undefined,
    }
  },

  addAttributes() {
    return {
      // Temporary preview data (removed after upload)
      temp: {
        default: null,
      },
      // Strategy for URL resolution
      strategy: {
        default: null,
      },
      // Standard video attributes
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
      name: {
        default: null,
      },
      size: {
        default: null,
      },
      type: {
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
