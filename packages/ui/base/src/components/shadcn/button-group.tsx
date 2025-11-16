"use client"

import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/shadcn/separator"

const buttonGroupVariants = cva(
  "inline-flex items-center rounded-md ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
  {
    variants: {
      variant: {
        outline: "border border-input shadow-sm",
        default: "",
      },
      orientation: {
        horizontal: "flex-row divide-x",
        vertical: "flex-col divide-y",
      },
    },
    defaultVariants: {
      variant: "outline",
      orientation: "horizontal",
    },
  },
)

const buttonGroupTextVariants = cva("", {
  variants: {
    orientation: {
      horizontal: "px-3 py-2",
      vertical: "px-2 py-3",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
  },
})

interface ButtonGroupProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof buttonGroupVariants> {}

function ButtonGroup({
  className,
  variant,
  orientation,
  ...props
}: ButtonGroupProps) {
  return (
    <div
      data-slot="button-group"
      data-variant={variant}
      data-orientation={orientation}
      className={cn(buttonGroupVariants({ variant, orientation }), className)}
      {...props}
    />
  )
}

function ButtonGroupText({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof buttonGroupTextVariants>) {
  return (
    <div
      data-slot="button-group-text"
      className={cn(
        buttonGroupTextVariants({ orientation }),
        "bg-muted text-muted-foreground flex items-center justify-center text-sm",
        className,
      )}
      {...props}
    />
  )
}

function ButtonGroupSeparator() {
  return <Separator data-slot="button-group-separator" decorative />
}

export { ButtonGroup, ButtonGroupText, ButtonGroupSeparator }
