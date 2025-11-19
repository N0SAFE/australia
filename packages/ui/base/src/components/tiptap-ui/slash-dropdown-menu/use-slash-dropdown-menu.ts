"use client"

import { useCallback } from "react"
import type { Editor } from "@tiptap/react"

// --- Types ---
interface SlashMenuActionParams {
  editor: Editor
  deletionInfo?: { startPosition: number; cursorPosition: number } | null
}

// --- Icons ---
import { CodeBlockIcon } from "@/components/tiptap-icons/code-block-icon"
import { HeadingOneIcon } from "@/components/tiptap-icons/heading-one-icon"
import { HeadingTwoIcon } from "@/components/tiptap-icons/heading-two-icon"
import { HeadingThreeIcon } from "@/components/tiptap-icons/heading-three-icon"
import { ImageIcon } from "@/components/tiptap-icons/image-icon"
import { ListIcon } from "@/components/tiptap-icons/list-icon"
import { ListOrderedIcon } from "@/components/tiptap-icons/list-ordered-icon"
import { BlockquoteIcon } from "@/components/tiptap-icons/blockquote-icon"
import { ListTodoIcon } from "@/components/tiptap-icons/list-todo-icon"
import { AiSparklesIcon } from "@/components/tiptap-icons/ai-sparkles-icon"
import { MinusIcon } from "@/components/tiptap-icons/minus-icon"
import { TypeIcon } from "@/components/tiptap-icons/type-icon"
import { AtSignIcon } from "@/components/tiptap-icons/at-sign-icon"
import { SmilePlusIcon } from "@/components/tiptap-icons/smile-plus-icon"
import { TableIcon } from "@/components/tiptap-icons/table-icon"
import { PlusIcon } from "@/components/tiptap-icons/plus-icon"
import { Video, Music, FileText } from "lucide-react"

// --- Lib ---
import {
  isExtensionAvailable,
  isNodeInSchema,
} from "@/lib/tiptap-utils"
import {
  findSelectionPosition,
  hasContentAbove,
} from "@/lib/tiptap-advanced-utils"

// --- Tiptap UI ---
import type { SuggestionItem } from "@/components/tiptap-ui-utils/suggestion-menu"
import { addEmojiTrigger } from "@/components/tiptap-ui/emoji-trigger-button"
import { addMentionTrigger } from "@/components/tiptap-ui/mention-trigger-button"

export interface SlashMenuConfig {
  enabledItems?: SlashMenuItemType[]
  customItems?: SuggestionItem[]
  itemGroups?: {
    [key in SlashMenuItemType]?: string
  }
  showGroups?: boolean
}

