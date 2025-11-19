import { mergeAttributes, Node } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { ImageNodeView } from "./image-node"

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
   * Media URL resolver callbacks by ID
   */
  injectMediaUrl?: Record<string, (src: string) => Promise<string> | string>
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
      injectMediaUrl: {},
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
