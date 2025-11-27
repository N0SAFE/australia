import { mergeAttributes, Node } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { AudioNodeView } from "./audio-node"
import type { AudioStrategyResolver } from "../../../lib/media-url-resolver"

export interface AudioNodeOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HTMLAttributes: Record<string, any>
  /**
   * Audio URL strategy resolver that receives meta only
   */
  audioStrategy?: AudioStrategyResolver
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
      audioStrategy: undefined,
    }
  },

  addAttributes() {
    return {
      meta: {
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
