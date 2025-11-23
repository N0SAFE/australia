"use client"

import { useEffect, useMemo, useRef } from "react"
import { ChevronRight } from "lucide-react"

// --- Lib ---
import { getElementOverflowPosition } from "@/lib/tiptap-collab-utils"

// --- Tiptap UI ---
import type {
  SuggestionMenuProps,
  SuggestionItem,
  SuggestionMenuRenderProps,
} from "@/components/tiptap-ui-utils/suggestion-menu"
import { filterSuggestionItems } from "@/components/tiptap-ui-utils/suggestion-menu"
import { SuggestionMenu } from "@/components/tiptap-ui-utils/suggestion-menu"

// --- Hooks ---
import type { SlashMenuConfig } from "@/components/tiptap-ui/slash-dropdown-menu/use-slash-dropdown-menu"
import { useSlashDropdownMenu } from "@/components/tiptap-ui/slash-dropdown-menu/use-slash-dropdown-menu"

// --- UI Primitives ---
import { Button, ButtonGroup } from "@/components/tiptap-ui-primitive/button"
import { Separator } from "@/components/tiptap-ui-primitive/separator"
import {
  Card,
  CardBody,
  CardGroupLabel,
  CardItemGroup,
} from "@/components/tiptap-ui-primitive/card"

import "@/components/tiptap-ui/slash-dropdown-menu/slash-dropdown-menu.scss"

type SlashDropdownMenuProps = Omit<
  SuggestionMenuProps,
  "items" | "children"
> & {
  config?: SlashMenuConfig
}

export const SlashDropdownMenu = (props: SlashDropdownMenuProps) => {
  const { config, ...restProps } = props
  const { getSlashMenuItems } = useSlashDropdownMenu(config)

  return (
    <SuggestionMenu
      char="/"
      pluginKey="slashDropdownMenu"
      decorationClass="tiptap-slash-decoration"
      decorationContent="Filter..."
      selector="tiptap-slash-dropdown-menu"
      items={({ query, editor }) =>
        filterSuggestionItems(getSlashMenuItems(editor), query)
      }
      {...restProps}
    >
      {(props) => <List {...props} config={config} />}
    </SuggestionMenu>
  )
}

const Item = (props: {
  item: SuggestionItem
  isSelected: boolean
  onSelect: () => void
  onOpenSubMenu?: () => void
  hasSubMenu?: boolean
  isSubMenuItem?: boolean
}) => {
  const { item, isSelected, onSelect, onOpenSubMenu, hasSubMenu, isSubMenuItem } = props
  const itemRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const selector = document.querySelector(
      '[data-selector="tiptap-slash-dropdown-menu"]'
    ) as HTMLElement
    if (!itemRef.current || !isSelected || !selector) return

    const overflow = getElementOverflowPosition(itemRef.current, selector)

    if (overflow === "top") {
      itemRef.current.scrollIntoView(true)
    } else if (overflow === "bottom") {
      itemRef.current.scrollIntoView(false)
    }
  }, [isSelected])

  const BadgeIcon = item.badge

  const handleClick = () => {
    // If this item has a submenu, open the submenu instead of selecting
    if (hasSubMenu && onOpenSubMenu) {
      onOpenSubMenu()
    } else {
      // Otherwise, select the item
      onSelect()
    }
  }

  return (
    <Button
      ref={itemRef}
      type="button"
      data-style="ghost"
      data-active-state={isSelected ? "on" : "off"}
      onClick={handleClick}
      className={isSubMenuItem ? "tiptap-submenu-item" : ""}
    >
      {BadgeIcon && <BadgeIcon className="tiptap-button-icon" />}
      <div className="tiptap-button-text">{item.title}</div>
      {hasSubMenu && <ChevronRight className="tiptap-submenu-arrow" />}
    </Button>
  )
}

