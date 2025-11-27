"use client"

import { useRef } from "react"
import type { NodeViewProps } from "@tiptap/react"
import { NodeViewWrapper } from "@tiptap/react"
import { Button } from "@/components/tiptap-ui-primitive/button"
import { focusNextNode, isValidPosition } from "@/lib/tiptap-utils"
import { useFileUpload } from "./useFileUpload"
import type { UploadOptions } from "./types"
import { UploadDragArea, UploadPreview, DropZoneContent } from "./components"

interface IconComponents {
  /** Upload icon component */
  UploadIcon: React.ComponentType<{ className?: string }>
  /** File icon component */
  FileIcon: React.ComponentType<{ className?: string }>
  /** File corner icon component (optional, for custom SVG designs) */
  FileCornerIcon?: React.ComponentType<{ className?: string }>
}

interface BaseUploadNodeProps {
  /** Media type for srcResolveStrategy ('image' | 'audio' | 'video' | 'file') */
  mediaType: 'image' | 'audio' | 'video' | 'file'
  /** CSS class name prefix (e.g., "tiptap-image-upload") */
  classNamePrefix: string
  /** Icon components to use */
  icons: IconComponents
  /** TipTap node view props */
  props: NodeViewProps
}

/**
 * Base upload node component with shared logic
 * All media upload nodes (image, audio, video, file) extend this
 */
export const BaseUploadNode: React.FC<BaseUploadNodeProps> = ({
  mediaType,
  classNamePrefix,
  icons,
  props,
}) => {
  const { accept, limit, maxSize } = props.node.attrs
  const inputRef = useRef<HTMLInputElement>(null)
  const extension = props.extension

  const uploadOptions: UploadOptions = {
    maxSize: maxSize as number,
    limit: limit as number,
    accept: accept as string,
    upload: extension.options.upload as UploadOptions['upload'],
    onSuccess: extension.options.onSuccess as UploadOptions['onSuccess'],
    onError: extension.options.onError as UploadOptions['onError'],
  }

  const { fileItems, uploadFiles, removeFileItem, clearAllFiles } =
    useFileUpload(uploadOptions)

  const handleUpload = async (files: File[]) => {
    // Prepare files before upload (e.g., sanitize filenames)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const prepareForUpload = extension.options.prepareForUpload as ((file: File) => File) | undefined
    const preparedFiles = prepareForUpload
      ? files.map((file) => prepareForUpload(file))
      : files

    const results = await uploadFiles(preparedFiles)

    if (results.length > 0) {
      const pos = props.getPos()

      if (isValidPosition(pos)) {
        const nodes = results.map((result, index) => {
          const file = preparedFiles[index]
          const meta = result.meta as Record<string, unknown>

          return {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            type: extension.options.type,
            attrs: {
              // Temporary blob URL for preview before upload
              temp: {
                blobUrl: result.url,
                fileRef: file,  // Keep File reference
              },
              // Strategy determines how to build the final URL
              strategy: {
                name: (meta.strategyName as string | undefined) ?? 'api',
                meta: (meta.strategyMeta as Record<string, unknown> | undefined) ?? {},
              },
              // Standard node attributes
              name: file.name,
              size: file.size,
              type: file.type,
            },
          }
        })

        props.editor
          .chain()
          .focus()
          .deleteRange({ from: pos, to: pos + props.node.nodeSize })
          .insertContentAt(pos, nodes)
          .run()

        focusNextNode(props.editor)
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      extension.options.onError?.(new Error("No file selected"))
      return
    }
    void handleUpload(Array.from(files))
  }

  const handleClick = () => {
    if (inputRef.current && fileItems.length === 0) {
      inputRef.current.value = ""
      inputRef.current.click()
    }
  }

  const hasFiles = fileItems.length > 0

  return (
    <NodeViewWrapper
      className={classNamePrefix}
      tabIndex={0}
      onClick={handleClick}
    >
      {!hasFiles && (
        <UploadDragArea 
          classNamePrefix={classNamePrefix} 
          onFile={(files) => { void handleUpload(files) }}
        >
          <DropZoneContent
            classNamePrefix={classNamePrefix}
            maxSize={maxSize as number}
            limit={limit as number}
            UploadIconComponent={icons.UploadIcon}
            FileIconComponent={icons.FileIcon}
            FileCornerIconComponent={icons.FileCornerIcon}
          />
        </UploadDragArea>
      )}

      {hasFiles && (
        <div className={`${classNamePrefix}-previews`}>
          {fileItems.length > 1 && (
            <div className={`${classNamePrefix}-header`}>
              <span>Uploading {fileItems.length} files</span>
              <Button
                type="button"
                data-style="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  clearAllFiles()
                }}
              >
                Clear All
              </Button>
            </div>
          )}
          {fileItems.map((fileItem) => (
            <UploadPreview
              key={fileItem.id}
              classNamePrefix={classNamePrefix}
              fileItem={fileItem}
              onRemove={() => { removeFileItem(fileItem.id) }}
              FileIconComponent={icons.FileIcon}
            />
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        name={mediaType}
        accept={accept as string}
        type="file"
        multiple={limit > 1}
        onChange={handleChange}
        onClick={(e: React.MouseEvent<HTMLInputElement>) => { e.stopPropagation() }}
      />
    </NodeViewWrapper>
  )
}
