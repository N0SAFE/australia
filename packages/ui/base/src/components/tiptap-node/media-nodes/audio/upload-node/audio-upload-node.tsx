"use client"

import type { NodeViewProps } from "@tiptap/react"
import {
  BaseUploadNode,
  CloudUploadIcon,
  FileIcon,
  FileCornerIcon,
} from "@/components/tiptap-node/media-nodes/shared"
import "./audio-upload-node.scss"

/**
 * Audio Upload Node - Thin wrapper around BaseUploadNode
 * 
 * This component provides the audio-specific configuration for the shared
 * BaseUploadNode component, including:
 * - mediaType: 'audio' (determines srcResolveStrategy)
 * - classNamePrefix: 'tiptap-audio-upload' (for CSS styling)
 * - icons: Custom SVG icons for drag & drop UI
 */
export const AudioUploadNode: React.FC<NodeViewProps> = (props) => {
  return (
    <BaseUploadNode
      mediaType="audio"
      classNamePrefix="tiptap-audio-upload"
      icons={{
        UploadIcon: CloudUploadIcon as React.ComponentType<{ className?: string }>,
        FileIcon: FileIcon as React.ComponentType<{ className?: string }>,
        FileCornerIcon: FileCornerIcon as React.ComponentType<{ className?: string }>,
      }}
      props={props}
    />
  )
}
