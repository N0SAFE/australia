"use client"

import type { NodeViewProps } from "@tiptap/react"
import {
  BaseUploadNode,
  CloudUploadIcon,
  FileIcon,
  FileCornerIcon,
} from "@/components/tiptap-node/media-nodes/shared"
import "./image-upload-node.scss"

/**
 * Image Upload Node - Thin wrapper around BaseUploadNode
 * 
 * This component provides the image-specific configuration for the shared
 * BaseUploadNode component, including:
 * - mediaType: 'image' (determines srcResolveStrategy)
 * - classNamePrefix: 'tiptap-image-upload' (for CSS styling)
 * - icons: Custom SVG icons for drag & drop UI
 */
export const ImageUploadNode: React.FC<NodeViewProps> = (props) => {
  return (
    <BaseUploadNode
      mediaType="image"
      classNamePrefix="tiptap-image-upload"
      icons={{
        UploadIcon: CloudUploadIcon as React.ComponentType<{ className?: string }>,
        FileIcon: FileIcon as React.ComponentType<{ className?: string }>,
        FileCornerIcon: FileCornerIcon as React.ComponentType<{ className?: string }>,
      }}
      props={props}
    />
  )
}
