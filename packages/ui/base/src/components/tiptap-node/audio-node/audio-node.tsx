"use client"

import { useState, useEffect } from "react"
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/shadcn/context-menu"
import { AlignLeft, AlignCenter, AlignRight, Maximize, Minimize } from "lucide-react"
import { resolveMediaUrl } from "@/lib/media-url-resolver"

export function AudioNodeView(props: NodeViewProps) {
  const { node, getPos, editor } = props
  const { src, srcUrlId, title, controls = true, width, align = "center", meta } = node.attrs
  
  // State for resolved URL - start with null to avoid empty string warning
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  
  // Get injected media URL resolvers from extension options
  const injectMediaUrl = editor.extensionManager.extensions.find(ext => ext.name === 'audio')?.options.injectMediaUrl
  
  // Resolve the final URL asynchronously
  useEffect(() => {
    const resolve = async () => {
      setIsLoading(true)
      const resolved = await resolveMediaUrl(
        src as string, 
        srcUrlId as string | null, 
        injectMediaUrl,
        meta as { strategy?: string; contentMediaId?: string } | null
      )
      console.log('🔊 Audio URL resolved:', {
        strategy: (meta as { strategy?: string })?.strategy,
        contentMediaId: (meta as { contentMediaId?: string })?.contentMediaId,
        srcUrlId,
        resolvedUrl: resolved,
        title: node.attrs.title as string | undefined
      })
      setResolvedSrc(resolved)
      setIsLoading(false)
    }
    void resolve()
  }, [src, srcUrlId, injectMediaUrl, meta, node.attrs.title])

  const alignmentStyles = {
    left: "flex justify-start",
    center: "flex justify-center",
    right: "flex justify-end",
  } as const

  const updateAttributes = (attrs: Record<string, unknown>) => {
    if (typeof getPos === "function") {
      const pos = getPos()
      if (pos !== undefined) {
        editor.chain().focus().command(({ tr }) => {
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            ...attrs,
          })
          return true
        }).run()
      }
    }
  }

  const audioElement = (
    <div 
      className="audio-node group relative inline-block"
      style={{
        width: (width as string | undefined) ?? "100%",
        maxWidth: "100%",
      }}
    >
      {isLoading ? (
        <div 
          className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded"
          style={{ 
            minHeight: "60px",
            width: "100%"
          }}
        >
          <div className="text-gray-400">Loading audio...</div>
        </div>
      ) : resolvedSrc ? (
        <audio
          src={resolvedSrc}
          title={(title as string | undefined) ?? "Audio"}
          controls={controls as boolean}
          style={{
            width: "100%",
            display: "block",
          }}
          className="rounded"
        >
          <track kind="captions" />
          Your browser does not support the audio tag.
        </audio>
      ) : (
        <div 
          className="flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800"
          style={{ 
            minHeight: "60px",
            width: "100%"
          }}
        >
          <div className="text-red-500">Failed to load audio</div>
        </div>
      )}
    </div>
  )

  return (
    <NodeViewWrapper className="audio-node-wrapper py-2 w-full">
      <div className={alignmentStyles[align as keyof typeof alignmentStyles]}>
        {editor.isEditable ? (
          <ContextMenu>
            <ContextMenuTrigger asChild>
              {audioElement}
            </ContextMenuTrigger>
            <ContextMenuContent className="w-64">
          <ContextMenuSub>
            <ContextMenuSubTrigger>Alignment</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem onClick={() => { updateAttributes({ align: "left" }) }}>
                <AlignLeft className="mr-2 h-4 w-4" />
                Left
              </ContextMenuItem>
              <ContextMenuItem onClick={() => { updateAttributes({ align: "center" }) }}>
                <AlignCenter className="mr-2 h-4 w-4" />
                Center
              </ContextMenuItem>
              <ContextMenuItem onClick={() => { updateAttributes({ align: "right" }) }}>
                <AlignRight className="mr-2 h-4 w-4" />
                Right
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator />
          <ContextMenuSub>
            <ContextMenuSubTrigger>Size</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem onClick={() => { updateAttributes({ width: "25%" }) }}>
                <Minimize className="mr-2 h-4 w-4" />
                Small (25%)
              </ContextMenuItem>
              <ContextMenuItem onClick={() => { updateAttributes({ width: "50%" }) }}>
                <Minimize className="mr-2 h-4 w-4" />
                Medium (50%)
              </ContextMenuItem>
              <ContextMenuItem onClick={() => { updateAttributes({ width: "75%" }) }}>
                <Maximize className="mr-2 h-4 w-4" />
                Large (75%)
              </ContextMenuItem>
              <ContextMenuItem onClick={() => { updateAttributes({ width: "100%" }) }}>
                <Maximize className="mr-2 h-4 w-4" />
                Full Width
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuContent>
          </ContextMenu>
        ) : (
          audioElement
        )}
      </div>
    </NodeViewWrapper>
  )
}