const List = ({
  items,
  selectedIndex,
  onSelect,
  config,
  openSubMenuIndex,
  subMenuSelectedIndex,
  onOpenSubMenu,
  onCloseSubMenu,
}: SuggestionMenuRenderProps & { config?: SlashMenuConfig }) => {
  const renderedItems = useMemo(() => {
    const rendered: React.ReactElement[] = []
    const showGroups = config?.showGroups !== false

    if (!showGroups) {
      items.forEach((item, index) => {
        const hasSubMenu = !!item.subItems && item.subItems.length > 0
        
        rendered.push(
          <Item
            key={`item-${index}-${item.title}`}
            item={item}
            isSelected={index === selectedIndex}
            onSelect={() => onSelect(item)}
            onOpenSubMenu={hasSubMenu && onOpenSubMenu ? () => onOpenSubMenu(index) : undefined}
            hasSubMenu={hasSubMenu}
          />
        )
      })
      return rendered
    }

    const groups: {
      [groupLabel: string]: { items: SuggestionItem[]; indices: number[] }
    } = {}

    items.forEach((item, index) => {
      const groupLabel = item.group || ""
      if (!groups[groupLabel]) {
        groups[groupLabel] = { items: [], indices: [] }
      }
      groups[groupLabel].items.push(item)
      groups[groupLabel].indices.push(index)
    })

    Object.entries(groups).forEach(([groupLabel, groupData], groupIndex) => {
      if (groupIndex > 0) {
        rendered.push(
          <Separator key={`separator-${groupIndex}`} orientation="horizontal" />
        )
      }

      const groupItems = groupData.items.map((item, itemIndex) => {
        const originalIndex = groupData.indices[itemIndex]
        const hasSubMenu = !!item.subItems && item.subItems.length > 0
        
        return (
          <Item
            key={`item-${originalIndex}-${item.title}`}
            item={item}
            isSelected={originalIndex === selectedIndex}
            onSelect={() => onSelect(item)}
            onOpenSubMenu={hasSubMenu && onOpenSubMenu ? () => onOpenSubMenu(originalIndex) : undefined}
            hasSubMenu={hasSubMenu}
          />
        )
      })

      if (groupLabel) {
        rendered.push(
          <CardItemGroup key={`group-${groupIndex}-${groupLabel}`}>
            <CardGroupLabel>{groupLabel}</CardGroupLabel>
            <ButtonGroup>{groupItems}</ButtonGroup>
          </CardItemGroup>
        )
      } else {
        rendered.push(...groupItems)
      }
    })

    return rendered
  }, [items, selectedIndex, onSelect, config?.showGroups, openSubMenuIndex, subMenuSelectedIndex, onOpenSubMenu])

  if (!renderedItems.length) {
    return null
  }

  // Find the item with open submenu
  const openItem = typeof openSubMenuIndex === 'number' && openSubMenuIndex >= 0 && openSubMenuIndex < items.length 
    ? items[openSubMenuIndex] 
    : null
  const hasOpenSubMenu = openItem?.subItems && openItem.subItems.length > 0

  return (
    <>
      <Card
        className="tiptap-slash-card"
        style={{
          maxHeight: "var(--suggestion-menu-max-height)",
        }}
      >
        <CardBody className="tiptap-slash-card-body">{renderedItems}</CardBody>
      </Card>
      
      {hasOpenSubMenu && openItem?.subItems && (
        <Card className="tiptap-submenu-card" data-submenu="true">
          <CardBody className="tiptap-submenu-card-body">
            {openItem.subItems.map((subItem: SuggestionItem, subIndex: number) => (
              <Item
                key={`submenu-${openSubMenuIndex}-${subIndex}-${subItem.title}`}
                item={subItem}
                isSelected={subMenuSelectedIndex === subIndex}
                onSelect={() => {
                  // Close submenu state first
                  if (onCloseSubMenu) {
                    onCloseSubMenu()
                  }
                  // Defer to next animation frame to ensure submenu state is fully cleared
                  requestAnimationFrame(() => {
                    onSelect(subItem)
                  })
                }}
                isSubMenuItem
              />
            ))}
          </CardBody>
        </Card>
      )}
    </>
  )
}
