"use client"

import type React from "react"
import { useState, useCallback, useEffect, useMemo } from "react"
import { ModernSidebar } from "@/components/dashboard/ModernSidebar"
import { ModernHeader } from "@/components/dashboard/ModernHeader"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { cn } from "@/lib/utils"

// Hook để quản lý sidebar state với localStorage - Fixed hydration
function useSidebarState() {
  // Always start with consistent initial state (false for mobile-first)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  // Hydrate from localStorage after component mounts
  useEffect(() => {
    // Đảm bảo đoạn mã này chỉ chạy ở client
    const savedState = localStorage.getItem('sidebar_open')
    const defaultOpen = window.innerWidth >= 768 // Desktop mặc định mở
    const initialState = savedState ? savedState === 'true' : defaultOpen
    
    setIsSidebarOpen(initialState)
    setIsHydrated(true)
  }, [])

  // Sync with localStorage after hydration
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('sidebar_open', String(isSidebarOpen))
    }
  }, [isSidebarOpen, isHydrated])

  // Handle responsive behavior
  useEffect(() => {
    if (!isHydrated) return

    const handleResize = () => {
      // Tự động đóng sidebar trên mobile khi resize
      if (window.innerWidth < 768 && isSidebarOpen) {
        setIsSidebarOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isSidebarOpen, isHydrated])

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev)
  }, [])
  
  const closeSidebar = useCallback(() => {
    // Chỉ đóng trên mobile hoặc khi user click vào link
    if (isHydrated && window.innerWidth < 768) {
      setIsSidebarOpen(false)
    }
  }, [isHydrated])

  const openSidebar = useCallback(() => {
    setIsSidebarOpen(true)
  }, [])

  return {
    isSidebarOpen,
    toggleSidebar,
    closeSidebar,
    openSidebar,
    isHydrated
  }
}

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { 
    isSidebarOpen, 
    toggleSidebar, 
    closeSidebar, 
    openSidebar,
    isHydrated
  } = useSidebarState()

  // Memoize classes để tránh recalculation
  const mainContentClasses = useMemo(() => {
    return cn(
      "flex flex-col flex-1 w-full overflow-hidden transition-all duration-300 ease-in-out",
      // Desktop padding based on sidebar state
      isSidebarOpen ? "md:pl-64" : "md:pl-16"
    )
  }, [isSidebarOpen])

  // Memoize container styles - Sử dụng className thay vì inline style
  const containerClassName = "flex h-[100vh] overflow-hidden";

  // Render ngay với default state thay vì chờ hydration
  // Điều này giảm delay và layout shift

  return (
    <AuthGuard>
      <div className={containerClassName}>
        <ModernSidebar
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          closeSidebar={closeSidebar}
        />
        
        <div className={mainContentClasses}>
          <ModernHeader 
            onSidebarToggle={toggleSidebar}
            isSidebarOpen={isSidebarOpen}
          />
          
          <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
            <div className="mx-auto max-w-7xl w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}