"use client"

import { useState, useEffect } from "react"
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react"
import { FileIcon, DownloadIcon, AlignLeft, AlignCenter, AlignRight, Maximize, Minimize } from "lucide-react"
import { formatBytes } from "@/lib/tiptap-utils"
import { resolveMediaUrl, type FileStrategyResolver } from "../../../lib/media-url-resolver"
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

export function FileNodeView(props: NodeViewProps) {
  const { node, getPos, editor } = props
  const { meta, name, size, type, width, align = "center" } = node.attrs
  
  // State for resolved URL
  const [resolvedSrc, setResolvedSrc] = useState<string>("")
  
  // Get fileStrategy from extension options
  const extension = editor.extensionManager.extensions.find(ext => ext.name === 'file')
  const fileStrategy = extension?.options.fileStrategy as FileStrategyResolver | undefined
  
  // Resolve the final URL asynchronously using strategy with meta only
  useEffect(() => {
    const resolve = async () => {
      if (!fileStrategy || !meta) {
        setResolvedSrc("")
        return
      }
      const resolved = await resolveMediaUrl(meta, fileStrategy)
      setResolvedSrc(resolved)
    }
    void resolve()
  }, [meta, fileStrategy])

  const handleDownload = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (resolvedSrc) {
      window.open(resolvedSrc, "_blank")
    }
  }

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

  const fileElement = (
    <div className="group relative"
      style={{
        width: (width as string | undefined) ?? "600px",
        maxWidth: "100%",
      }}
    >
      <div
        className="file-node cursor-pointer rounded border bg-card p-4 hover:bg-accent/50 transition-colors"
        onClick={handleDownload}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleDownload(e)
          }
        }}
      >
        <div className="flex items-center gap-3">
          <div className="file-node-icon flex-shrink-0">
            <FileIcon className="h-6 w-6" />
          </div>
          <div className="file-node-info flex-1 min-w-0">
            <div className="file-node-name font-medium truncate">{(name as string | undefined) ?? "Unknown File"}</div>
            <div className="file-node-meta text-sm text-muted-foreground">
              {size ? formatBytes(size as number) : ""}
              {size && type ? " • " : ""}
              {(type as string | undefined) ?? ""}
            </div>
          </div>
          <div className="file-node-action flex-shrink-0">
            <DownloadIcon className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <NodeViewWrapper className="file-node-wrapper py-2">
      <div className={alignmentStyles[align as keyof typeof alignmentStyles]}>
        {editor.isEditable ? (
          <ContextMenu>
            <ContextMenuTrigger>
              {fileElement}
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
              <ContextMenuItem onClick={() => { updateAttributes({ width: "400px" }) }}>
                <Minimize className="mr-2 h-4 w-4" />
                Small (400px)
              </ContextMenuItem>
              <ContextMenuItem onClick={() => { updateAttributes({ width: "600px" }) }}>
                <Minimize className="mr-2 h-4 w-4" />
                Medium (600px)
              </ContextMenuItem>
              <ContextMenuItem onClick={() => { updateAttributes({ width: "800px" }) }}>
                <Maximize className="mr-2 h-4 w-4" />
                Large (800px)
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
          fileElement
        )}
      </div>
    </NodeViewWrapper>
  )
}