const texts = {
  // AI
  continue_writing: {
    title: "Continue Writing",
    subtext: "Continue writing from the current position",
    keywords: ["continue", "write", "continue writing", "ai"],
    badge: AiSparklesIcon,
    group: "AI",
  },
  ai_ask_button: {
    title: "Ask AI",
    subtext: "Ask AI to generate content",
    keywords: ["ai", "ask", "generate"],
    badge: AiSparklesIcon,
    group: "AI",
  },

  // Style
  text: {
    title: "Text",
    subtext: "Regular text paragraph",
    keywords: ["p", "paragraph", "text"],
    badge: TypeIcon,
    group: "Style",
  },
  heading_1: {
    title: "Heading 1",
    subtext: "Top-level heading",
    keywords: ["h", "heading1", "h1"],
    badge: HeadingOneIcon,
    group: "Style",
  },
  heading_2: {
    title: "Heading 2",
    subtext: "Key section heading",
    keywords: ["h2", "heading2", "subheading"],
    badge: HeadingTwoIcon,
    group: "Style",
  },
  heading_3: {
    title: "Heading 3",
    subtext: "Subsection and group heading",
    keywords: ["h3", "heading3", "subheading"],
    badge: HeadingThreeIcon,
    group: "Style",
  },
  bullet_list: {
    title: "Bullet List",
    subtext: "List with unordered items",
    keywords: ["ul", "li", "list", "bulletlist", "bullet list"],
    badge: ListIcon,
    group: "Style",
  },
  ordered_list: {
    title: "Numbered List",
    subtext: "List with ordered items",
    keywords: ["ol", "li", "list", "numberedlist", "numbered list"],
    badge: ListOrderedIcon,
    group: "Style",
  },
  task_list: {
    title: "To-do list",
    subtext: "List with tasks",
    keywords: ["tasklist", "task list", "todo", "checklist"],
    badge: ListTodoIcon,
    group: "Style",
  },
  quote: {
    title: "Blockquote",
    subtext: "Blockquote block",
    keywords: ["quote", "blockquote"],
    badge: BlockquoteIcon,
    group: "Style",
  },
  code_block: {
    title: "Code Block",
    subtext: "Code block with syntax highlighting",
    keywords: ["code", "pre"],
    badge: CodeBlockIcon,
    group: "Style",
  },

  // Insert
  mention: {
    title: "Mention",
    subtext: "Mention a user or item",
    keywords: ["mention", "user", "item", "tag"],
    badge: AtSignIcon,
    group: "Insert",
  },
  emoji: {
    title: "Emoji",
    subtext: "Insert an emoji",
    keywords: ["emoji", "emoticon", "smiley"],
    badge: SmilePlusIcon,
    group: "Insert",
  },
  table: {
    title: "Table",
    subtext: "Insert a table",
    aliases: ["table", "insertTable"],
    badge: TableIcon,
    group: "Insert",
  },
  divider: {
    title: "Separator",
    subtext: "Horizontal line to separate content",
    keywords: ["hr", "horizontalRule", "line", "separator"],
    badge: MinusIcon,
    group: "Insert",
  },

  // Upload
  image: {
    title: "Image",
    subtext: "Resizable image with caption",
    keywords: [
      "image",
      "imageUpload",
      "upload",
      "img",
      "picture",
      "media",
      "url",
    ],
    badge: ImageIcon,
    group: "Upload",
  },
  video: {
    title: "Video",
    subtext: "Upload and embed video",
    keywords: ["video", "videoUpload", "upload", "media", "mp4"],
    badge: Video,
    group: "Upload",
  },
  audio: {
    title: "Audio",
    subtext: "Upload and embed audio",
    keywords: ["audio", "audioUpload", "upload", "music", "sound", "mp3"],
    badge: Music,
    group: "Upload",
  },
  file: {
    title: "File",
    subtext: "Upload any file type",
    keywords: ["file", "fileUpload", "upload", "document", "attachment"],
    badge: FileText,
    group: "Upload",
  },
  add_file: {
    title: "+ Add File",
    subtext: "Upload media or files",
    keywords: ["add", "upload", "file", "media", "image", "video", "audio"],
    badge: PlusIcon,
    group: "Insert",
  },
}

export type SlashMenuItemType = keyof typeof texts

