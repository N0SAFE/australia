"use client"

import type { NodeViewProps } from "@tiptap/react"
import { FileIcon, UploadIcon } from "lucide-react"
import { BaseUploadNode } from "@/components/tiptap-node/media-nodes/shared"
import "./file-upload-node.scss"

/**
 * FileUploadNode component for handling file uploads in TipTap editor
 * 
 * This is a thin wrapper around BaseUploadNode that provides file-specific configuration.
 * All upload logic, drag & drop, and progress tracking is handled by BaseUploadNode.
 * 
 * Note: Unlike other upload nodes, this uses lucide-react icons instead of custom SVG components.
 */
export const FileUploadNode: React.FC<NodeViewProps> = (props) => {
  return (
    <BaseUploadNode
      mediaType="file"
      classNamePrefix="tiptap-file-upload"
      icons={{
        UploadIcon: UploadIcon as React.ComponentType<{ className?: string }>,
        FileIcon: FileIcon as React.ComponentType<{ className?: string }>,
        // Note: FileCornerIcon is optional and not used for file uploads
      }}
      props={props}
    />
  )
}
