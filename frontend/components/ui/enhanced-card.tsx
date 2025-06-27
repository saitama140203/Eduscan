"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const enhancedCardVariants = cva(
  "rounded-lg border bg-card text-card-foreground transition-all duration-200",
  {
    variants: {
      variant: {
        default: "shadow-soft",
        elevated: "shadow-medium hover:shadow-strong",
        flat: "shadow-none border-2",
        glass: "glass backdrop-blur-md border-white/20",
        gradient: "bg-gradient-primary border-primary/20",
        success: "border-success/20 bg-success/5",
        warning: "border-warning/20 bg-warning/5",
        error: "border-destructive/20 bg-destructive/5",
        info: "border-info/20 bg-info/5",
      },
      size: {
        sm: "p-3",
        default: "p-4",
        lg: "p-6",
        xl: "p-8",
      },
      interactive: {
        none: "",
        hover: "hover:shadow-medium hover:scale-[1.01] cursor-pointer",
        press: "hover:shadow-medium active:scale-[0.99] cursor-pointer",
      },
      spacing: {
        none: "space-y-0",
        sm: "space-y-2",
        default: "space-y-4",
        lg: "space-y-6",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      interactive: "none",
      spacing: "default",
    },
  }
)

const enhancedCardHeaderVariants = cva(
  "flex flex-col space-y-1.5",
  {
    variants: {
      align: {
        left: "text-left",
        center: "text-center items-center",
        right: "text-right items-end",
      },
      spacing: {
        none: "pb-0",
        sm: "pb-2",
        default: "pb-4",
        lg: "pb-6",
      }
    },
    defaultVariants: {
      align: "left",
      spacing: "default",
    },
  }
)

const enhancedCardTitleVariants = cva(
  "font-semibold leading-none tracking-tight",
  {
    variants: {
      size: {
        sm: "text-sm",
        default: "text-lg",
        lg: "text-xl",
        xl: "text-2xl",
      }
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export interface EnhancedCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof enhancedCardVariants> {
  asChild?: boolean
}

export interface EnhancedCardHeaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof enhancedCardHeaderVariants> {}

export interface EnhancedCardTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof enhancedCardTitleVariants> {}

export interface EnhancedCardDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

export interface EnhancedCardContentProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export interface EnhancedCardFooterProps
  extends React.HTMLAttributes<HTMLDivElement> {
  align?: "left" | "center" | "right" | "between"
}

const EnhancedCard = React.forwardRef<HTMLDivElement, EnhancedCardProps>(
  ({ className, variant, size, interactive, spacing, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(enhancedCardVariants({ variant, size, interactive, spacing }), className)}
      {...props}
    />
  )
)
EnhancedCard.displayName = "EnhancedCard"

const EnhancedCardHeader = React.forwardRef<HTMLDivElement, EnhancedCardHeaderProps>(
  ({ className, align, spacing, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(enhancedCardHeaderVariants({ align, spacing }), className)}
      {...props}
    />
  )
)
EnhancedCardHeader.displayName = "EnhancedCardHeader"

const EnhancedCardTitle = React.forwardRef<HTMLParagraphElement, EnhancedCardTitleProps>(
  ({ className, size, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(enhancedCardTitleVariants({ size }), className)}
      {...props}
    />
  )
)
EnhancedCardTitle.displayName = "EnhancedCardTitle"

const EnhancedCardDescription = React.forwardRef<HTMLParagraphElement, EnhancedCardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
)
EnhancedCardDescription.displayName = "EnhancedCardDescription"

const EnhancedCardContent = React.forwardRef<HTMLDivElement, EnhancedCardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("", className)} {...props} />
  )
)
EnhancedCardContent.displayName = "EnhancedCardContent"

const EnhancedCardFooter = React.forwardRef<HTMLDivElement, EnhancedCardFooterProps>(
  ({ className, align = "left", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center pt-4",
        {
          "justify-start": align === "left",
          "justify-center": align === "center", 
          "justify-end": align === "right",
          "justify-between": align === "between",
        },
        className
      )}
      {...props}
    />
  )
)
EnhancedCardFooter.displayName = "EnhancedCardFooter"

export {
  EnhancedCard,
  EnhancedCardHeader,
  EnhancedCardFooter,
  EnhancedCardTitle,
  EnhancedCardDescription,
  EnhancedCardContent,
} 