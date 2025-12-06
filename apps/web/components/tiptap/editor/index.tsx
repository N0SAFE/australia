"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { EditorContent, EditorContext, useEditor, type Editor, type JSONContent } from "@repo/ui/tiptap-exports/react"

// --- Tiptap Core Extensions (editor-specific) ---
import { Selection } from "@repo/ui/tiptap-exports/extensions"
import { Placeholder } from "@repo/ui/tiptap-exports/extension-placeholder"
import { useSharedTipTapExtensions } from "../common"

// --- UI Primitives ---
import { Button } from "@repo/ui/components/tiptap-ui-primitive/button/index"
import { Spacer } from "@repo/ui/components/tiptap-ui-primitive/spacer/index"
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@repo/ui/components/tiptap-ui-primitive/toolbar/index"

// --- Tiptap Node (editor-specific upload nodes) ---
import {
  ImageUploadNodeExtension as ImageUploadNode,
  VideoUploadNodeExtension as VideoUploadExtension,
  AudioUploadNodeExtension as AudioUploadExtension,
  FileUploadNodeExtension as FileUploadExtension,
} from "@repo/ui/components/tiptap-node/index"
import "@repo/ui/components/tiptap-node/blockquote-node/blockquote-node.scss"
import "@repo/ui/components/tiptap-node/code-block-node/code-block-node.scss"
import "@repo/ui/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss"
import "@repo/ui/components/tiptap-node/list-node/list-node.scss"
import "@repo/ui/components/tiptap-node/image-node/image-node.scss"
import "@repo/ui/components/tiptap-node/video-node/video-node.scss"
import "@repo/ui/components/tiptap-node/audio-node/audio-node.scss"
import "@repo/ui/components/tiptap-node/heading-node/heading-node.scss"
import "@repo/ui/components/tiptap-node/paragraph-node/paragraph-node.scss"

// --- Tiptap UI ---
import { HeadingDropdownMenu } from "@repo/ui/components/tiptap-ui/heading-dropdown-menu/heading-dropdown-menu"
import { MediaDropdownMenu } from "@repo/ui/components/tiptap-ui/media-dropdown-menu/media-dropdown-menu"
import { ListDropdownMenu } from "@repo/ui/components/tiptap-ui/list-dropdown-menu/list-dropdown-menu"
import { BlockquoteButton } from "@repo/ui/components/tiptap-ui/blockquote-button/blockquote-button"
import { CodeBlockButton } from "@repo/ui/components/tiptap-ui/code-block-button/code-block-button"
import {
  ColorHighlightPopover,
  ColorHighlightPopoverContent,
  ColorHighlightPopoverButton,
} from "@repo/ui/components/tiptap-ui/color-highlight-popover/color-highlight-popover"
import {
  LinkPopover,
  LinkContent,
  LinkButton,
} from "@repo/ui/components/tiptap-ui/link-popover/link-popover"
import { MarkButton } from "@repo/ui/components/tiptap-ui/mark-button/mark-button"
import { TextAlignButton } from "@repo/ui/components/tiptap-ui/text-align-button/text-align-button"
import { UndoRedoButton } from "@repo/ui/components/tiptap-ui/undo-redo-button/undo-redo-button"

// --- Icons ---
import { ArrowLeftIcon } from "@repo/ui/components/tiptap-icons/arrow-left-icon"
import { HighlighterIcon } from "@repo/ui/components/tiptap-icons/highlighter-icon"
import { LinkIcon } from "@repo/ui/components/tiptap-icons/link-icon"

// --- Hooks ---
import { useIsBreakpoint } from "@repo/ui/hooks/use-is-breakpoint"
import { useWindowSize } from "@repo/ui/hooks/use-window-size"
import { useCursorVisibility } from "@repo/ui/hooks/use-cursor-visibility"

// --- Lib ---
import { MAX_FILE_SIZE } from "@repo/ui/lib/tiptap-utils"
import type { UploadFunction } from "@repo/ui/components/tiptap-node/media-nodes/image/upload-node/image-upload-node-extension"
import type { MediaDownloadHandler } from "@repo/ui/lib/media-url-resolver"

// --- Styles ---
import "./style.scss"

// --- Editor-specific extensions ---
import { DragContextMenu } from "@repo/ui/components/tiptap-ui/drag-context-menu/drag-context-menu"
import { UiState } from "@repo/ui/components/tiptap-extension/ui-state-extension"
import { SlashDropdownMenu } from "@repo/ui/components/tiptap-ui/slash-dropdown-menu/slash-dropdown-menu"

/**
 * Sanitizes a filename by removing or replacing problematic characters
 * Particularly handles Unicode characters like accents (é → e)
 */
