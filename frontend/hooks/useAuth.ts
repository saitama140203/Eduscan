import { authApi } from "@/lib/api/auth"

interface LoginResult {
  success: boolean
  message?: string
  isNetworkError?: boolean
}

export function useAuth() {
  // ... existing code ...

  const login = async (email: string, password: string, rememberMe: boolean = false): Promise<LoginResult> => {
    try {
      await authApi.login(email, password, rememberMe)
      return { success: true }
    } catch (error: any) {
      console.error("Login failed:", error)
      
      // Determine if it's a network error
      const isNetworkError = error instanceof TypeError && error.message.includes("fetch")
      
      return {
        success: false,
        message: error.message || "Đăng nhập thất bại",
        isNetworkError
      }
    }
  }

  // ... rest of the hook
} 