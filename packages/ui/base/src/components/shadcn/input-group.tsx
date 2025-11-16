"use client"

import { type ComponentProps, type ReactNode } from "react"
import { type VariantProps, cva } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Button } from "@/components/shadcn/button"
import { Input } from "@/components/shadcn/input"
import { Textarea } from "@/components/shadcn/textarea"

const inputGroupVariants = cva(
  "relative flex w-full items-stretch rounded-md shadow-xs has-[>[data-invalid]]:ring-[3px] has-[>[data-invalid]]:ring-destructive/20 dark:has-[>[data-invalid]]:ring-destructive/40 has-[>[data-invalid]]:border-destructive has-[>[data-align=inline-start]]:ps-0 has-[>[data-align=inline-end]]:pe-0 focus-within:z-10 focus-within:ring-[3px] focus-within:ring-ring/50 focus-within:border-ring [&_[data-slot=input-group-addon]:has([data-slot=input-group-button])]:p-0",
  {
    variants: {
      variant: {
        default: "border border-input",
        ghost: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

interface InputGroupProps
  extends Omit<ComponentProps<"div">, "children">,
    VariantProps<typeof inputGroupVariants> {
  children: ReactNode
}

function InputGroup({ className, variant, ...props }: InputGroupProps) {
  return (
    <div
      data-slot="input-group"
      data-variant={variant}
      className={cn(inputGroupVariants({ variant }), className)}
      {...props}
    />
  )
}

const inputGroupAddonVariants = cva(
  "pointer-events-none flex items-center whitespace-nowrap px-3 text-sm text-muted-foreground data-[align=inline-end]:order-1",
  {
    variants: {
      variant: {
        default: "",
        muted: "bg-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

interface InputGroupAddonProps
  extends Omit<ComponentProps<"div">, "children">,
    VariantProps<typeof inputGroupAddonVariants> {
  align?: "inline-start" | "inline-end"
  children: ReactNode
}

function InputGroupAddon({
  align = "inline-start",
  variant,
  className,
  ...props
}: InputGroupAddonProps) {
  return (
    <div
      data-slot="input-group-addon"
      data-align={align}
      data-variant={variant}
      className={cn(inputGroupAddonVariants({ variant }), className)}
      {...props}
    />
  )
}

interface InputGroupButtonProps extends ComponentProps<typeof Button> {}

function InputGroupButton({ className, ...props }: InputGroupButtonProps) {
  return (
    <Button
      data-slot="input-group-button"
      variant="ghost"
      className={cn(
        "pointer-events-auto rounded-none focus-visible:z-10 focus-visible:ring-0",
        className,
      )}
      {...props}
    />
  )
}

interface InputGroupInputProps extends ComponentProps<typeof Input> {
  invalid?: boolean
}

function InputGroupInput({
  className,
  invalid,
  ...props
}: InputGroupInputProps) {
  return (
    <Input
      data-slot="input-group-input"
      data-invalid={invalid ? "" : undefined}
      className={cn(
        "h-auto rounded-none border-0 bg-transparent shadow-none outline-none focus-visible:ring-0",
        className,
      )}
      {...props}
    />
  )
}

interface InputGroupTextareaProps extends ComponentProps<typeof Textarea> {
  invalid?: boolean
}

function InputGroupTextarea({
  className,
  invalid,
  ...props
}: InputGroupTextareaProps) {
  return (
    <Textarea
      data-slot="input-group-textarea"
      data-invalid={invalid ? "" : undefined}
      className={cn(
        "rounded-none border-0 bg-transparent shadow-none outline-none focus-visible:ring-0",
        className,
      )}
      {...props}
    />
  )
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupTextarea,
}
