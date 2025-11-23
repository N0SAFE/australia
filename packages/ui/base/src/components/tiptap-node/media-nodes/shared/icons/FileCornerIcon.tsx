import React from "react"

interface FileCornerIconProps {
  className?: string
}

export const FileCornerIcon: React.FC<FileCornerIconProps> = ({
  className = "",
}) => (
  <svg
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M13 2L20 9V20C20 21.1046 19.1046 22 18 22H13V2Z" fill="currentColor" />
  </svg>
)
