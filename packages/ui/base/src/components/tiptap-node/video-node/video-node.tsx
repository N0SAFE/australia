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
  const { src, srcUrlId, title, controls = true, width, height, align = "center" } = node.attrs
  
  // State for resolved URL
  const [resolvedSrc, setResolvedSrc] = useState<string>(src as string)
  
  // State for processing progress
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null)
  const [showProgress, setShowProgress] = useState(false)
  
  // Get injected media URL resolvers and progress handlers from extension options
  const videoExtension = editor.extensionManager.extensions.find(ext => ext.name === 'video')
  const injectMediaUrl = videoExtension?.options.injectMediaUrl
  
  // Resolve the final URL asynchronously
  useEffect(() => {
    const resolve = async () => {
      const resolved = await resolveMediaUrl(src as string, srcUrlId as string | null, injectMediaUrl)
      setResolvedSrc(resolved)
    }
    void resolve()
  }, [src, srcUrlId, injectMediaUrl])
  
  // Subscribe to processing progress and auto-enable when node appears in edit mode
  useEffect(() => {
    const onProgressUpdate = videoExtension?.options.onProgressUpdate
    const enableProgress = videoExtension?.options.enableProgress
    const disableProgress = videoExtension?.options.disableProgress
    
    // Store references for this specific video node
    const nodeId = srcUrlId || src
    if (!nodeId || !onProgressUpdate) return
    
    // Automatically enable progress tracking for this video when it appears in edit mode
    if (editor.isEditable && enableProgress) {
      enableProgress(nodeId as string)
    }
    
    // Register this node for progress updates
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
      unsubscribe?.()
      if (disableProgress) {
        disableProgress(nodeId as string)
      }
    }
  }, [src, srcUrlId, videoExtension, editor.isEditable])

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
            width: `${processingProgress.progress}%`,
          }}
          title={processingProgress.message || `Processing: ${processingProgress.progress}%`}
        />
      )}
      
      {/* Video Element */}
      <div className="relative w-full overflow-hidden rounded">
        <video
          src={resolvedSrc || undefined}
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
