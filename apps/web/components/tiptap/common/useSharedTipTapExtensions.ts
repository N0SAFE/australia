import { useMemo } from "react"

// --- Tiptap Core Extensions ---
import { StarterKit } from "@repo/ui/tiptap-exports/starter-kit"
import { TaskItem, TaskList } from "@repo/ui/tiptap-exports/extension-list"
import { TextAlign } from "@repo/ui/tiptap-exports/extension-text-align"
import { Typography } from "@repo/ui/tiptap-exports/extension-typography"
import { Highlight } from "@repo/ui/tiptap-exports/extension-highlight"
import { Subscript } from "@repo/ui/tiptap-exports/extension-subscript"
import { Superscript } from "@repo/ui/tiptap-exports/extension-superscript"
import { TextStyle } from '@repo/ui/tiptap-exports/extension-text-style'
import { Color } from '@repo/ui/tiptap-exports/extension-color'

// --- Tiptap Node Extensions ---
import {
  ImageViewNodeExtension as ImageNode,
  VideoViewNodeExtension as VideoNode,
  AudioViewNodeExtension as AudioNode,
  FileViewNodeExtension as FileNode,
} from "@repo/ui/components/tiptap-node/index"
import { HorizontalRule } from "@repo/ui/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension"
import { NodeBackground } from "@repo/ui/components/tiptap-extension/node-background-extension"
import type { MediaDownloadHandler } from "@repo/ui/lib/media-url-resolver"

interface SharedExtensionsConfig {
  placeholder?: string
  openLinksOnClick?: boolean
  imageStrategy?: (meta: unknown) => Promise<string> | string
  videoStrategy?: (meta: unknown) => Promise<string> | string
  audioStrategy?: (meta: unknown) => Promise<string> | string
  fileStrategy?: (meta: unknown) => Promise<string> | string
  VideoProgressComponent?: import("react").ComponentType<any>
  imageDownloadHandler?: MediaDownloadHandler
  videoDownloadHandler?: MediaDownloadHandler
  audioDownloadHandler?: MediaDownloadHandler
  fileDownloadHandler?: MediaDownloadHandler
}

/**
 * Hook that returns the shared TipTap extensions used by both editor and viewer
 * This ensures consistency between editing and viewing modes
 */
export function useSharedTipTapExtensions({
  placeholder,
  openLinksOnClick = false,
  imageStrategy,
  videoStrategy,
  audioStrategy,
  fileStrategy,
  VideoProgressComponent,
  imageDownloadHandler,
  videoDownloadHandler,
  audioDownloadHandler,
  fileDownloadHandler,
}: SharedExtensionsConfig) {
  return useMemo(() => {
    console.log('🔵 [useSharedTipTapExtensions] Creating extensions with config:', {
      openLinksOnClick,
      hasImageStrategy: !!imageStrategy,
      hasVideoStrategy: !!videoStrategy,
      hasAudioStrategy: !!audioStrategy,
      hasFileStrategy: !!fileStrategy,
      hasVideoProgressComponent: !!VideoProgressComponent,
      hasImageDownloadHandler: !!imageDownloadHandler,
      hasVideoDownloadHandler: !!videoDownloadHandler,
      hasAudioDownloadHandler: !!audioDownloadHandler,
      hasFileDownloadHandler: !!fileDownloadHandler,
    })
    
    const extensions = [
      StarterKit.configure({
        horizontalRule: false,
        link: {
          openOnClick: openLinksOnClick,
          enableClickSelection: !openLinksOnClick,
        },
      }),
      HorizontalRule,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Typography,
      Superscript,
      Subscript,
      TextStyle,
      Color,
      NodeBackground,
      // Display nodes for media
      ImageNode.configure({
        imageStrategy,
        downloadHandler: imageDownloadHandler,
      }),
      VideoNode.configure({
        videoStrategy,
        VideoProgressComponent,
        downloadHandler: videoDownloadHandler,
      }),
      AudioNode.configure({
        audioStrategy,
        downloadHandler: audioDownloadHandler,
      }),
      FileNode.configure({
        fileStrategy,
        downloadHandler: fileDownloadHandler,
      }),
    ]
    
    // Check for undefined extensions
    const undefinedExtensions = extensions
      .map((ext, index) => ({ ext, index }))
      .filter(({ ext }) => !ext)
    
    if (undefinedExtensions.length > 0) {
      console.error('❌ [useSharedTipTapExtensions] Found undefined extensions:', undefinedExtensions)
    }
    
    // Check for extensions without schema
    const invalidExtensions = extensions
      .map((ext, index) => ({ ext, index, name: ext?.name || 'unknown', hasSchema: !!(ext as any)?.config?.addGlobalAttributes || !!(ext as any)?.type }))
      .filter(({ ext }) => ext && !(ext as any).type && !(ext as any).config)
    
    if (invalidExtensions.length > 0) {
      console.error('❌ [useSharedTipTapExtensions] Found extensions without proper structure:', invalidExtensions)
    }
    
    // Log extension details with more info
    console.log('🔵 [useSharedTipTapExtensions] Extensions:', {
      count: extensions.length,
      names: extensions.map((ext, i) => ext ? (ext.name || `Extension ${i}`) : `UNDEFINED at ${i}`),
      hasUndefined: undefinedExtensions.length > 0,
      details: extensions.map((ext, i) => ({
        index: i,
        name: ext?.name || 'unknown',
        hasType: !!(ext as any)?.type,
        hasConfig: !!(ext as any)?.config,
        type: typeof ext
      }))
    })
    
    return extensions
  }, [
    placeholder,
    openLinksOnClick,
    imageStrategy,
    videoStrategy,
    audioStrategy,
    fileStrategy,
    VideoProgressComponent,
    imageDownloadHandler,
    videoDownloadHandler,
    audioDownloadHandler,
    fileDownloadHandler,
  ])
}
