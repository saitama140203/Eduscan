"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/authContext"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isHydrated, setIsHydrated] = useState(false)

  // Đảm bảo hydration consistency
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    // Chỉ thực hiện logic điều hướng sau khi hydrated và isLoading là false
    if (!isHydrated || isLoading) return
    
    if (!user) {
      // Nếu không có user (chưa đăng nhập), chuyển hướng đến trang login
      // Lưu lại trang hiện tại để sau khi login có thể quay lại
      if (pathname !== '/auth/login' && pathname !== '/auth/register') {
        localStorage.setItem('returnUrl', pathname)
      }
      router.push("/auth/login")
    } else {
      // Nếu đã có user (đã đăng nhập), kiểm tra xem người dùng có đang ở trang login/register không
      if (pathname === '/auth/login' || pathname === '/auth/register') {
        // Chuyển hướng đến dashboard phù hợp với vai trò của user
        const dashboardUrl = user.role === "admin" ? "/dashboard/admin" :
                             user.role === "manager" ? "/dashboard/manager" :
                             "/dashboard/teacher" // Mặc định là teacher nếu vai trò không xác định
        router.replace(dashboardUrl)
      }
    }
  }, [user, isLoading, router, pathname, isHydrated])

  // Render loading state consistently trên cả server và client
  // Chỉ render children sau khi đã hydrated và auth state đã stable
  if (!isHydrated || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-t-primary animate-spin mx-auto"></div>
          <p className="mt-4 text-lg text-gray-700">Đang tải...</p>
        </div>
      </div>
    )
  }

  // Nếu đã hydrated và không có user, tức là người dùng chưa đăng nhập
  // và đã được điều hướng hoặc đang chờ điều hướng. Trả về null để không render gì.
  if (!user) {
    return null
  }

  // Nếu đã hydrated và user tồn tại, hiển thị nội dung con
  return <>{children}</>
}
