import { apiRequest, ApiError } from "./base"

export const authApi = {
  login: async (email: string, password: string, rememberMe: boolean = false) => {
    const formData = new URLSearchParams()
    formData.append("email", email)
    formData.append("password", password)
    formData.append("remember_me", rememberMe.toString())

    try {
      console.log('🔐 [AUTH] Attempting login for:', email);
      
      const result = await apiRequest("/auth/login", {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });

      console.log('✅ [AUTH] Login successful, received token.');
      
      return result;
    } catch (error) {
      console.error("🚨 [AUTH] Login error:", error)
      throw error
    }
  },
  getUser: async (options: { suppressErrors?: boolean } = {}) => {
    try {
      const userData = await apiRequest("/auth/me", {}, { 
        skipAuth: false, 
        suppressErrors: options.suppressErrors || false 
      })
      return {
        id: userData.maNguoiDung?.toString(),
        email: userData.email,
        name: userData.hoTen,
        role: userData.vaiTro.toLowerCase(),
        organizationId: userData.maToChuc ? userData.maToChuc.toString() : undefined,
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return null
      }
      throw error
    }
  },
  getCurrentUser: async () => {
    return authApi.getUser()
  },
  getMe: async (options: { suppressErrors?: boolean } = {}) => {
    try {
      const userData = await apiRequest("/auth/me", {}, { 
        skipAuth: false, 
        suppressErrors: options.suppressErrors || false 
      })
      return userData  // Trả về raw data để mapUserFromApi xử lý
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return null
      }
      throw error
    }
  },
  logout: async () => {
    try {
      await apiRequest("/auth/logout", { method: "POST" })
      return true
    } catch (error) {
      console.error("Logout error:", error)

      return true
    }
  },
}
