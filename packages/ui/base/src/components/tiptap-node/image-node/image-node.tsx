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
import { resolveMediaUrl, type ImageStrategyResolver } from "../../../lib/media-url-resolver"

export function ImageNodeView(props: NodeViewProps) {
  const { node, getPos, editor } = props
  const { meta, alt, title, width, align = "center" } = node.attrs
  
  // State for resolved URL
  const [resolvedSrc, setResolvedSrc] = useState<string>("")
  
  // Get imageStrategy from extension options
  const extension = editor.extensionManager.extensions.find(ext => ext.name === 'image')
  const imageStrategy = extension?.options.imageStrategy as ImageStrategyResolver | undefined
  
  // Resolve the final URL asynchronously using strategy with meta only
  useEffect(() => {
    const resolve = async () => {
      if (!imageStrategy || !meta) {
        setResolvedSrc("")
        return
      }
      const resolved = await resolveMediaUrl(meta, imageStrategy)
      setResolvedSrc(resolved)
    }
    void resolve()
  }, [meta, imageStrategy])

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
      {resolvedSrc ? (
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
          className="bg-muted rounded flex items-center justify-center"
          style={{
            width: "100%",
            minHeight: "200px",
          }}
        >
          <span className="text-muted-foreground text-sm">Loading image...</span>
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
