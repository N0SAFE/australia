import { mergeAttributes, Node } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { AudioNodeView } from "./audio-node"

export interface AudioNodeOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HTMLAttributes: Record<string, any>
  /**
   * Media URL resolver callbacks by ID
   */
  injectMediaUrl?: Record<string, (src: string) => Promise<string> | string>
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    audio: {
      setAudio: (options: { src: string; title?: string; controls?: boolean }) => ReturnType
    }
  }
}

export const AudioNode = Node.create<AudioNodeOptions>({
  name: "audio",

  group: "block",

  atom: true,

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
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
        tag: "div[data-type='audio']",
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "audio" })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(AudioNodeView)
  },

  addCommands() {
    return {
      setAudio:
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
