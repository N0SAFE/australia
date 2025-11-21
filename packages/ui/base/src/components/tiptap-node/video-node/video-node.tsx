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
import { cn } from "@/lib/utils"

interface ProcessingProgress {
  progress: number
  status: 'processing' | 'completed' | 'failed'
  message?: string
}

export function VideoNodeView(props: NodeViewProps) {
  const { node, getPos, editor } = props
  const { src, srcUrlId, title, controls = true, width, height, align = "center", meta } = node.attrs
  
  // State for resolved URL - start with null to avoid empty string warning
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  
  // State for processing progress
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null)
  const [showProgress, setShowProgress] = useState(false)
  
  // Get injected media URL resolvers and progress handlers from extension options
  const videoExtension = editor.extensionManager.extensions.find(ext => ext.name === 'video')
  const injectMediaUrl = videoExtension?.options.injectMediaUrl
  
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
      console.log('🎥 Video URL resolved:', {
        strategy: (meta as { strategy?: string })?.strategy,
        contentMediaId: (meta as { contentMediaId?: string })?.contentMediaId,
        srcUrlId,
        resolvedUrl: resolved,
        width: node.attrs.width as number | undefined,
        height: node.attrs.height as number | undefined
      })
      setResolvedSrc(resolved)
      setIsLoading(false)
    }
    void resolve()
  }, [src, srcUrlId, injectMediaUrl, meta, node.attrs.width, node.attrs.height])
  
  // Handle progress tracking for video processing
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const enableProgress = videoExtension?.options.enableProgress
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const disableProgress = videoExtension?.options.disableProgress
    
    // Store references for this specific video node
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const nodeId = srcUrlId ?? src
    if (!nodeId || !onProgressUpdate) return
    
    // Automatically enable progress tracking for this video when it appears in edit mode
    if (editor.isEditable && enableProgress) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      enableProgress(nodeId as string)
    }
    
    // Register this node for progress updates
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const unsubscribe = onProgressUpdate(nodeId as string, (progress: ProcessingProgress) => {
      setProcessingProgress(progress)
      setShowProgress(progress.status === 'processing')
      
      // Auto-hide progress bar when processing is complete or failed
      if (progress.status === 'completed' || progress.status === 'failed') {
        setTimeout(() => {
          setShowProgress(false)
        }, 2000) // Keep visible for 2 seconds before hiding
      }
    })
    
    return () => {
      // Cleanup: unsubscribe and optionally disable progress tracking
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      unsubscribe?.()
      if (disableProgress) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        disableProgress(nodeId as string)
      }
    }
  }, [src, srcUrlId, videoExtension, onProgressUpdate, editor.isEditable])

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

  const videoElement = (
    <div 
      className="video-node group relative inline-block"
      style={{
        width: (width as string | undefined) ?? "100%",
        maxWidth: "100%",
      }}
    >
      {/* Processing Progress Bar */}
      {showProgress && processingProgress && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-blue-600 h-1 transition-all duration-300"
          style={{
            width: `${String(processingProgress.progress)}%`,
          }}
          title={processingProgress.message ?? `Processing: ${String(processingProgress.progress)}%`}
        />
      )}
      
      {/* Video Element */}
      <div className="relative w-full overflow-hidden rounded">
        {isLoading ? (
          <div 
            className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded"
            style={{ 
              minHeight: "300px",
              width: "100%"
            }}
          >
            <div className="text-gray-400">Loading video...</div>
          </div>
        ) : resolvedSrc ? (
          <video
            src={resolvedSrc}
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
            className="flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800"
            style={{ 
              minHeight: "300px",
              width: "100%"
            }}
          >
            <div className="text-red-500">Failed to load video</div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <NodeViewWrapper className="video-node-wrapper py-2 w-full">
      <div className={alignmentStyles[align as keyof typeof alignmentStyles]}>
        {editor.isEditable ? (
          <ContextMenu>
            <ContextMenuTrigger>
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
