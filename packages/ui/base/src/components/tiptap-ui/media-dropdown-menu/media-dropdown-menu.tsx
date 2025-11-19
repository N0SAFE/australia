"use client"

import { useCurrentEditor, type Editor } from "@tiptap/react"
import { Plus, Image, Video, Music, FileText } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu"
import { Button } from "@/components/tiptap-ui-primitive/button"

export interface MediaDropdownMenuProps {
  /**
   * The editor instance
   */
  editor?: Editor | null
  
  /**
   * Callback when image option is clicked
   */
  onImageUpload?: () => void
  
  /**
   * Callback when video option is clicked
   */
  onVideoUpload?: () => void
  
  /**
   * Callback when audio option is clicked
   */
  onAudioUpload?: () => void
  
  /**
   * Callback when file option is clicked
   */
  onFileUpload?: () => void
  
  /**
   * Custom button text (default: "Add Media")
   */
  text?: string
  
  /**
   * Disable the dropdown menu
   */
  disabled?: boolean
}

export function MediaDropdownMenu({
  editor: propsEditor,
  onImageUpload,
  onVideoUpload,
  onAudioUpload,
  onFileUpload,
  text = "Add Media",
  disabled = false,
}: MediaDropdownMenuProps) {
  const { editor: contextEditor } = useCurrentEditor()
  const editor = propsEditor ?? contextEditor

  // Don't render if no callbacks are provided
  const hasAnyCallback = onImageUpload ?? onVideoUpload ?? onAudioUpload ?? onFileUpload
  if (!hasAnyCallback) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          data-style="ghost" 
          disabled={disabled || !editor?.isEditable}
        >
          <Plus className="tiptap-button-icon" />
          <span className="tiptap-button-text">{text}</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="start" 
        className="w-48"
      >
        {onImageUpload && (
          <DropdownMenuItem
            onClick={onImageUpload}
            className="gap-2 cursor-pointer"
          >
            <Image className="h-4 w-4" />
            <span>Image</span>
          </DropdownMenuItem>
        )}
        
        {onVideoUpload && (
          <DropdownMenuItem
            onClick={onVideoUpload}
            className="gap-2 cursor-pointer"
          >
            <Video className="h-4 w-4" />
            <span>Video</span>
          </DropdownMenuItem>
        )}
        
        {onAudioUpload && (
          <DropdownMenuItem
            onClick={onAudioUpload}
            className="gap-2 cursor-pointer"
          >
            <Music className="h-4 w-4" />
            <span>Audio</span>
          </DropdownMenuItem>
        )}
        
        {onFileUpload && (
          <DropdownMenuItem
            onClick={onFileUpload}
            className="gap-2 cursor-pointer"
          >
            <FileText className="h-4 w-4" />
            <span>File</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
