"use client"

import { type ComponentProps, type HTMLAttributes } from "react"
import { type VariantProps, cva } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Label } from "@/components/shadcn/label"
import { Separator } from "@/components/shadcn/separator"

const fieldGroupVariants = cva("relative", {
  variants: {
    orientation: {
      horizontal: "flex flex-row items-start justify-between gap-2",
      vertical: "flex flex-col items-stretch",
    },
  },
  defaultVariants: {
    orientation: "vertical",
  },
})

interface FieldGroupProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof fieldGroupVariants> {}

function FieldGroup({ className, orientation, ...props }: FieldGroupProps) {
  return (
    <div
      data-slot="field-group"
      data-orientation={orientation}
      className={cn(fieldGroupVariants({ orientation }), className)}
      {...props}
    />
  )
}

interface FieldProps extends HTMLAttributes<HTMLDivElement> {}

function Field({ className, ...props }: FieldProps) {
  return (
    <div
      data-slot="field"
      className={cn("group/field relative space-y-2", className)}
      {...props}
    />
  )
}

interface FieldLabelProps extends ComponentProps<typeof Label> {
  /**
   * Whether the field is required. This will append an asterisk to the label and apply the `aria-required` attribute to the label.
   */
  isRequired?: boolean
}

function FieldLabel({ isRequired, children, ...props }: FieldLabelProps) {
  return (
    <Label
      data-slot="field-label"
      {...props}
      aria-required={isRequired}
      className={cn(
        "inline-flex gap-1 font-medium group-has-[[aria-invalid=true]]/field:text-destructive",
        props.className,
      )}
    >
      {children}
      {isRequired && (
        <span
          aria-hidden="true"
          className="text-destructive group-has-[[aria-invalid=true]]/field:text-destructive"
        >
          *
        </span>
      )}
    </Label>
  )
}

function FieldDescription({ className, ...props }: HTMLAttributes<"div">) {
  return (
    <div
      data-slot="field-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

interface FieldErrorProps extends HTMLAttributes<"div"> {
  /**
   * The error message to display. If provided, the error will be rendered. If not, the error slot will be hidden.
   */
  error?: string | null
}

function FieldError({ error, className, ...props }: FieldErrorProps) {
  if (error == null || error === "") {
    return null
  }

  return (
    <div
      data-slot="field-error"
      className={cn("text-sm text-destructive", className)}
      {...props}
    >
      {error}
    </div>
  )
}

const fieldSetVariants = cva("space-y-4 rounded-lg border border-border", {
  variants: {
    variant: {
      default: "",
      card: "bg-card text-card-foreground shadow-sm",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

interface FieldSetProps
  extends HTMLAttributes<"fieldset">,
    VariantProps<typeof fieldSetVariants> {}

function FieldSet({ className, variant, ...props }: FieldSetProps) {
  return (
    <fieldset
      data-slot="field-set"
      data-variant={variant}
      className={cn(fieldSetVariants({ variant }), className)}
      {...props}
    />
  )
}

function FieldLegend({ className, ...props }: HTMLAttributes<"legend">) {
  return (
    <legend
      data-slot="field-legend"
      className={cn("px-4 py-3 text-base font-semibold", className)}
      {...props}
    />
  )
}

function FieldSeparator({ ...props }: ComponentProps<typeof Separator>) {
  return (
    <Separator data-slot="field-separator" decorative {...props} />
  )
}

export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldSet,
  FieldLegend,
  FieldSeparator,
}
