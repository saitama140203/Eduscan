"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/contexts/authContext"
import { ErrorMessage, determineErrorType } from "@/components/ui/error-message"
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

export interface LoginFormProps {
  initialApiStatus?: boolean
  onSuccess?: () => void
  redirectTo?: string
  className?: string
}

interface FormErrors {
  email?: string
  password?: string
  general?: string
}

// Helper function to get dashboard route based on role
function getDashboardRoute(role?: string): string {
  switch (role) {
    case "admin":
      return "/dashboard/admin"
    case "manager":
      return "/dashboard/manager"
    case "teacher":
      return "/dashboard/teacher"
    default:
      return "/dashboard"
  }
}

export function LoginForm({ 
  initialApiStatus = false, 
  onSuccess,
  redirectTo,
  className 
}: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isNetworkError, setIsNetworkError] = useState(initialApiStatus)
  const [errorType, setErrorType] = useState<"network" | "server" | "validation" | "auth" | "cors" | "unknown" | undefined>(undefined)
  const [attemptCount, setAttemptCount] = useState(0)
  const [isRateLimited, setIsRateLimited] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  // Memoized validation functions
  const validateEmail = useCallback((email: string): string | undefined => {
    if (!email) return "Email là bắt buộc"
    if (!/\S+@\S+\.\S+/.test(email)) return "Email không hợp lệ"
    return undefined
  }, [])

  const validatePassword = useCallback((password: string): string | undefined => {
    if (!password) return "Mật khẩu là bắt buộc"
    if (password.length < 3) return "Mật khẩu phải có ít nhất 3 ký tự"
    return undefined
  }, [])

  // Real-time validation
  const formErrors = useMemo(() => {
    const newErrors: FormErrors = {}
    if (email) newErrors.email = validateEmail(email)
    if (password) newErrors.password = validatePassword(password)
    return newErrors
  }, [email, password, validateEmail, validatePassword])

  // Check if form is valid
  const isFormValid = useMemo(() => {
    return email && 
           password && 
           !formErrors.email && 
           !formErrors.password &&
           !isLoading &&
           !isRateLimited
  }, [email, password, formErrors, isLoading, isRateLimited])

  useEffect(() => {
    if (initialApiStatus) {
      setIsNetworkError(true)
      setErrorType("network")
    }
  }, [initialApiStatus])

  // Rate limiting logic
  useEffect(() => {
    if (attemptCount >= 3) {
      setIsRateLimited(true)
      const timer = setTimeout(() => {
        setIsRateLimited(false)
        setAttemptCount(0)
      }, 60000) // 1 phút
      return () => clearTimeout(timer)
    }
  }, [attemptCount])

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    setEmail(value)
    
    // Clear email errors when user starts typing
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: undefined }))
    }
  }, [errors.email])

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPassword(value)
    
    // Clear password errors when user starts typing
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: undefined }))
    }
  }, [errors.password])

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent multiple submissions
    if (!isFormValid || isRateLimited || isLoading) return

    setIsLoading(true)
    setErrors({})
    setErrorType(undefined)
    setIsNetworkError(false)

    try {
      const result = await login(email, password, rememberMe)
      
      if (result.success) {
        setAttemptCount(0) // Reset counter on success
        
        // Add small delay to prevent double redirect
        await new Promise(resolve => setTimeout(resolve, 100))
        
        if (onSuccess) {
          onSuccess()
        } else {
          // Redirect based on role or to specified route
          const targetRoute = redirectTo || getDashboardRoute(result.role)
          router.push(targetRoute)
        }
      } else {
        setAttemptCount(prev => prev + 1)
        
        // Cải thiện thông báo lỗi thân thiện
        let friendlyMessage = "Đăng nhập không thành công"
        
        // Phân loại lỗi dựa trên status code và message
        if (result.status === 401 || result.message?.toLowerCase().includes("unauthorized") || 
            result.message?.toLowerCase().includes("invalid") || 
            result.message?.toLowerCase().includes("incorrect") ||
            result.message?.toLowerCase().includes("wrong") ||
            result.message?.toLowerCase().includes("credentials")) {
          friendlyMessage = "Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại."
          setErrorType("auth")
        } else if (result.status === 404) {
          friendlyMessage = "Không tìm thấy tài khoản với email này."
          setErrorType("auth")
        } else if (result.status === 403) {
          friendlyMessage = "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên."
          setErrorType("auth")
        } else if (result.status === 429) {
          friendlyMessage = "Quá nhiều lần thử đăng nhập. Vui lòng đợi và thử lại sau."
          setErrorType("server")
        } else if (result.isNetworkError || result.message?.includes("CORS") || 
                   result.message?.includes("kết nối")) {
          friendlyMessage = "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối internet."
          setErrorType(result.message?.includes("CORS") ? "cors" : "network")
          setIsNetworkError(true)
        } else if (result.status && result.status >= 500) {
          friendlyMessage = "Máy chủ đang gặp sự cố. Vui lòng thử lại sau ít phút."
          setErrorType("server")
        } else {
          setErrorType("unknown")
        }
        
        setErrors({ general: friendlyMessage })
      }
    } catch (err: any) {
      console.error("Login error:", err)
      setAttemptCount(prev => prev + 1)
      
      // Xử lý lỗi không mong muốn với thông báo thân thiện
      let friendlyMessage = "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại."
      let errorType: "auth" | "network" | "server" | "cors" = "server"
      
      if (err instanceof TypeError && err.message.includes("fetch")) {
        friendlyMessage = "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối internet."
        errorType = "network"
        setIsNetworkError(true)
      } else if (err.message?.includes("CORS")) {
        friendlyMessage = "Lỗi kết nối. Vui lòng làm mới trang và thử lại."
        errorType = "cors"
      }
      
      setErrors({ general: friendlyMessage })
      setErrorType(errorType)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* General Error Message */}
        {errors.general && (
          <ErrorMessage 
            message={errors.general} 
            errorType={errorType}
            className="mb-4"
          />
        )}

        {/* Rate Limiting Warning */}
        {isRateLimited && (
          <div className="flex items-center gap-2 p-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md">
            <AlertCircle className="h-4 w-4" />
            <span>Quá nhiều lần thử. Vui lòng đợi 1 phút.</span>
          </div>
        )}

        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email *
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="Nhập email của bạn"
            value={email}
            onChange={handleEmailChange}
            disabled={isLoading || isRateLimited}
            className={cn(
              "transition-colors",
              errors.email && "border-red-500 focus:border-red-500"
            )}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && (
            <p id="email-error" className="text-sm text-red-600" role="alert">
              {errors.email}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            Mật khẩu *
          </Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={handlePasswordChange}
              disabled={isLoading || isRateLimited}
              className={cn(
                "pr-10 transition-colors",
                errors.password && "border-red-500 focus:border-red-500"
              )}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              disabled={isLoading || isRateLimited}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p id="password-error" className="text-sm text-red-600" role="alert">
              {errors.password}
            </p>
          )}
        </div>

        {/* Remember Me Checkbox */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="remember-me"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(!!checked)}
            disabled={isLoading || isRateLimited}
          />
          <Label
            htmlFor="remember-me"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Nhớ đăng nhập (30 ngày)
          </Label>
        </div>

        {/* Submit Button */}
        <Button 
          type="submit" 
          className="w-full" 
          disabled={!isFormValid}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang đăng nhập...
            </>
          ) : (
            "Đăng nhập"
          )}
        </Button>

        {/* Additional Actions */}
        <div className="flex flex-col space-y-3 text-center">
          {/* Forgot Password Link */}
          <Link 
            href="/auth/forgot-password" 
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            Quên mật khẩu?
          </Link>

          {/* CORS Fix Link */}
          {errorType === "cors" && (
            <Link 
              href="/docs/cors-fix.md" 
              target="_blank" 
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
            >
              Xem hướng dẫn sửa lỗi CORS
            </Link>
          )}

          {/* Sign Up Link */}
          <div className="text-sm text-gray-600">
            Chưa có tài khoản?{" "}
            <Link 
              href="/register" 
              className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              Đăng ký ngay
            </Link>
          </div>
        </div>

        {/* Error Examples for Development */}
        {process.env.NODE_ENV === "development" && (
          <div className="text-xs text-gray-500 mt-4 p-3 bg-gray-50 rounded-md">
            <div className="font-medium mb-2">🎯 Error Messages được cải thiện:</div>
            <ul className="space-y-1 text-left">
              <li>• <strong>401/Invalid:</strong> "Email hoặc mật khẩu không đúng"</li>
              <li>• <strong>404:</strong> "Không tìm thấy tài khoản với email này"</li>
              <li>• <strong>403:</strong> "Tài khoản đã bị khóa"</li>
              <li>• <strong>Network:</strong> "Không thể kết nối đến máy chủ"</li>
              <li>• <strong>500+:</strong> "Máy chủ đang gặp sự cố"</li>
            </ul>
          </div>
        )}

        {/* Attempt Counter (for debugging) */}
        {process.env.NODE_ENV === "development" && attemptCount > 0 && (
          <div className="text-xs text-gray-500 text-center">
            Số lần thử: {attemptCount}/3
          </div>
        )}
      </form>
    </div>
  )
}