const sanitizeFilename = (file: File): File => {
  const originalName = file.name
  const lastDotIndex = originalName.lastIndexOf(".")
  const nameWithoutExt = lastDotIndex > 0 ? originalName.slice(0, lastDotIndex) : originalName
  const extension = lastDotIndex > 0 ? originalName.slice(lastDotIndex) : ""

  // Normalize Unicode characters (é → e, à → a, etc.)
  const sanitizedName = nameWithoutExt
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-zA-Z0-9._-]/g, "_") // Replace other special chars with underscore
    .replace(/_+/g, "_") // Collapse multiple underscores
    .replace(/^_|_$/g, "") // Trim underscores from start/end

  const newFilename = sanitizedName + extension

  // Create a new File object with the sanitized name
  return new File([file], newFilename, { type: file.type })
}

const MainToolbarContent = ({
  editor,
  onHighlighterClick,
  onLinkClick,
  isMobile,
  uploadFunctions,
}: {
  editor: Editor | null
  onHighlighterClick: () => void
  onLinkClick: () => void
  isMobile: boolean
  uploadFunctions?: {
    image?: UploadFunction
    video?: UploadFunction
    audio?: UploadFunction
    file?: UploadFunction
  }
}) => {
  return (
    <>
      <Spacer />

      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <HeadingDropdownMenu levels={[1, 2, 3, 4]} portal={isMobile} />
        <ListDropdownMenu
          types={["bulletList", "orderedList", "taskList"]}
          portal={isMobile}
        />
        <BlockquoteButton />
        <CodeBlockButton />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
        <MarkButton type="underline" />
        {!isMobile ? (
          <ColorHighlightPopover
            editor={editor}
            hideWhenUnavailable={false}
            onApplied={() => {}}
          />
        ) : (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} />
        )}
        {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="superscript" />
        <MarkButton type="subscript" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <TextAlignButton align="left" />
        <TextAlignButton align="center" />
        <TextAlignButton align="right" />
        <TextAlignButton align="justify" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MediaDropdownMenu 
          editor={editor}
          text="Add"
          onImageUpload={uploadFunctions?.image ? () => {
            if (editor && !editor.isDestroyed) {
              editor.chain().focus().setImageUploadNode().run()
            }
          } : undefined}
          onVideoUpload={uploadFunctions?.video ? () => {
            if (editor && !editor.isDestroyed) {
              editor.chain().focus().addVideoUpload().run()
            }
          } : undefined}
          onAudioUpload={uploadFunctions?.audio ? () => {
            if (editor && !editor.isDestroyed) {
              editor.chain().focus().addAudioUpload().run()
            }
          } : undefined}
          onFileUpload={uploadFunctions?.file ? () => {
            if (editor && !editor.isDestroyed) {
              editor.chain().focus().addFileUpload().run()
            }
          } : undefined}
        />
      </ToolbarGroup>

      <Spacer />

      {isMobile && <ToolbarSeparator />}

      {/* <ToolbarGroup>
        <ThemeToggle />
      </ToolbarGroup> */}
    </>
  )
}

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: "highlighter" | "link"
  onBack: () => void
}) => (
  <>
    <ToolbarGroup>
      <Button data-style="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === "highlighter" ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === "highlighter" ? (
      <ColorHighlightPopoverContent />
    ) : (
      <LinkContent />
    )}
  </>
)

export interface SimpleEditorProps {
  value?: JSONContent
  onChange?: (value: JSONContent) => void
  editable?: boolean
  placeholder?: string
  /**
   * Callback fired when editor is fully initialized and ready
   */
  onEditorReady?: () => void
  /**
   * Upload functions for different media types
   * These should be provided by the parent app (e.g., using useStorage hook)
   */
  uploadFunctions?: {
    image?: UploadFunction
    video?: UploadFunction
    audio?: UploadFunction
    file?: UploadFunction
  }
  /**
   * Strategy resolvers for media URL resolution
   * Used to resolve media URLs based on meta.srcResolveStrategy
   */
  videoStrategy?: (meta: unknown) => Promise<string> | string
  imageStrategy?: (meta: unknown) => Promise<string> | string
  audioStrategy?: (meta: unknown) => Promise<string> | string
  fileStrategy?: (meta: unknown) => Promise<string> | string
  /**
   * Video processing progress component for Tiptap video nodes
   * Component that handles fetching and rendering video processing progress
   */
  VideoProgressComponent?: import("react").ComponentType<any>
  /**
   * Download handlers for media files
   * Used to download media files with progress tracking
   */
  videoDownloadHandler?: MediaDownloadHandler
  imageDownloadHandler?: MediaDownloadHandler
  audioDownloadHandler?: MediaDownloadHandler
  fileDownloadHandler?: MediaDownloadHandler
}