const getItemImplementations = () => {
  return {
    // AI
    continue_writing: {
      check: (editor: Editor) => {
        const { hasContent } = hasContentAbove(editor)
        const extensionsReady = isExtensionAvailable(editor, [
          "ai",
          "aiAdvanced",
        ])
        return extensionsReady && hasContent
      },
      action: ({ editor, deletionInfo }: SlashMenuActionParams) => {
        const editorChain = editor.chain().focus()

        // Delete the trigger character first if deletionInfo is provided
        if (deletionInfo) {
          editorChain.deleteRange({ from: deletionInfo.startPosition, to: deletionInfo.cursorPosition })
        }

        const nodeSelectionPosition = findSelectionPosition({ editor })

        if (nodeSelectionPosition !== null) {
          editorChain.setNodeSelection(nodeSelectionPosition)
        }

        editorChain.run()

        editor.chain().focus().aiGenerationShow().run()

        requestAnimationFrame(() => {
          const { hasContent, content } = hasContentAbove(editor)

          const snippet =
            content.length > 500 ? `...${content.slice(-500)}` : content

          const prompt = hasContent
            ? `Context: ${snippet}\n\nContinue writing from where the text above ends. Write ONLY ONE SENTENCE. DONT REPEAT THE TEXT.`
            : "Start writing a new paragraph. Write ONLY ONE SENTENCE."

          editor
            .chain()
            .focus()
            .aiTextPrompt({
              stream: true,
              format: "rich-text",
              text: prompt,
            })
            .run()
        })
      },
    },
    ai_ask_button: {
      check: (editor: Editor) =>
        isExtensionAvailable(editor, ["ai", "aiAdvanced"]),
      action: ({ editor, deletionInfo }: SlashMenuActionParams) => {
        const editorChain = editor.chain().focus()

        // Delete the trigger character first if deletionInfo is provided
        if (deletionInfo) {
          editorChain.deleteRange({ from: deletionInfo.startPosition, to: deletionInfo.cursorPosition })
        }

        const nodeSelectionPosition = findSelectionPosition({ editor })

        if (nodeSelectionPosition !== null) {
          editorChain.setNodeSelection(nodeSelectionPosition)
        }

        editorChain.run()

        editor.chain().focus().aiGenerationShow().run()
      },
    },

    // Style
    text: {
      check: (editor: Editor) => isNodeInSchema("paragraph", editor),
      action: ({ editor, deletionInfo }: SlashMenuActionParams) => {
        const chain = editor.chain().focus()
        if (deletionInfo) {
          chain.deleteRange({ from: deletionInfo.startPosition, to: deletionInfo.cursorPosition })
        }
        chain.setParagraph().run()
      },
    },
    heading_1: {
      check: (editor: Editor) => isNodeInSchema("heading", editor),
      action: ({ editor, deletionInfo }: SlashMenuActionParams) => {
        const chain = editor.chain().focus()
        if (deletionInfo) {
          chain.deleteRange({ from: deletionInfo.startPosition, to: deletionInfo.cursorPosition })
        }
        chain.toggleHeading({ level: 1 }).run()
      },
    },
    heading_2: {
      check: (editor: Editor) => isNodeInSchema("heading", editor),
      action: ({ editor, deletionInfo }: SlashMenuActionParams) => {
        const chain = editor.chain().focus()
        if (deletionInfo) {
          chain.deleteRange({ from: deletionInfo.startPosition, to: deletionInfo.cursorPosition })
        }
        chain.toggleHeading({ level: 2 }).run()
      },
    },
    heading_3: {
      check: (editor: Editor) => isNodeInSchema("heading", editor),
      action: ({ editor, deletionInfo }: SlashMenuActionParams) => {
        const chain = editor.chain().focus()
        if (deletionInfo) {
          chain.deleteRange({ from: deletionInfo.startPosition, to: deletionInfo.cursorPosition })
        }
        chain.toggleHeading({ level: 3 }).run()
      },
    },
    bullet_list: {
      check: (editor: Editor) => isNodeInSchema("bulletList", editor),
      action: ({ editor, deletionInfo }: SlashMenuActionParams) => {
        const chain = editor.chain().focus()
        if (deletionInfo) {
          chain.deleteRange({ from: deletionInfo.startPosition, to: deletionInfo.cursorPosition })
        }
        chain.toggleBulletList().run()
      },
    },
    ordered_list: {
      check: (editor: Editor) => isNodeInSchema("orderedList", editor),
      action: ({ editor, deletionInfo }: SlashMenuActionParams) => {
        const chain = editor.chain().focus()
        if (deletionInfo) {
          chain.deleteRange({ from: deletionInfo.startPosition, to: deletionInfo.cursorPosition })
        }
        chain.toggleOrderedList().run()
      },
    },
    task_list: {
      check: (editor: Editor) => isNodeInSchema("taskList", editor),
      action: ({ editor, deletionInfo }: SlashMenuActionParams) => {
        const chain = editor.chain().focus()
        if (deletionInfo) {
          chain.deleteRange({ from: deletionInfo.startPosition, to: deletionInfo.cursorPosition })
        }
        chain.toggleTaskList().run()
      },
    },
    quote: {
      check: (editor: Editor) => isNodeInSchema("blockquote", editor),
      action: ({ editor, deletionInfo }: SlashMenuActionParams) => {
        const chain = editor.chain().focus()
        if (deletionInfo) {
          chain.deleteRange({ from: deletionInfo.startPosition, to: deletionInfo.cursorPosition })
        }
        chain.toggleBlockquote().run()
      },
    },
    code_block: {
      check: (editor: Editor) => isNodeInSchema("codeBlock", editor),
      action: ({ editor, deletionInfo }: SlashMenuActionParams) => {
        const chain = editor.chain().focus()
        if (deletionInfo) {
          chain.deleteRange({ from: deletionInfo.startPosition, to: deletionInfo.cursorPosition })
        }
        chain.toggleNode("codeBlock", "paragraph").run()
      },
    },

    // Insert
    mention: {
      check: (editor: Editor) =>
        isExtensionAvailable(editor, ["mention", "mentionAdvanced"]),
      action: ({ editor, deletionInfo }: SlashMenuActionParams) => {
        if (deletionInfo) {
          editor.chain().focus().deleteRange({ from: deletionInfo.startPosition, to: deletionInfo.cursorPosition }).run()
        }
        addMentionTrigger(editor)
      },
    },
    emoji: {
      check: (editor: Editor) =>
        isExtensionAvailable(editor, ["emoji", "emojiPicker"]),
      action: ({ editor, deletionInfo }: SlashMenuActionParams) => {
        if (deletionInfo) {
          editor.chain().focus().deleteRange({ from: deletionInfo.startPosition, to: deletionInfo.cursorPosition }).run()
        }
        addEmojiTrigger(editor)
      },
    },
    divider: {
      check: (editor: Editor) => isNodeInSchema("horizontalRule", editor),
      action: ({ editor, deletionInfo }: SlashMenuActionParams) => {
        const chain = editor.chain().focus()
        if (deletionInfo) {
          chain.deleteRange({ from: deletionInfo.startPosition, to: deletionInfo.cursorPosition })
        }
        chain.setHorizontalRule().run()
      },
    },
    table: {
      check: (editor: Editor) => isNodeInSchema("table", editor),
      action: ({ editor, deletionInfo }: SlashMenuActionParams) => {
        const chain = editor.chain().focus()
        if (deletionInfo) {
          chain.deleteRange({ from: deletionInfo.startPosition, to: deletionInfo.cursorPosition })
        }
        chain.insertTable({
          rows: 3,
          cols: 3,
          withHeaderRow: false,
        }).run()
      },
    },

    // Upload
    image: {
      check: (editor: Editor) => isNodeInSchema("image", editor),
      action: ({ editor, deletionInfo }: SlashMenuActionParams) => {
        const chain = editor.chain().focus()
        
        // Delete the trigger character first if deletionInfo is provided
        if (deletionInfo) {
          chain.deleteRange({ from: deletionInfo.startPosition, to: deletionInfo.cursorPosition })
        }
        
        // Then insert the upload node
        chain.insertContent({ type: "imageUpload" }).run()
      },
    },
    video: {
      check: (editor: Editor) => isNodeInSchema("video", editor),
      action: ({ editor, deletionInfo }: SlashMenuActionParams) => {
        const chain = editor.chain().focus()
        
        // Delete the trigger character first if deletionInfo is provided
        if (deletionInfo) {
          chain.deleteRange({ from: deletionInfo.startPosition, to: deletionInfo.cursorPosition })
        }
        
        // Then insert the upload node
        chain.insertContent({ type: "videoUpload" }).run()
      },
    },
    audio: {
      check: (editor: Editor) => isNodeInSchema("audio", editor),
      action: ({ editor, deletionInfo }: SlashMenuActionParams) => {
        const chain = editor.chain().focus()
        
        // Delete the trigger character first if deletionInfo is provided
        if (deletionInfo) {
          chain.deleteRange({ from: deletionInfo.startPosition, to: deletionInfo.cursorPosition })
        }
        
        // Then insert the upload node
        chain.insertContent({ type: "audioUpload" }).run()
      },
    },
    file: {
      check: (editor: Editor) => isNodeInSchema("file", editor),
      action: ({ editor, deletionInfo }: SlashMenuActionParams) => {
        const chain = editor.chain().focus()
        
        // Delete the trigger character first if deletionInfo is provided
        if (deletionInfo) {
          chain.deleteRange({ from: deletionInfo.startPosition, to: deletionInfo.cursorPosition })
        }
        
        // Then insert the upload node
        chain.insertContent({ type: "fileUpload" }).run()
      },
    },
    add_file: {
      check: () => true, // Always available as it's a submenu
      action: () => {
        // No action for submenu parent - handled by navigation
      },
    },
  }
}

