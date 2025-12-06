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
import { AlignLeft, AlignCenter, AlignRight, Maximize, Minimize, Download, Loader2 } from "lucide-react"
import { type AudioStrategyResolver } from "@/lib/media-url-resolver"
import { Button } from "@/components/shadcn/button"

export function AudioNodeView(props: NodeViewProps) {
  const { node, getPos, editor } = props
  const { temp, strategy, title, controls = true, width, align = "center" } = node.attrs
  
  // State for resolved URL
  const [resolvedSrc, setResolvedSrc] = useState<string>("")
  // State for download loading
  const [isDownloading, setIsDownloading] = useState(false)
  // State for download progress
  const [downloadProgress, setDownloadProgress] = useState(0)
  
  // Get audioStrategy from extension options
  const extension = editor.extensionManager.extensions.find(ext => ext.name === 'audio')
  const audioStrategy = extension?.options.audioStrategy as AudioStrategyResolver | undefined
  
  // Resolve the final URL using temp or strategy
  useEffect(() => {
    const resolve = async () => {
      // If we have temp.blobUrl, use it (newly uploaded, not saved yet)
      if (temp && typeof temp === 'object' && 'blobUrl' in temp) {
        const blobUrl = (temp as { blobUrl: unknown }).blobUrl
        if (typeof blobUrl === 'string') {
          setResolvedSrc(blobUrl)
          return
        }
      }
      
      // Otherwise use strategy resolver
      if (!audioStrategy || !strategy) {
        setResolvedSrc("")
        return
      }
      
      // Pass strategy.meta to the strategy resolver
      const resolved = await audioStrategy(strategy.meta)
      setResolvedSrc(resolved)
    }
    void resolve()
  }, [temp, strategy, audioStrategy, node])

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
  
  const handleDownload = () => {
    if (!resolvedSrc || isDownloading) return
    void (async () => {
      setIsDownloading(true)
      setDownloadProgress(0)
      try {
        const response = await fetch(resolvedSrc, {
          credentials: 'include', // Include cookies for authenticated requests
        })
        if (!response.ok) {
          throw new Error(`HTTP ${String(response.status)}`)
        }
        
        // Get content length for progress tracking
        const contentLength = response.headers.get('content-length')
        const total = contentLength ? parseInt(contentLength, 10) : 0
        
        if (total && response.body) {
          // Stream the response to track progress
          const reader = response.body.getReader()
          const chunks: BlobPart[] = []
          let received = 0
          
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            chunks.push(value)
            received += value.length
            setDownloadProgress(Math.round((received / total) * 100))
          }
          
          // Combine chunks into a single blob
          const blob = new Blob(chunks)
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = (title as string) || 'audio'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)
        } else {
          // Fallback if no content-length header
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = (title as string) || 'audio'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)
        }
      } catch {
        // Fallback: open in new tab
        window.open(resolvedSrc, '_blank')
      } finally {
        setIsDownloading(false)
        setDownloadProgress(0)
      }
    })()
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
        <>
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
          <div className="mt-2 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
              className="gap-2"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isDownloading ? `Downloading... ${String(downloadProgress)}%` : 'Download'}
            </Button>
          </div>
        </>
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
