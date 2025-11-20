import { mergeAttributes, Node } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { FileNodeView } from "./file-node"
import type { FileStrategyResolver } from "../../../lib/media-url-resolver"

export interface FileNodeOptions {
  HTMLAttributes: Record<string, any>
  /**
   * File URL strategy resolver that receives meta only
   */
  fileStrategy?: FileStrategyResolver
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    file: {
      setFile: (options: { src: string; name?: string; size?: number; type?: string }) => ReturnType
    }
  }
}

export const FileNode = Node.create<FileNodeOptions>({
  name: "file",

  group: "block",

  atom: true,

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      fileStrategy: undefined,
    }
  },

  addAttributes() {
    return {
      meta: {
        default: null,
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
      width: {
        default: "600px",
      },
      align: {
        default: "center",
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: "div[data-type='file']",
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "file" })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(FileNodeView)
  },

  addCommands() {
    return {
      setFile:
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
