"use client"

import type { Editor } from "@tiptap/react"
import { useEffect, useState } from "react"
import type { SuggestionItem } from "../components/tiptap-ui-utils/suggestion-menu/suggestion-menu-types"

type Orientation = "horizontal" | "vertical" | "both"

interface MenuNavigationOptions<T> {
  /**
   * The Tiptap editor instance, if using with a Tiptap editor.
   */
  editor?: Editor | null
  /**
   * Reference to the container element for handling keyboard events.
   */
  containerRef?: React.RefObject<HTMLElement | null>
  /**
   * Search query that affects the selected item.
   */
  query?: string
  /**
   * Array of items to navigate through.
   */
  items: T[]
  /**
   * Callback fired when an item is selected.
   */
  onSelect?: (item: T) => void
  /**
   * Callback fired when the menu should close.
   */
  onClose?: () => void
  /**
   * The navigation orientation of the menu.
   * @default "vertical"
   */
  orientation?: Orientation
  /**
   * Whether to automatically select the first item when the menu opens.
   * @default true
   */
  autoSelectFirstItem?: boolean
}

/**
 * Hook that implements keyboard navigation for dropdown menus and command palettes.
 *
 * Handles arrow keys, tab, home/end, enter for selection, and escape to close.
 * Works with both Tiptap editors and regular DOM elements.
 *
 * @param options - Configuration options for the menu navigation
 * @returns Object containing the selected index and a setter function
 */
export function useMenuNavigation<T>({
  editor,
  containerRef,
  query,
  items,
  onSelect,
  onClose,
  orientation = "vertical",
  autoSelectFirstItem = true,
}: MenuNavigationOptions<T>) {
  const [selectedIndex, setSelectedIndex] = useState<number>(
    autoSelectFirstItem ? 0 : -1
  )
  const [openSubMenuIndex, setOpenSubMenuIndex] = useState<number | null>(null)
  const [subMenuSelectedIndex, setSubMenuSelectedIndex] = useState<number>(-1)

  useEffect(() => {
    const handleKeyboardNavigation = (event: KeyboardEvent) => {
      if (!items.length) return false

      // Check if we're in a sub-menu
      const inSubMenu = openSubMenuIndex !== null
      const currentItems = inSubMenu
        ? ((items[openSubMenuIndex] as SuggestionItem<T>).subItems as T[])
        : items

      const moveNext = () => {
        if (inSubMenu) {
          setSubMenuSelectedIndex((currentIndex) => {
            if (currentIndex === -1) return 0
            return (currentIndex + 1) % currentItems.length
          })
        } else {
          setSelectedIndex((currentIndex) => {
            if (currentIndex === -1) return 0
            return (currentIndex + 1) % items.length
          })
        }
      }

      const movePrev = () => {
        if (inSubMenu) {
          setSubMenuSelectedIndex((currentIndex) => {
            if (currentIndex === -1) return currentItems.length - 1
            return (currentIndex - 1 + currentItems.length) % currentItems.length
          })
        } else {
          setSelectedIndex((currentIndex) => {
            if (currentIndex === -1) return items.length - 1
            return (currentIndex - 1 + items.length) % items.length
          })
        }
      }

      switch (event.key) {
        case "ArrowUp": {
          if (orientation === "horizontal") return false
          event.preventDefault()
          movePrev()
          return true
        }

        case "ArrowDown": {
          if (orientation === "horizontal") return false
          event.preventDefault()
          moveNext()
          return true
        }

        case "ArrowLeft": {
          if (inSubMenu) {
            // Close sub-menu and return to parent
            event.preventDefault()
            setOpenSubMenuIndex(null)
            setSubMenuSelectedIndex(-1)
            return true
          }
          if (orientation === "vertical") return false
          event.preventDefault()
          movePrev()
          return true
        }

        case "ArrowRight": {
          if (!inSubMenu && selectedIndex !== -1 && items[selectedIndex]) {
            const currentItem = items[selectedIndex] as SuggestionItem<T>
            if (currentItem.subItems && currentItem.subItems.length > 0) {
              // Open sub-menu
              event.preventDefault()
              setOpenSubMenuIndex(selectedIndex)
              setSubMenuSelectedIndex(0)
              return true
            }
          }
          if (orientation === "vertical") return false
          event.preventDefault()
          moveNext()
          return true
        }

        case "Tab": {
          event.preventDefault()
          if (event.shiftKey) {
            movePrev()
          } else {
            moveNext()
          }
          return true
        }

        case "Home": {
          event.preventDefault()
          setSelectedIndex(0)
          return true
        }

        case "End": {
          event.preventDefault()
          setSelectedIndex(items.length - 1)
          return true
        }

        case "Enter": {
          if (event.isComposing) return false
          event.preventDefault()
          
          if (inSubMenu && subMenuSelectedIndex !== -1 && currentItems[subMenuSelectedIndex]) {
            // Select sub-menu item
            onSelect?.(currentItems[subMenuSelectedIndex])
            setOpenSubMenuIndex(null)
            setSubMenuSelectedIndex(-1)
          } else if (!inSubMenu && selectedIndex !== -1 && items[selectedIndex]) {
            const currentItem = items[selectedIndex] as SuggestionItem<T>
            if (currentItem.subItems && currentItem.subItems.length > 0) {
              // Open sub-menu instead of selecting
              setOpenSubMenuIndex(selectedIndex)
              setSubMenuSelectedIndex(0)
            } else {
              // Select main menu item
              onSelect?.(items[selectedIndex])
            }
          }
          return true
        }

        case "Escape": {
          event.preventDefault()
          if (inSubMenu) {
            // Close sub-menu first
            setOpenSubMenuIndex(null)
            setSubMenuSelectedIndex(-1)
          } else {
            // Close entire menu
            onClose?.()
          }
          return true
        }

        default:
          return false
      }
    }

    let targetElement: HTMLElement | null = null

    if (editor) {
      targetElement = editor.view.dom
    } else if (containerRef?.current) {
      targetElement = containerRef.current
    }

    if (targetElement) {
      targetElement.addEventListener("keydown", handleKeyboardNavigation, true)

      return () => {
        targetElement.removeEventListener(
          "keydown",
          handleKeyboardNavigation,
          true
        )
      }
    }

    return undefined
  }, [
    editor,
    containerRef,
    items,
    selectedIndex,
    onSelect,
    onClose,
    orientation,
    openSubMenuIndex,
    subMenuSelectedIndex,
  ])

  // Reset selection when query changes
  useEffect(() => {
    if (query !== undefined) {
      setSelectedIndex(autoSelectFirstItem ? 0 : -1)
      setOpenSubMenuIndex(null)
      setSubMenuSelectedIndex(-1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const openSubMenu = (itemIndex: number) => {
    setOpenSubMenuIndex(itemIndex)
    setSubMenuSelectedIndex(0)
  }

  const closeSubMenu = () => {
    setOpenSubMenuIndex(null)
    setSubMenuSelectedIndex(-1)
  }

  return {
    selectedIndex: items.length ? selectedIndex : undefined,
    setSelectedIndex,
    openSubMenuIndex,
    subMenuSelectedIndex,
    openSubMenu,
    closeSubMenu,
  }
}
