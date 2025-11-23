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
import { resolveMediaUrl, type AudioStrategyResolver } from "../../../lib/media-url-resolver"

export function AudioNodeView(props: NodeViewProps) {
  const { node, getPos, editor } = props
  const { meta, title, controls = true, width, align = "center" } = node.attrs
  
  // State for resolved URL
  const [resolvedSrc, setResolvedSrc] = useState<string>("")
  
  // Get audioStrategy from extension options
  const extension = editor.extensionManager.extensions.find(ext => ext.name === 'audio')
  const audioStrategy = extension?.options.audioStrategy as AudioStrategyResolver | undefined
  
  // Resolve the final URL asynchronously using strategy with meta only
  useEffect(() => {
    const resolve = async () => {
      if (!audioStrategy || !meta) {
        setResolvedSrc("")
        return
      }
      const resolved = await resolveMediaUrl(meta, audioStrategy)
      setResolvedSrc(resolved)
    }
    void resolve()
  }, [meta, audioStrategy])

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
      {resolvedSrc ? (
        <audio
          {...(resolvedSrc ? { src: resolvedSrc } : {})}
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
          className="bg-muted rounded flex items-center justify-center py-8"
          style={{
            width: "100%",
          }}
        >
          <span className="text-muted-foreground text-sm">Loading audio...</span>
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
