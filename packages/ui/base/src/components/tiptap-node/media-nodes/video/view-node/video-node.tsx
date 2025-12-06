"use client"

import { useState, useEffect, type ReactNode } from "react"
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
import { Card } from "@/components/shadcn/card"
import { Progress } from "@/components/shadcn/progress"
import { AlignLeft, AlignCenter, AlignRight, Maximize, Minimize, Loader2, CheckCircle, XCircle, AlertCircle, Download } from "lucide-react"
import { type VideoStrategyResolver } from "@/lib/media-url-resolver"
import { Button } from "@/components/shadcn/button"
import type { ProcessingProgress } from "./video-node-extension"

export function VideoNodeView(props: NodeViewProps) {
  const { node, getPos, editor } = props
  const { temp, strategy, title, controls = true, width, height, align = "center" } = node.attrs
  
  // State for resolved URL
  const [resolvedSrc, setResolvedSrc] = useState<string>("")
  // State for download loading
  const [isDownloading, setIsDownloading] = useState(false)
  // State for download progress
  const [downloadProgress, setDownloadProgress] = useState(0)
  
  // Get videoStrategy and VideoProgressComponent from extension options
  const extension = editor.extensionManager.extensions.find((ext) => ext.name === "video")
  const videoStrategy = extension?.options.videoStrategy as VideoStrategyResolver | undefined
  const VideoProgressComponent = extension?.options.VideoProgressComponent
  
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
      if (!videoStrategy || !strategy) {
        setResolvedSrc("")
        return
      }
      
      // Pass strategy.meta to the strategy resolver
      const resolved = await videoStrategy(strategy.meta)
      setResolvedSrc(resolved)
    }
    void resolve()
  }, [temp, strategy, videoStrategy, node])
  
  // Function to render progress bar UI
  const renderProgressBar = (progress: ProcessingProgress | null, isVisible: boolean): ReactNode => {
    if (!isVisible || !progress) return null

    return (
      <div className="video-processing-overlay">
        <Card className="p-3 bg-background/95 backdrop-blur-sm border shadow-lg">
          <div className="space-y-2">
            {/* Header with icon and status */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium">Video Processing</span>
              <div className="flex items-center gap-1.5">
                {progress.status === 'processing' && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                )}
                {progress.status === 'completed' && (
                  <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                )}
                {progress.status === 'failed' && (
                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                )}
                <span className="text-xs font-medium capitalize">
                  {progress.status}
                </span>
              </div>
            </div>
            
            {/* Progress bar */}
            <Progress value={progress.progress} className="w-full h-1.5" />
            
            {/* Message and percentage */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground truncate flex-1">
                {progress.message ?? 'Processing...'}
              </span>
              <span className="font-medium ml-2">
                {Math.round(progress.progress)}%
              </span>
            </div>
            
            {/* Error message if failed */}
            {progress.error && (
              <div className="flex items-start gap-1.5 p-2 bg-destructive/10 text-destructive rounded text-xs">
                <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                <span className="leading-tight">{progress.error}</span>
              </div>
            )}
          </div>
        </Card>
      </div>
    )
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
          link.download = (title as string) || 'video'
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
          link.download = (title as string) || 'video'
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

  const videoElement = (
    <div 
      className="video-node group relative inline-block"
      style={{
        width: (width as string | undefined) ?? "100%",
        maxWidth: "100%",
      }}
    >
      {/* Video Element with overlaid progress */}
      <div className="relative w-full overflow-hidden rounded">
        {resolvedSrc ? (
          <video
            {...(resolvedSrc ? { src: resolvedSrc } : {})}
            title={(title as string | undefined) ?? "Video"}
            controls={controls as boolean}
            height={(height as string | undefined) ?? undefined}
            style={{
              width: "100%",
              height: (height as string | undefined) ?? "auto",
              display: "block",
            }}
            className="rounded"
          >
            <track kind="captions" />
            Your browser does not support the video tag.
          </video>
        ) : (
          <div
            className="bg-muted rounded flex items-center justify-center"
            style={{
              width: "100%",
              minHeight: "300px",
            }}
          >
            <span className="text-muted-foreground text-sm">Loading video...</span>
          </div>
        )}
        
        {/* Processing Progress Component - Overlaid on top of video */}
        {VideoProgressComponent && (
          <VideoProgressComponent
            attrs={{
              temp: temp as { blobUrl?: string; fileRef?: File } | null | undefined,
              strategy: strategy as { name?: string; meta?: { contentMediaId?: string } } | null | undefined,
              title: title as string | null,
              controls: controls as boolean,
              width: width as string | number,
              height: height as string | number | null,
              align: align as string,
            }}
            renderProgress={renderProgressBar}
          />
        )}
      </div>
      {/* Download button */}
      {resolvedSrc && (
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
      )}
    </div>
  )

  return (
    <NodeViewWrapper className="video-node-wrapper py-2 w-full">
      <div className={alignmentStyles[align as keyof typeof alignmentStyles]}>
        {editor.isEditable ? (
          <ContextMenu>
            <ContextMenuTrigger asChild>
              {videoElement}
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
          videoElement
        )}
      </div>
    </NodeViewWrapper>
  )
}
