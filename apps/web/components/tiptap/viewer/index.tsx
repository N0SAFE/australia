"use client"

import { useEffect } from "react"
import { EditorContent, useEditor, type JSONContent } from "@repo/ui/tiptap-exports/react"
import { useSharedTipTapExtensions } from "../common"

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
  VideoProgressComponent?: import("react").ComponentType<any>
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
  console.log('🔵 [SimpleViewer] Initializing with:', {
    hasValue: !!value,
    valueType: typeof value,
    value: value,
    className,
    hasVideoStrategy: !!videoStrategy,
    hasImageStrategy: !!imageStrategy,
    hasAudioStrategy: !!audioStrategy,
    hasFileStrategy: !!fileStrategy,
    hasVideoProgressComponent: !!VideoProgressComponent,
  })

  const sharedExtensions = useSharedTipTapExtensions({
    openLinksOnClick: true, // Allow clicking links in view mode
    imageStrategy,
    videoStrategy,
    audioStrategy,
    fileStrategy,
    VideoProgressComponent,
  })

  console.log('🔵 [SimpleViewer] Shared extensions:', {
    extensionsCount: sharedExtensions.length,
    extensions: sharedExtensions.map(ext => ext.name),
  })

  // Check each extension individually
  sharedExtensions.forEach((ext, i) => {
    if (!ext) {
      console.error(`❌ [SimpleViewer] Extension at index ${i} is undefined!`)
    } else if (!(ext as any).type && !(ext as any).config) {
      console.error(`❌ [SimpleViewer] Extension at index ${i} (${ext.name}) has no type or config:`, ext)
    }
  })

  const editor = useEditor({
    immediatelyRender: false,
    editable: false, // Read-only mode
    editorProps: {
      attributes: {
        class: `simple-viewer ${className || ''}`,
      },
    },
    extensions: sharedExtensions,
    // Handle both array and direct doc format
    content: Array.isArray(value) ? value[0] : (value ?? { type: "doc", content: [{ type: "paragraph" }] }),
  })
  

  console.log('🔵 [SimpleViewer] Editor created:', {
    hasEditor: !!editor,
    isDestroyed: editor?.isDestroyed,
  })

  // Update editor content when value prop changes
  useEffect(() => {
    console.log('🔵 [SimpleViewer] Content update effect:', {
      hasEditor: !!editor,
      hasValue: !!value,
      editorIsDestroyed: editor?.isDestroyed,
    })
    
    if (editor && value && JSON.stringify(editor.getJSON()) !== JSON.stringify(value)) {
      console.log('🔵 [SimpleViewer] Updating content')
      try {
        editor.commands.setContent(value, { emitUpdate: false })
        console.log('✅ [SimpleViewer] Content updated successfully')
      } catch (error) {
        console.error('❌ [SimpleViewer] Failed to update content:', error)
      }
    }
  }, [editor, value])

  console.log('🔵 [SimpleViewer] Rendering, editor:', {
    hasEditor: !!editor,
    editorIsDestroyed: editor?.isDestroyed,
  })

  return (
    <div className="simple-viewer-wrapper">
      <EditorContent
        editor={editor}
        className="simple-viewer-content"
      />
    </div>
  )
}
