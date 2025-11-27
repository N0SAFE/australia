import React from "react"

interface FileIconProps {
  className?: string
}

export const FileIcon: React.FC<FileIconProps> = ({ className = "" }) => (
  <svg
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="4"
      y="2"
      width="16"
      height="20"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path d="M8 7H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M8 17H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)
