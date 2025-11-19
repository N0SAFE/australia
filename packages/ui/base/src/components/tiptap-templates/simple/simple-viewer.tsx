"use client"

import { useEffect } from "react"
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react"

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TextAlign } from "@tiptap/extension-text-align"
import { Typography } from "@tiptap/extension-typography"
import { Highlight } from "@tiptap/extension-highlight"
import { Subscript } from "@tiptap/extension-subscript"
import { Superscript } from "@tiptap/extension-superscript"
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'

// --- Tiptap Node Extensions (read-only versions) ---
import { ImageNode } from "@/components/tiptap-node/image-node/image-node-extension"
import { VideoNode } from "@/components/tiptap-node/video-node/video-node-extension"
import { AudioNode } from "@/components/tiptap-node/audio-node/audio-node-extension"
import { FileNode } from "@/components/tiptap-node/file-node/file-node-extension"
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension"

// --- Styles ---
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss"
import "@/components/tiptap-node/code-block-node/code-block-node.scss"
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss"
import "@/components/tiptap-node/list-node/list-node.scss"
import "@/components/tiptap-node/image-node/image-node.scss"
import "@/components/tiptap-node/video-node/video-node.scss"
import "@/components/tiptap-node/audio-node/audio-node.scss"
import "@/components/tiptap-node/heading-node/heading-node.scss"
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss"
import "@/components/tiptap-templates/simple/simple-viewer.scss"

export interface SimpleViewerProps {
  value?: JSONContent
  className?: string
  /**
   * Map of media source URL IDs to resolver callbacks
   * Used to resolve media URLs based on srcUrlId attribute
   * Example: { api: (src) => `https://api.example.com${src}` }
   */
  injectMediaUrl?: Record<string, (src: string) => Promise<string> | string>
}

/**
 * SimpleViewer - Read-only TipTap editor for displaying content
 * This component renders TipTap content without any editing capabilities
 * Perfect for displaying capsule content, blog posts, etc.
 */
export function SimpleViewer({
  value,
  className,
  injectMediaUrl,
}: SimpleViewerProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: false, // Read-only mode
    editorProps: {
      attributes: {
        class: `simple-viewer ${className || ''}`,
      },
    },
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: {
          openOnClick: true, // Allow clicking links in view mode
        },
      }),
      HorizontalRule,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Typography,
      Superscript,
      Subscript,
      TextStyle,
      Color,
      // Display nodes for media with URL injection
      ImageNode.configure({
        injectMediaUrl,
      }),
      VideoNode.configure({
        injectMediaUrl,
      }),
      AudioNode.configure({
        injectMediaUrl,
      }),
      FileNode.configure({
        injectMediaUrl,
      }),
    ],
    content: value ?? [{ type: "paragraph", children: [{ text: "" }] }],
  })

  // Update editor content when value prop changes
  useEffect(() => {
    if (editor && value && JSON.stringify(editor.getJSON()) !== JSON.stringify(value)) {
      editor.commands.setContent(value, { emitUpdate: false })
    }
  }, [editor, value])

  return (
    <div className="simple-viewer-wrapper">
      <EditorContent
        editor={editor}
        className="simple-viewer-content"
      />
    </div>
  )
}
