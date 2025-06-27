"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Eye, EyeOff, X, Search, AlertCircle, CheckCircle } from "lucide-react"
import { EnhancedButton } from "./enhanced-button"

const enhancedInputVariants = cva(
  "flex w-full rounded-md border bg-background px-3 py-2 text-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-input hover:border-primary/50",
        filled: "bg-muted border-muted hover:bg-muted/70 focus:bg-background",
        ghost: "border-transparent bg-transparent hover:bg-muted/50",
        success: "border-success/50 bg-success/5 focus-visible:ring-success",
        error: "border-destructive/50 bg-destructive/5 focus-visible:ring-destructive",
        warning: "border-warning/50 bg-warning/5 focus-visible:ring-warning",
      },
      inputSize: {
        sm: "h-8 px-2 py-1 text-xs",
        default: "h-10 px-3 py-2",
        lg: "h-12 px-4 py-3 text-base",
        xl: "h-14 px-5 py-4 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "default",
    },
  }
)

export interface EnhancedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof enhancedInputVariants> {
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  clearable?: boolean
  label?: string
  description?: string
  error?: string
  success?: string
  loading?: boolean
  containerClassName?: string
}

const EnhancedInput = React.forwardRef<HTMLInputElement, EnhancedInputProps>(
  ({
    className,
    containerClassName,
    variant,
    inputSize,
    type = "text",
    leftIcon,
    rightIcon,
    clearable = false,
    label,
    description,
    error,
    success,
    loading = false,
    value,
    onChange,
    disabled,
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const [internalValue, setInternalValue] = React.useState(value || "")

    // Update internal value when external value changes
    React.useEffect(() => {
      setInternalValue(value || "")
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInternalValue(e.target.value)
      onChange?.(e)
    }

    const handleClear = () => {
      setInternalValue("")
      const syntheticEvent = {
        target: { value: "" },
        currentTarget: { value: "" },
      } as React.ChangeEvent<HTMLInputElement>
      onChange?.(syntheticEvent)
    }

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword)
    }

    // Determine variant based on state
    const currentVariant = error ? "error" : success ? "success" : variant

    // Calculate padding based on icons
    const hasLeftIcon = leftIcon || loading
    const hasRightIcon = rightIcon || clearable || type === "password"
    
    const inputPadding = cn(
      hasLeftIcon && "pl-9",
      hasRightIcon && "pr-9",
      inputSize === "sm" && hasLeftIcon && "pl-7",
      inputSize === "sm" && hasRightIcon && "pr-7",
      inputSize === "lg" && hasLeftIcon && "pl-12",
      inputSize === "lg" && hasRightIcon && "pr-12",
      inputSize === "xl" && hasLeftIcon && "pl-14",
      inputSize === "xl" && hasRightIcon && "pr-14"
    )

    return (
      <div className={cn("space-y-2", containerClassName)}>
        {/* Label */}
        {label && (
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          {/* Left Icon */}
          {hasLeftIcon && (
            <div className={cn(
              "absolute left-0 top-0 h-full flex items-center justify-center pointer-events-none text-muted-foreground",
              inputSize === "sm" ? "w-7" : inputSize === "lg" ? "w-12" : inputSize === "xl" ? "w-14" : "w-9"
            )}>
              {loading ? (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                leftIcon
              )}
            </div>
          )}

          {/* Input */}
          <input
            type={type === "password" ? (showPassword ? "text" : "password") : type}
            className={cn(
              enhancedInputVariants({ variant: currentVariant, inputSize }),
              inputPadding,
              className
            )}
            ref={ref}
            value={internalValue}
            onChange={handleChange}
            disabled={disabled || loading}
            {...props}
          />

          {/* Right Icons */}
          {hasRightIcon && (
            <div className={cn(
              "absolute right-0 top-0 h-full flex items-center gap-1 pr-2",
              inputSize === "sm" ? "pr-1" : inputSize === "lg" ? "pr-3" : inputSize === "xl" ? "pr-4" : "pr-2"
            )}>
              {/* Clear button */}
              {clearable && internalValue && !loading && (
                <EnhancedButton
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleClear}
                  className="h-5 w-5 hover:bg-muted rounded-full"
                  tabIndex={-1}
                >
                  <X className="h-3 w-3" />
                </EnhancedButton>
              )}

              {/* Password toggle */}
              {type === "password" && (
                <EnhancedButton
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={togglePasswordVisibility}
                  className="h-5 w-5 hover:bg-muted rounded-full"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </EnhancedButton>
              )}

              {/* Custom right icon */}
              {rightIcon && (
                <div className="text-muted-foreground">
                  {rightIcon}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status Messages */}
        {(description || error || success) && (
          <div className="flex items-start gap-2">
            {error && <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />}
            {success && <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />}
            <div className="space-y-1">
              {description && !error && !success && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
              {success && (
                <p className="text-xs text-success">{success}</p>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }
)
EnhancedInput.displayName = "EnhancedInput"

// Search Input Component
export interface SearchInputProps extends Omit<EnhancedInputProps, "leftIcon" | "type"> {
  onSearch?: (value: string) => void
  searchDelay?: number
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onSearch, searchDelay = 300, ...props }, ref) => {
    const [searchTerm, setSearchTerm] = React.useState("")
    const debounceRef = React.useRef<NodeJS.Timeout>()

    React.useEffect(() => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      debounceRef.current = setTimeout(() => {
        onSearch?.(searchTerm)
      }, searchDelay)

      return () => {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current)
        }
      }
    }, [searchTerm, onSearch, searchDelay])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value)
      props.onChange?.(e)
    }

    return (
      <EnhancedInput
        ref={ref}
        type="search"
        leftIcon={<Search className="h-4 w-4" />}
        clearable
        placeholder="Tìm kiếm..."
        {...props}
        onChange={handleChange}
      />
    )
  }
)
SearchInput.displayName = "SearchInput"

export { EnhancedInput, enhancedInputVariants } 