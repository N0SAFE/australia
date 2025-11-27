"use client"

import React from "react"
import { Button } from "@/components/tiptap-ui-primitive/button"
import { CloseIcon } from "@/components/tiptap-icons/close-icon"
import { formatFileSize } from "../utils"
import type { FileItem } from "../types"

interface UploadPreviewProps {
  /** CSS class name prefix (e.g., "tiptap-image-upload") */
  classNamePrefix: string
  /** File item with upload status and progress */
  fileItem: FileItem
  /** Callback when remove button is clicked */
  onRemove: () => void
  /** Custom file icon component (optional, for lucide-react icons) */
  FileIconComponent?: React.ComponentType<{ className?: string }>
}

/**
 * Shared upload preview component
 * Shows file info with progress bar and remove button
 */
export const UploadPreview: React.FC<UploadPreviewProps> = ({
  classNamePrefix,
  fileItem,
  onRemove,
  FileIconComponent,
}) => {
  return (
    <div className={`${classNamePrefix}-preview`}>
      {fileItem.status === "uploading" && (
        <div
          className={`${classNamePrefix}-progress`}
          style={{ width: `${fileItem.progress.toString()}%` }}
        />
      )}

      <div className={`${classNamePrefix}-preview-content`}>
        <div className={`${classNamePrefix}-file-info`}>
          {FileIconComponent && (
            <div className={`${classNamePrefix}-file-icon`}>
              <FileIconComponent className="w-5 h-5" />
            </div>
          )}
          <div className={`${classNamePrefix}-details`}>
            <span className={`${classNamePrefix}-text`}>
              {fileItem.file.name}
            </span>
            <span className={`${classNamePrefix}-subtext`}>
              {formatFileSize(fileItem.file.size)}
            </span>
          </div>
        </div>
        <div className={`${classNamePrefix}-actions`}>
          {fileItem.status === "uploading" && (
            <span className={`${classNamePrefix}-progress-text`}>
              {fileItem.progress}%
            </span>
          )}
          <Button
            type="button"
            data-style="ghost"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
          >
            <CloseIcon className="tiptap-button-icon" />
          </Button>
        </div>
      </div>
    </div>
  )
}
