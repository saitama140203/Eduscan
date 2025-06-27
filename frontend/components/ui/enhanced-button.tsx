"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

const enhancedButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft hover:shadow-medium",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-soft hover:shadow-medium",
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-soft hover:shadow-medium",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-soft hover:shadow-medium",
        info: "bg-info text-info-foreground hover:bg-info/90 shadow-soft hover:shadow-medium",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:shadow-soft",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-soft hover:shadow-medium",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        gradient: "bg-gradient-to-r from-primary to-primary-600 text-primary-foreground hover:from-primary/90 hover:to-primary-600/90 shadow-glow",
        glass: "glass backdrop-blur-md text-foreground hover:bg-white/20 border border-white/20",
      },
      size: {
        default: "h-10 px-4 py-2",
        xs: "h-7 rounded-md px-2 text-xs",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-12 rounded-lg px-10 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
      animation: {
        none: "",
        pulse: "animate-pulse-subtle",
        bounce: "animate-bounce-subtle",
        shimmer: "before:absolute before:inset-0 before:bg-shimmer before:bg-[length:200%_100%] before:animate-shimmer",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      animation: "none",
    },
  }
)

export interface EnhancedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof enhancedButtonVariants> {
  asChild?: boolean
  loading?: boolean
  loadingText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

const EnhancedButton = React.forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    animation,
    asChild = false, 
    loading = false,
    loadingText,
    leftIcon,
    rightIcon,
    fullWidth = false,
    children,
    disabled,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    return (
      <Comp
        className={cn(
          enhancedButtonVariants({ variant, size, animation, className }),
          fullWidth && "w-full",
          loading && "pointer-events-none"
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {!loading && leftIcon && (
          <span className="mr-2">{leftIcon}</span>
        )}
        {loading ? (loadingText || "Đang tải...") : children}
        {!loading && rightIcon && (
          <span className="ml-2">{rightIcon}</span>
        )}
      </Comp>
    )
  }
)
EnhancedButton.displayName = "EnhancedButton"

export { EnhancedButton, enhancedButtonVariants } 