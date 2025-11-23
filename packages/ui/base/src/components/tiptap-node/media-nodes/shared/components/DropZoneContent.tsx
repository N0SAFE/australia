import React from "react"

interface DropZoneContentProps {
  /** CSS class name prefix (e.g., "tiptap-image-upload") */
  classNamePrefix: string
  /** Maximum file size in bytes */
  maxSize: number
  /** Maximum number of files */
  limit: number
  /** Upload icon component */
  UploadIconComponent: React.ComponentType<{ className?: string }>
  /** File icon component */
  FileIconComponent: React.ComponentType<{ className?: string }>
  /** File corner icon component (optional) */
  FileCornerIconComponent?: React.ComponentType<{ className?: string }>
}

/**
 * Shared drop zone content component
 * Shows upload instructions and file constraints
 */
export const DropZoneContent: React.FC<DropZoneContentProps> = ({
  classNamePrefix,
  maxSize,
  limit,
  UploadIconComponent,
  FileIconComponent,
  FileCornerIconComponent,
}) => (
  <div className={`${classNamePrefix}-dropzone-content`}>
    <div className={`${classNamePrefix}-dropzone`}>
      <div className={`${classNamePrefix}-dropzone-icon-bg`}>
        <UploadIconComponent className={`${classNamePrefix}-icon`} />
      </div>
      <div className={`${classNamePrefix}-dropzone-rect-container`}>
        <FileIconComponent
          className={`${classNamePrefix}-dropzone-rect-primary`}
        />
        {FileCornerIconComponent && (
          <FileCornerIconComponent
            className={`${classNamePrefix}-dropzone-rect-secondary`}
          />
        )}
      </div>
    </div>
    <div className={`${classNamePrefix}-text-container`}>
      <span className={`${classNamePrefix}-text`}>
        <em>Click to upload file</em> or drag and drop
      </span>
      <span className={`${classNamePrefix}-subtext`}>
        Maximum {limit} file{limit === 1 ? "" : "s"}, {maxSize / 1024 / 1024}MB
        each.
      </span>
    </div>
  </div>
)
