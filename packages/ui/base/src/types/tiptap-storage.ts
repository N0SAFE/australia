import type { Editor } from "@tiptap/core"
import type { MediaUrlResolver } from "@/lib/media-url-resolver"

declare module "@tiptap/core" {
  interface Storage {
    injectMediaUrl?: Record<string, MediaUrlResolver>
  }
}

// Type for editor storage with our custom properties
export type EditorStorageWithMedia = {
  injectMediaUrl?: Record<string, MediaUrlResolver>
}

// Helper to get typed storage
export function getEditorStorage(editor: Editor): EditorStorageWithMedia {
  return editor.storage as EditorStorageWithMedia
}
