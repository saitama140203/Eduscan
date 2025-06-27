"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, Search, User, LogOut, Menu, X, Settings, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EnhancedButton } from "@/components/ui/enhanced-button"
import { useAuth } from "@/contexts/authContext"
import { useTheme } from "next-themes"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ModernHeaderProps {
  onSidebarToggle?: () => void;
  isSidebarOpen?: boolean;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  time: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    title: "Yêu cầu duyệt đề thi mới",
    message: "Giáo viên Nguyễn Văn A đã gửi một đề thi mới cần duyệt",
    type: "info",
    time: "2 giờ trước",
    read: false,
  },
  {
    id: "2", 
    title: "Kết quả chấm thi đã sẵn sàng",
    message: "Đã hoàn tất chấm thi lớp 11A - Toán học",
    type: "success",
    time: "1 ngày trước",
    read: false,
  },
  {
    id: "3",
    title: "Cảnh báo hệ thống",
    message: "Dung lượng lưu trữ sắp đầy, cần dọn dẹp dữ liệu",
    type: "warning",
    time: "2 ngày trước",
    read: true,
  },
]

export function ModernHeader({ onSidebarToggle, isSidebarOpen }: ModernHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [notifications, setNotifications] = useState(mockNotifications)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const router = useRouter()
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()

  const unreadCount = notifications.filter(n => !n.read).length

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Implement search functionality
      console.log("Tìm kiếm:", searchQuery)
    }
  }, [searchQuery])

  const handleLogout = useCallback(async () => {
    await logout()
    router.push("/auth/login")
  }, [logout, router])

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return "🎉"
      case "warning":
        return "⚠️"
      case "error":
        return "❌"
      default:
        return "ℹ️"
    }
  }

  const userRole = user?.role ? {
    admin: "Quản trị viên",
    manager: "Quản lý",
    teacher: "Giáo viên"
  }[user.role.toLowerCase()] || user.role : 'Người dùng'

  return (
    <header className="sticky top-0 z-20 h-16 bg-background/95 backdrop-blur-md border-b border-border shadow-soft">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Left section */}
        <div className="flex items-center gap-4">
          {onSidebarToggle && (
            <EnhancedButton
              variant="ghost"
              size="icon-sm"
              onClick={onSidebarToggle}
              className="mr-2"
              leftIcon={isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            />
          )}
          
          {/* Mobile logo */}
          <div className="lg:hidden">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">E</span>
              </div>
              <span className="text-xl font-semibold text-primary">EduScan</span>
            </Link>
          </div>
        </div>

        {/* Center section - Search */}
        <form 
          onSubmit={handleSearch} 
          className="hidden md:flex items-center w-full max-w-md relative"
        >
          <div className={cn(
            "relative w-full transition-all duration-200",
            isSearchFocused && "transform scale-[1.02]"
          )}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Tìm kiếm lớp học, đề thi, học sinh..."
              className="pl-10 pr-4 bg-muted/50 border-muted hover:bg-muted/70 focus:bg-background transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
            {searchQuery && (
              <EnhancedButton
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-3 w-3" />
              </EnhancedButton>
            )}
          </div>
        </form>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <EnhancedButton
            variant="ghost"
            size="icon-sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="relative"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </EnhancedButton>

          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <EnhancedButton 
                variant="ghost" 
                size="icon-sm" 
                className="relative"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </EnhancedButton>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-sm font-semibold">Thông báo</h3>
                {unreadCount > 0 && (
                  <EnhancedButton
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    Đánh dấu đã đọc
                  </EnhancedButton>
                )}
              </div>
              <ScrollArea className="h-80">
                {notifications.length > 0 ? (
                  <div className="p-2">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          "p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/50 mb-2",
                          !notification.read && "bg-primary/5 border border-primary/10"
                        )}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-medium truncate">
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <div className="h-2 w-2 bg-primary rounded-full flex-shrink-0 ml-2" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {notification.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Không có thông báo mới</p>
                  </div>
                )}
              </ScrollArea>
              <div className="p-2 border-t">
                <EnhancedButton variant="outline" className="w-full text-sm">
                  Xem tất cả thông báo
                </EnhancedButton>
              </div>
            </PopoverContent>
          </Popover>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <EnhancedButton 
                variant="ghost" 
                className="flex items-center gap-2 h-9 px-2 md:px-3"
              >
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  {user?.hoTen ? user.hoTen.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium truncate max-w-[120px]">
                    {user?.hoTen || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {userRole}
                  </p>
                </div>
              </EnhancedButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{user?.hoTen || "User"}</span>
                  <span className="text-xs text-muted-foreground">{user?.email || "user@example.com"}</span>
                  <Badge variant="outline" className="mt-1 w-fit bg-primary/5 text-primary border-primary/20">
                    {userRole}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <User className="h-4 w-4 mr-2" />
                  Thông tin cá nhân
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="h-4 w-4 mr-2" />
                  Cài đặt
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleLogout} 
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}