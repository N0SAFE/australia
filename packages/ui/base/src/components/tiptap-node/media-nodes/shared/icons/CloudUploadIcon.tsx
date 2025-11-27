import React from "react"

interface CloudUploadIconProps {
  className?: string
}

export const CloudUploadIcon: React.FC<CloudUploadIconProps> = ({
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
    <path
      d="M7 18C4.23858 18 2 15.7614 2 13C2 10.2386 4.23858 8 7 8C7.34511 8 7.68377 8.03245 8.01114 8.09451C8.00375 7.89731 8 7.69931 8 7.5C8 4.46243 10.4624 2 13.5 2C16.5376 2 19 4.46243 19 7.5C19 7.87277 18.9656 8.23729 18.8994 8.59073C19.2352 8.52223 19.5827 8.5 19.9375 8.5C21.6319 8.5 23 9.86812 23 11.5625C23 13.2569 21.6319 14.625 19.9375 14.625H19"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 13V22M12 13L15 16M12 13L9 16"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
