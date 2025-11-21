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

export function ImageNodeView(props: NodeViewProps) {
  const { node, getPos, editor } = props
  const { src, srcUrlId, alt, title, width, align = "center", meta } = node.attrs
  
  // State for resolved URL - start with null to avoid empty string warning
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  
  // Get injected media URL resolvers from extension options
  const injectMediaUrl = editor.extensionManager.extensions.find(ext => ext.name === 'image')?.options.injectMediaUrl
  
  // Resolve the final URL asynchronously
  useEffect(() => {
    const resolve = async () => {
      setIsLoading(true)
      
      // Debug: Log what we're receiving
      console.log('🔍 [ImageNode] node.attrs:', node.attrs)
      console.log('🔍 [ImageNode] meta value:', meta)
      console.log('🔍 [ImageNode] injectMediaUrl:', injectMediaUrl)
      
      const resolved = await resolveMediaUrl(
        src as string, 
        srcUrlId as string | null, 
        injectMediaUrl,
        meta as { strategy?: string; contentMediaId?: string } | null
      )
      console.log('🖼️ Image URL resolved:', {
        strategy: (meta as { strategy?: string })?.strategy,
        contentMediaId: (meta as { contentMediaId?: string })?.contentMediaId,
        srcUrlId,
        resolvedUrl: resolved,
        width: node.attrs.width,
        height: node.attrs.height
      })
      setResolvedSrc(resolved)
      setIsLoading(false)
    }
    void resolve()
  }, [src, srcUrlId, injectMediaUrl, meta])

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

  const imageElement = (
    <div
      className="image-node group relative"
      style={{
        width: (width as string | undefined) ?? "100%",
        maxWidth: "100%",
      }}
    >
      {isLoading ? (
        <div 
          className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded"
          style={{ 
            minHeight: "200px",
            width: "100%"
          }}
        >
          <div className="text-gray-400">Loading image...</div>
        </div>
      ) : resolvedSrc ? (
        <img
          src={resolvedSrc}
          alt={(alt as string | undefined) ?? (title as string | undefined) ?? ""}
          title={(title as string | undefined) ?? (alt as string | undefined) ?? ""}
          style={{
            width: "100%",
            height: "auto",
            display: "block",
          }}
          className="rounded"
        />
      ) : (
        <div 
          className="flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800"
          style={{ 
            minHeight: "200px",
            width: "100%"
          }}
        >
          <div className="text-red-500">Failed to load image</div>
        </div>
      )}
    </div>
  )

  return (
    <NodeViewWrapper className="image-node-wrapper py-2">
      <div className={alignmentStyles[align as keyof typeof alignmentStyles]}>
        {editor.isEditable ? (
          <ContextMenu>
            <ContextMenuTrigger asChild>
              {imageElement}
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
          imageElement
        )}
      </div>
    </NodeViewWrapper>
  )
}
