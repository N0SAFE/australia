import { mergeAttributes, Node } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { ImageNodeView } from "./image-node"
import type { ImageStrategyResolver, MediaDownloadHandler } from "@/lib/media-url-resolver"

export interface ImageNodeOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HTMLAttributes: Record<string, any>
  /**
   * Allow base64 images
   * @default false
   */
  allowBase64?: boolean
  /**
   * Inline image support
   * @default false
   */
  inline?: boolean
  /**
   * Image URL strategy resolver that receives meta only
   */
  imageStrategy?: ImageStrategyResolver
  /**
   * Download handler for image files
   * If not provided, download button will be hidden
   */
  downloadHandler?: MediaDownloadHandler
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    image: {
      setImage: (options: {
        src: string
        alt?: string
        title?: string
        width?: number | string
        height?: number | string
        align?: "left" | "center" | "right"
      }) => ReturnType
    }
  }
}

export const ImageNode = Node.create<ImageNodeOptions>({
  name: "image",

  group: "block",

  atom: true,

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      allowBase64: false,
      inline: false,
      imageStrategy: undefined,
      downloadHandler: undefined,
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
      // Standard image attributes
      alt: {
        default: null,
      },
      title: {
        default: null,
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
        tag: this.options.inline ? "img" : "div[data-type='image']",
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "image" })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView)
  },

  addCommands() {
    return {
      setImage:
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
