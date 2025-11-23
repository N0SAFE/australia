"use client"

import { useEffect } from "react"
import { EditorContent, useEditor, type JSONContent } from "@repo/ui/tiptap-exports/react"

// --- Tiptap Core Extensions ---
import { StarterKit } from "@repo/ui/tiptap-exports/starter-kit"
import { TaskItem, TaskList } from "@repo/ui/tiptap-exports/extension-list"
import { TextAlign } from "@repo/ui/tiptap-exports/extension-text-align"
import { Typography } from "@repo/ui/tiptap-exports/extension-typography"
import { Highlight } from "@repo/ui/tiptap-exports/extension-highlight"
import { Subscript } from "@repo/ui/tiptap-exports/extension-subscript"
import { Superscript } from "@repo/ui/tiptap-exports/extension-superscript"
import { TextStyle } from '@repo/ui/tiptap-exports/extension-text-style'
import { Color } from '@repo/ui/tiptap-exports/extension-color'

// --- Tiptap Node Extensions (read-only versions) ---
import { ImageNode } from "@repo/ui/components/tiptap-node/image-node/image-node-extension"
import { VideoNode } from "@repo/ui/components/tiptap-node/video-node/video-node-extension"
import { AudioNode } from "@repo/ui/components/tiptap-node/audio-node/audio-node-extension"
import { FileNode } from "@repo/ui/components/tiptap-node/file-node/file-node-extension"
import { HorizontalRule } from "@repo/ui/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension"

// --- Styles ---
import "@repo/ui/components/tiptap-node/blockquote-node/blockquote-node.scss"
import "@repo/ui/components/tiptap-node/code-block-node/code-block-node.scss"
import "@repo/ui/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss"
import "@repo/ui/components/tiptap-node/list-node/list-node.scss"
import "@repo/ui/components/tiptap-node/image-node/image-node.scss"
import "@repo/ui/components/tiptap-node/video-node/video-node.scss"
import "@repo/ui/components/tiptap-node/audio-node/audio-node.scss"
import "@repo/ui/components/tiptap-node/heading-node/heading-node.scss"
import "@repo/ui/components/tiptap-node/paragraph-node/paragraph-node.scss"
import "./style.scss"

export interface SimpleViewerProps {
  value?: JSONContent
  className?: string
  /**
   * Strategy resolvers for media URL resolution
   * Used to resolve media URLs based on meta.srcResolveStrategy
   */
  videoStrategy?: (meta: unknown) => Promise<string> | string
  imageStrategy?: (meta: unknown) => Promise<string> | string
  audioStrategy?: (meta: unknown) => Promise<string> | string
  fileStrategy?: (meta: unknown) => Promise<string> | string
  /**
   * Component to render video processing progress
   */
  VideoProgressComponent?: import("react").ComponentType<import("@repo/ui/tiptap-node/video-node-extension").VideoProgressComponentProps>
}

/**
 * SimpleViewer - Read-only TipTap editor for displaying content
 * This component renders TipTap content without any editing capabilities
 * Perfect for displaying capsule content, blog posts, etc.
 */
export function SimpleViewer({
  value,
  className,
  videoStrategy,
  imageStrategy,
  audioStrategy,
  fileStrategy,
  VideoProgressComponent,
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
        imageStrategy,
      }),
      VideoNode.configure({
        videoStrategy,
        VideoProgressComponent,
      }),
      AudioNode.configure({
        audioStrategy,
      }),
      FileNode.configure({
        fileStrategy,
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
