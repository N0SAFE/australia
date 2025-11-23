"use client"

import type { NodeViewProps } from "@tiptap/react"
import {
  BaseUploadNode,
  CloudUploadIcon,
  FileIcon,
  FileCornerIcon,
} from "@/components/tiptap-node/media-nodes/shared"
import "./video-upload-node.scss"

/**
 * VideoUploadNode component for handling video file uploads in TipTap editor
 * 
 * This is a thin wrapper around BaseUploadNode that provides video-specific configuration.
 * All upload logic, drag & drop, and progress tracking is handled by BaseUploadNode.
 */
export const VideoUploadNode: React.FC<NodeViewProps> = (props) => {
  return (
    <BaseUploadNode
      mediaType="video"
      classNamePrefix="tiptap-video-upload"
      icons={{
        UploadIcon: CloudUploadIcon as React.ComponentType<{ className?: string }>,
        FileIcon: FileIcon as React.ComponentType<{ className?: string }>,
        FileCornerIcon: FileCornerIcon as React.ComponentType<{ className?: string }>,
      }}
      props={props}
    />
  )
}