function organizeItemsByGroups(
  items: SuggestionItem[],
  showGroups: boolean
): SuggestionItem[] {
  if (!showGroups) {
    return items.map((item) => ({ ...item, group: "" }))
  }

  const groups: { [groupLabel: string]: SuggestionItem[] } = {}

  // Group items
  items.forEach((item) => {
    const groupLabel = item.group || ""
    if (!groups[groupLabel]) {
      groups[groupLabel] = []
    }
    groups[groupLabel].push(item)
  })

  // Flatten groups in order (this maintains the visual order for keyboard navigation)
  const organizedItems: SuggestionItem[] = []
  Object.entries(groups).forEach(([, groupItems]) => {
    organizedItems.push(...groupItems)
  })

  return organizedItems
}

/**
 * Custom hook for slash dropdown menu functionality
 */
export function useSlashDropdownMenu(config?: SlashMenuConfig) {
  const getSlashMenuItems = useCallback(
    (editor: Editor) => {
      const items: SuggestionItem[] = []

      const enabledItems =
        config?.enabledItems || (Object.keys(texts) as SlashMenuItemType[])
      const showGroups = config?.showGroups !== false

      const itemImplementations = getItemImplementations()

      // Upload types that should only appear in add_file submenu
      const uploadTypes: SlashMenuItemType[] = ["image", "video", "audio", "file"]
      const hasAddFileMenu = enabledItems.includes("add_file")

      enabledItems.forEach((itemType) => {
        // Skip individual upload items if add_file menu is enabled (they'll be in submenu)
        if (hasAddFileMenu && uploadTypes.includes(itemType)) {
          return
        }

        const itemImpl = itemImplementations[itemType]
        const itemText = texts[itemType]

        if (itemImpl && itemText && itemImpl.check(editor)) {
          const item: SuggestionItem = {
            onSelect: ({ editor, deletionInfo }) => itemImpl.action({ editor, deletionInfo } as SlashMenuActionParams),
            ...itemText,
          }

          if (config?.itemGroups?.[itemType]) {
            item.group = config.itemGroups[itemType]
          } else if (!showGroups) {
            item.group = ""
          }

          // Special handling for add_file submenu
          if (itemType === "add_file") {
            const subItems: SuggestionItem[] = []
            
            uploadTypes.forEach((uploadType) => {
              const uploadImpl = itemImplementations[uploadType]
              const uploadText = texts[uploadType]
              
              if (uploadImpl && uploadText && uploadImpl.check(editor)) {
                subItems.push({
                  onSelect: ({ editor, deletionInfo }) => uploadImpl.action({ editor, deletionInfo } as SlashMenuActionParams),
                  ...uploadText,
                  group: "", // Sub-items don't show groups
                })
              }
            })
            
            if (subItems.length > 0) {
              item.subItems = subItems
            }
          }

          items.push(item)
        }
      })

      if (config?.customItems) {
        items.push(...config.customItems)
      }

      // Reorganize items by groups to ensure keyboard navigation works correctly
      return organizeItemsByGroups(items, showGroups)
    },
    [config]
  )

  return {
    getSlashMenuItems,
    config,
  }
}