export function SimpleEditor({
  value,
  onChange,
  editable = true,
  placeholder = "Start typing...",
  onEditorReady,
  uploadFunctions,
  videoStrategy,
  imageStrategy,
  audioStrategy,
  fileStrategy,
  VideoProgressComponent,
  videoDownloadHandler,
  imageDownloadHandler,
  audioDownloadHandler,
  fileDownloadHandler,
}: SimpleEditorProps) {
  const isMobile = useIsBreakpoint()
  const { height } = useWindowSize()
  const [mobileView, setMobileView] = useState<"main" | "highlighter" | "link">(
    "main"
  )
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [toolbarHeight, setToolbarHeight] = useState(0)

  useLayoutEffect(() => {
    if (toolbarRef.current) {
      setToolbarHeight(toolbarRef.current.getBoundingClientRect().height)
    }
  }, [])

  // Get shared base extensions (used by both editor and viewer)
  const sharedExtensions = useSharedTipTapExtensions({
    placeholder,
    openLinksOnClick: false, // Disable link clicks in edit mode
    imageStrategy,
    videoStrategy,
    audioStrategy,
    fileStrategy,
    VideoProgressComponent,
    imageDownloadHandler,
    videoDownloadHandler,
    audioDownloadHandler,
    fileDownloadHandler,
  })

  // Build extensions array: shared base + editor-specific extensions
  const extensionsArray = [
      ...sharedExtensions,
      
      // Editor-specific extensions
      Selection,
      Placeholder.configure({
        placeholder,
      }),
      
      // Upload extensions (editor-only)
      ...(uploadFunctions?.image
        ? [
            ImageUploadNode.configure({
              accept: "image/*",
              maxSize: MAX_FILE_SIZE,
              limit: 3,
              upload: uploadFunctions.image,
              prepareForUpload: sanitizeFilename,
              onError: (error) => {
                console.error("Image upload failed:", error)
              },
            }),
          ]
        : []),
      ...(uploadFunctions?.video
        ? [
            VideoUploadExtension.configure({
              upload: uploadFunctions.video,
              prepareForUpload: sanitizeFilename,
              onError: (error) => {
                console.error("Video upload failed:", error)
              },
            }),
          ]
        : []),
      ...(uploadFunctions?.audio
        ? [
            AudioUploadExtension.configure({
              upload: uploadFunctions.audio,
              prepareForUpload: sanitizeFilename,
              onError: (error) => {
                console.error("Audio upload failed:", error)
              },
            }),
          ]
        : []),
      ...(uploadFunctions?.file
        ? [
            FileUploadExtension.configure({
              upload: uploadFunctions.file,
              prepareForUpload: sanitizeFilename,
              onError: (error) => {
                console.error("File upload failed:", error)
              },
            }),
          ]
        : []),
      
      // UI state management (editor-only)
      UiState
    ]

  // DEBUG: Log undefined extensions
  useEffect(() => {
    const undefinedExts = extensionsArray
      .map((ext, idx) => ({ ext, idx }))
      .filter(({ ext }) => !ext)
    if (undefinedExts.length > 0) {
      console.error('TipTap Editor: Found undefined extensions:', undefinedExts.map(e => e.idx))
    }
  }, [])

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Main content area, start typing to enter text.",
        class: "simple-editor prose",
      },
    },
    extensions: extensionsArray,
    content: value ?? { type: "doc", content: [{ type: "paragraph" }] },
    onCreate: ({ editor }) => {
      // Editor is ready
      if (onEditorReady) {
        onEditorReady()
      }
    },
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getJSON())
      }
    },
  })

  // Update editor content when value prop changes
  useEffect(() => {
    if (editor && value && JSON.stringify(editor.getJSON()) !== JSON.stringify(value)) {
      editor.commands.setContent(value, { emitUpdate: false })
    }
  }, [editor, value])

  const rect = useCursorVisibility({
    editor,
    overlayHeight: toolbarHeight,
  })

  useEffect(() => {
    if (!isMobile && mobileView !== "main") {
      setMobileView("main")
    }
  }, [isMobile, mobileView])

  return (
    <div className="simple-editor-wrapper">
      <EditorContext.Provider value={{ editor }}>
        <Toolbar
          ref={toolbarRef}
          style={{
            ...(isMobile && height && rect.y
              ? {
                  bottom: `calc(100% - ${(height - rect.y).toString()}px)`,
                }
              : {}),
          }}
        >
          {mobileView === "main" ? (
            <MainToolbarContent
              editor={editor}
              onHighlighterClick={() => { setMobileView("highlighter") }}
              onLinkClick={() => { setMobileView("link") }}
              isMobile={isMobile}
              uploadFunctions={uploadFunctions}
            />
          ) : (
            <MobileToolbarContent
              type={mobileView === "highlighter" ? "highlighter" : "link"}
              onBack={() => { setMobileView("main") }}
            />
          )}
        </Toolbar>

        <EditorContent
          editor={editor}
          role="presentation"
          className="simple-editor-content"
        />
        <SlashDropdownMenu editor={editor} />
        
        <DragContextMenu />
      </EditorContext.Provider>
    </div>
  )
}
