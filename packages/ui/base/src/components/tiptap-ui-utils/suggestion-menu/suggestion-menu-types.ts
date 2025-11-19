import type { UseFloatingOptions } from "@floating-ui/react"
import type { PluginKey } from "@tiptap/pm/state"
import type { SuggestionOptions } from "@tiptap/suggestion"
import type { Editor, Range } from "@tiptap/react"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DefaultContext = any

type IconProps = React.SVGProps<SVGSVGElement>
type IconComponent = ({ className, ...props }: IconProps) => React.ReactElement

export interface SuggestionItem<T = DefaultContext> {
  /**
   * The main text to display for the suggestion.
   */
  title: string
  /**
   * Secondary text to provide additional context.
   */
  subtext?: string
  /**
   * Icon or badge to display alongside the suggestion.
   */
  badge?:
    | React.MemoExoticComponent<IconComponent>
    | React.FC<IconProps>
    | string
  /**
   * Group identifier for organizing suggestions.
   */
  group?: string
  /**
   * Additional keywords for filtering suggestions.
   */
  keywords?: string[]
  /**
   * Custom data to pass to the onSelect handler.
   */
  context?: T
  /**
   * Callback executed when this suggestion is selected.
   * If the item has sub-items, this is called when a sub-item is selected.
   */
  onSelect: (props: { 
    editor: Editor
    range: Range
    context?: T
    deletionInfo?: { startPosition: number; cursorPosition: number } | null
  }) => void
  /**
   * Sub-items for creating nested/cascading menus.
   * When present, the item acts as a sub-menu trigger.
   */
  subItems?: SuggestionItem<T>[]
}

export type SuggestionMenuRenderProps<T = DefaultContext> = {
  /**
   * List of suggestion items to display.
   */
  items: SuggestionItem<T>[]
  /**
   * Index of the currently selected item.
   */
  selectedIndex?: number
  /**
   * Callback to select an item.
   */
  onSelect: (item: SuggestionItem<T>) => void
  /**
   * Currently open sub-menu index (if any).
   */
  openSubMenuIndex?: number | null
  /**
   * Selected index within the open sub-menu.
   */
  subMenuSelectedIndex?: number | null
  /**
   * Callback to open a sub-menu for an item.
   */
  onOpenSubMenu?: (itemIndex: number) => void
  /**
   * Callback to close the currently open sub-menu.
   */
  onCloseSubMenu?: () => void
}

export interface SuggestionMenuProps<T = DefaultContext>
  extends Omit<SuggestionOptions<SuggestionItem<T>>, "pluginKey" | "editor"> {
  /**
   * The Tiptap editor instance.
   */
  editor?: Editor | null
  /**
   * Additional options for the floating UI.
   */
  floatingOptions?: Partial<UseFloatingOptions>
  /**
   * CSS selector attribute for targeting the menu.
   * @default 'tiptap-suggestion-menu'
   */
  selector?: string
  /**
   * Unique key for the suggestion plugin.
   * @default SuggestionPluginKey
   */
  pluginKey?: string | PluginKey
  /**
   * Maximum height of the suggestion menu.
   * If provided, the menu will scroll if content exceeds this height.
   * @default 384
   */
  maxHeight?: number
  /**
   * Render function for the menu content.
   */
  children: (props: SuggestionMenuRenderProps<T>) => React.ReactNode
}
