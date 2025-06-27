// contexts/authContext.tsx
"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { usePathname, useRouter } from "next/navigation"
import { authApi } from "@/lib/api"
import { ApiError } from "@/lib/api/base"
import { setCookie, destroyCookie, parseCookies } from "nookies"

// Debug logging helper (simple console.log with prefix)
const debugLog = (message: string) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[AuthProvider] ${message}`);
  }
}

export type User = {
  id: string
  hoTen?: string
  email: string
  role: "admin" | "manager" | "teacher"
  organizationId?: string | null
  anhDaiDienUrl?: string | null
  phone?: string | null
  chuyenMon?: string | null
  organization?: {
    tenToChuc: string;
  }
  // Add Vietnamese field mapping for compatibility
  vai_tro?: "admin" | "manager" | "teacher"
}

type AuthContextType = {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string, rememberMe?: boolean) => Promise<any>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

function mapUserFromApi(apiData: any): User | null {
  if (!apiData) return null
  
  let role: "admin" | "manager" | "teacher" = "teacher"
  if (apiData.vaiTro) {
    const roleMap: { [key: string]: "admin" | "manager" | "teacher" } = {
      "ADMIN": "admin",
      "MANAGER": "manager", 
      "TEACHER": "teacher"
    }
    role = roleMap[apiData.vaiTro.toUpperCase()] || "teacher"
  } else if (apiData.role) {
    role = apiData.role.toLowerCase()
  }
  
  return {
    id: apiData.maNguoiDung != null ? String(apiData.maNguoiDung) : (apiData.id ?? ""),
    hoTen: apiData.hoTen ?? apiData.name ?? "",
    email: apiData.email ?? "",
    role,
    vai_tro: role,
    organizationId: apiData.maToChuc != null ? String(apiData.maToChuc) : (apiData.organizationId ?? null),
    anhDaiDienUrl: apiData.urlAnhDaiDien ?? apiData.avatarUrl ?? null,
    phone: apiData.soDienThoai ?? apiData.phone ?? null,
    chuyenMon: apiData.chuyenMon ?? null,
    organization: apiData.toChuc ? { tenToChuc: apiData.toChuc.tenToChuc } : undefined
  }
}

// Hàm lưu trữ user vào localStorage
const saveUserToCache = (user: User | null) => {
  if (typeof window === 'undefined') return
  if (user) {
    localStorage.setItem('cached_user', JSON.stringify(user))
    localStorage.setItem('user_cache_time', String(Date.now()))
  } else {
    localStorage.removeItem('cached_user')
    localStorage.removeItem('user_cache_time')
  }
}

// Hàm lấy user từ cache
const getUserFromCache = (): { user: User | null, isCacheValid: boolean } => {
  if (typeof window === 'undefined') return { user: null, isCacheValid: false }

  try {
    const cachedUser = localStorage.getItem('cached_user')
    const cacheTime = localStorage.getItem('user_cache_time')

    if (!cachedUser || !cacheTime) return { user: null, isCacheValid: false }

    // Kiểm tra cache còn hạn không (15 phút)
    const isValid = Date.now() - Number(cacheTime) < 15 * 60 * 1000
    return {
      user: JSON.parse(cachedUser),
      isCacheValid: isValid
    }
  } catch (e) {
    return { user: null, isCacheValid: false }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  
  const handleRedirect = () => {
    // Sử dụng window.location.href để đảm bảo redirect dứt khoát
    // và xóa mọi trạng thái cũ của trang.
    if (typeof window !== 'undefined' && window.location.pathname !== '/auth/login') {
      debugLog("Redirecting to /auth/login via window.location.href");
      window.location.href = '/auth/login';
    }
  }
  
  const checkAuthStatus = useCallback(async () => {
    debugLog("Checking auth status...");
    // Ưu tiên đọc token từ cookies để khớp với middleware
    const cookies = parseCookies()
    const token = cookies.access_token || (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null)

    if (!token) {
      debugLog("No token found. User is not authenticated.");
      setUser(null);
      setIsLoading(false);
      handleRedirect();
      return;
    }

    try {
      // Ưu tiên dùng cache để hiển thị giao diện nhanh
      const { user: cachedUser, isCacheValid } = getUserFromCache();
      if (isCacheValid && cachedUser) {
        debugLog("Valid cache found. Setting user and refreshing in background.");
        setUser(cachedUser);
        setIsLoading(false);

        // Lặng lẽ làm mới thông tin user ở background
        authApi.getUser({ suppressErrors: true }).then(freshUserData => {
          if (freshUserData) {
            saveUserToCache(mapUserFromApi(freshUserData));
          }
        }).catch(() => {
          // Nếu refresh lỗi (token hết hạn), thực hiện logout
          logout();
        });

      } else {
        // Nếu không có cache hợp lệ, gọi API để xác thực
        debugLog("No valid cache. Fetching user from API.");
        const userData = await authApi.getUser();
        const mappedUser = mapUserFromApi(userData);
        setUser(mappedUser);
        saveUserToCache(mappedUser);
      }
    } catch (error) {
      debugLog("Auth check failed. Logging out.");
      await logout(); // Gọi hàm logout đã bao gồm cả redirect
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const isAuthPage = typeof window !== 'undefined' && 
                       ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'].includes(window.location.pathname);
    
    if (isAuthPage) {
      setIsLoading(false);
    } else {
      checkAuthStatus();
    }
  }, [checkAuthStatus]);

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      debugLog("[AuthProvider] Attempting login...");
      
      const loginResponse = await authApi.login(email, password, rememberMe);
      const token = loginResponse?.access_token;

      if (!token) {
        throw new Error("Không nhận được token từ API login.");
      }

      debugLog("[AuthProvider] Login successful, received token. Saving to localStorage...");
      localStorage.setItem("access_token", token);
      
      // Ghi thêm cookie để middleware bên server NextJS có thể kiểm tra và cho phép SSR
      setCookie(null, "access_token", token, {
        path: "/",
        maxAge: rememberMe ? 30 * 24 * 60 * 60 : undefined, // 30 ngày nếu remember
        sameSite: "lax",
      })
      
      const userData = await authApi.getUser();
      debugLog("[AuthProvider] getUser after login success.");
      const mappedUser = mapUserFromApi(userData);
      setUser(mappedUser);
      saveUserToCache(mappedUser);
      debugLog("[AuthProvider] User state updated after login.");
      
      if (mappedUser) {
        debugLog(`[AuthProvider] Redirecting to ${mappedUser.role} dashboard...`);
        if (mappedUser.role === "admin") router.replace("/dashboard/admin");
        else if (mappedUser.role === "manager") router.replace("/dashboard/manager");
        else if (mappedUser.role === "teacher") router.replace("/dashboard/teacher");
      }
      
      return { success: true, role: mappedUser?.role };
    } catch (error: any) {
      console.error("[AuthProvider] Login failed:", error);
      setUser(null);
      saveUserToCache(null);
      localStorage.removeItem("access_token"); // Dọn dẹp token nếu có lỗi
      destroyCookie(null, "access_token", { path: "/" });
      
      if (error instanceof ApiError) {
        return {
          success: false,
          message: error.message,
          isNetworkError: error.isNetworkError,
          status: error.status,
        };
      }
      
      if (error instanceof TypeError && error.message.includes("fetch")) {
        return {
          success: false,
          message: "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối internet và thử lại.",
          isNetworkError: true,
        };
      }
      
      return {
        success: false,
        message: error.message || "Đăng nhập thất bại",
        isNetworkError: false,
      };
    }
  };

  const logout = async () => {
    debugLog("Logging out...");
    try {
      await authApi.logout();
    } catch (error) {
      console.error("Logout API call failed, but proceeding with client-side logout.", error);
    } finally {
      setUser(null);
      localStorage.removeItem("access_token");
      localStorage.removeItem("cached_user");
      handleRedirect();
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}