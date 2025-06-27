"use client"

import { useMemo, useCallback, memo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/contexts/authContext"
import { EnhancedButton } from "@/components/ui/enhanced-button"
import { Skeleton } from "@/components/ui/loading"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Building,
  FileSpreadsheet,
  FileCheck,
  Settings,
  BarChart3,
  TrendingUp,
  Scan,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  PencilRuler,
  UserCog,
  ChevronRight,
  GraduationCap,
} from "lucide-react"

interface SidebarLink {
  label: string;
  href: string;
  icon: any;
  access: string[];
  description?: string;
  badge?: string | number;
  children?: SidebarLink[];
}

const NavLink = memo(({ 
  href, 
  isActive, 
  icon: Icon, 
  label, 
  description,
  badge,
  onClick,
  isSidebarOpen,
  hasChildren = false,
}: { 
  href: string; 
  isActive: boolean; 
  icon: any; 
  label: string; 
  description?: string;
  badge?: string | number;
  onClick?: () => void;
  isSidebarOpen: boolean;
  hasChildren?: boolean;
}) => {
  const content = (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 relative overflow-hidden",
        "hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground",
        isActive 
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm" 
          : "text-sidebar-foreground",
        !isSidebarOpen && "justify-center"
      )}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute left-0 top-0 h-full w-1 bg-sidebar-primary-foreground rounded-r-full" />
      )}
      
      {/* Icon with animation */}
      <Icon className={cn(
        "h-5 w-5 flex-shrink-0 transition-transform duration-200",
        isActive ? "scale-110" : "group-hover:scale-105"
      )} />
      
      {/* Label and badge */}
      {isSidebarOpen && (
        <div className="flex items-center justify-between flex-1 min-w-0">
          <span className="truncate">{label}</span>
          {badge && (
            <span className={cn(
              "ml-2 px-1.5 py-0.5 text-xs rounded-full font-medium",
              isActive 
                ? "bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground"
                : "bg-sidebar-accent text-sidebar-accent-foreground"
            )}>
              {badge}
            </span>
          )}
          {hasChildren && (
            <ChevronRight className="h-4 w-4 ml-1" />
          )}
        </div>
      )}
      
      {/* Hover effect */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300",
        "transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
      )} />
    </Link>
  )

  if (!isSidebarOpen && description) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="right" className="ml-2">
          <p className="font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
})

NavLink.displayName = 'NavLink'

interface ModernSidebarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}

export function ModernSidebar({
  isSidebarOpen,
  toggleSidebar,
  closeSidebar,
}: ModernSidebarProps) {
  const pathname = usePathname()
  const { user, logout, isLoading } = useAuth()

  // Optimized navigation links
  const links = useMemo(() => {
    const allLinks: SidebarLink[] = [
      // Dashboard
      {
        label: "Tổng quan",
        href: "/dashboard",
        icon: LayoutDashboard,
        access: ["admin", "manager", "teacher"],
        description: "Bảng điều khiển chính"
      },

      // Admin section
      {
        label: "Quản lý tổ chức",
        href: "/dashboard/admin/organizations",
        icon: Building,
        access: ["admin"],
        description: "Quản lý trường học, tổ chức"
      },
      {
        label: "Quản lý người dùng",
        href: "/dashboard/admin/users",
        icon: UserCog,
        access: ["admin"],
        description: "Quản lý tài khoản người dùng"
      },
      {
        label: "Quản lý lớp học",
        href: "/dashboard/admin/classes",
        icon: BookOpen,
        access: ["admin"],
        description: "Quản lý lớp học toàn hệ thống"
      },
      {
        label: "Quản lý đề thi",
        href: "/dashboard/admin/exams",
        icon: FileSpreadsheet,
        access: ["admin"],
        description: "Quản lý đề thi và bài kiểm tra"
      },
      {
        label: "Mẫu phiếu OMR",
        href: "/dashboard/admin/answer-templates",
        icon: FileCheck,
        access: ["admin"],
        description: "Cấu hình mẫu phiếu trả lời"
      },
      {
        label: "Phân tích hệ thống",
        href: "/dashboard/admin/system-analytics",
        icon: BarChart3,
        access: ["admin"],
        description: "Thống kê và báo cáo tổng thể"
      },
      {
        label: "Cài đặt hệ thống",
        href: "/dashboard/admin/system-settings",
        icon: Settings,
        access: ["admin"],
        description: "Cấu hình hệ thống"
      },

      // Manager section
      {
        label: "Lớp học",
        href: "/dashboard/manager/classes",
        icon: BookOpen,
        access: ["manager"],
        description: "Quản lý lớp học tổ chức"
      },
      {
        label: "Giáo viên",
        href: "/dashboard/manager/teachers",
        icon: Users,
        access: ["manager"],
        description: "Quản lý đội ngũ giáo viên"
      },
      {
        label: "Đề thi",
        href: "/dashboard/manager/exams",
        icon: FileSpreadsheet,
        access: ["manager"],
        description: "Quản lý đề thi tổ chức"
      },
      {
        label: "Thống kê",
        href: "/dashboard/manager/statistics",
        icon: TrendingUp,
        access: ["manager"],
        description: "Báo cáo thống kê"
      },

      // Teacher section
      {
        label: "Lớp học của tôi",
        href: "/dashboard/teacher/classes",
        icon: GraduationCap,
        access: ["teacher"],
        description: "Lớp học được phân công"
      },
      {
        label: "Đề thi",
        href: "/dashboard/teacher/exams",
        icon: FileSpreadsheet,
        access: ["teacher"],
        description: "Quản lý đề thi cá nhân"
      },
      {
        label: "Chấm bài OMR",
        href: "/dashboard/teacher/scan",
        icon: Scan,
        access: ["teacher"],
        description: "Chấm bài tự động OMR"
      },
      {
        label: "Mẫu phiếu bài thi",
        href: "/dashboard/teacher/answer-sheets",
        icon: PencilRuler,
        access: ["teacher"],
        description: "Tạo và quản lý mẫu phiếu"
      },
    ]

    return allLinks.filter(link => 
      user?.role && link.access.includes(user.role)
    )
  }, [user?.role])

  const handleLogout = useCallback(async () => {
    await logout()
  }, [logout])

  const handleLinkClick = useCallback(() => {
    if (window.innerWidth < 768) {
      closeSidebar()
    }
  }, [closeSidebar])

  if (isLoading) {
    return (
      <aside className={cn(
        "fixed inset-y-0 left-0 z-30 bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out",
        isSidebarOpen ? "w-64" : "w-16"
      )}>
        <div className="flex h-16 items-center border-b border-sidebar-border px-4">
          <Skeleton className="h-8 w-8 rounded-lg" />
          {isSidebarOpen && <Skeleton className="ml-3 h-6 w-24" />}
        </div>
        <div className="p-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <Skeleton className="h-5 w-5 rounded" />
              {isSidebarOpen && <Skeleton className="h-4 flex-1" />}
            </div>
          ))}
        </div>
      </aside>
    )
  }

  return (
    <TooltipProvider>
      <aside className={cn(
        "fixed inset-y-0 left-0 z-30 bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out shadow-strong",
        isSidebarOpen ? "w-64" : "w-16"
      )}>
        {/* Header */}
        <div className="flex h-16 items-center border-b border-sidebar-border px-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            {isSidebarOpen && (
              <div className="animate-fade-in">
                <h1 className="text-lg font-semibold text-sidebar-foreground">EduScan</h1>
                <p className="text-xs text-sidebar-foreground/60">Quản lý giáo dục</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {links.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                isActive={pathname === link.href}
                icon={link.icon}
                label={link.label}
                description={link.description}
                badge={link.badge}
                onClick={handleLinkClick}
                isSidebarOpen={isSidebarOpen}
              />
            ))}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-3">
          {/* User info */}
          {user && (
            <div className={cn(
              "flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent/50 mb-2",
              !isSidebarOpen && "justify-center"
            )}>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {user.hoTen ? user.hoTen.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
              {isSidebarOpen && (
                <div className="min-w-0 flex-1 animate-fade-in">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {user.hoTen}
                  </p>
                  <p className="text-xs text-sidebar-foreground/60 truncate">
                    {user.email}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Toggle and logout buttons */}
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <EnhancedButton
                  variant="ghost"
                  size="icon-sm"
                  onClick={toggleSidebar}
                  className="text-sidebar-foreground hover:text-sidebar-accent-foreground"
                >
                  {isSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                </EnhancedButton>
              </TooltipTrigger>
              <TooltipContent side={isSidebarOpen ? "top" : "right"}>
                {isSidebarOpen ? "Thu gọn sidebar" : "Mở rộng sidebar"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <EnhancedButton
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleLogout}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                </EnhancedButton>
              </TooltipTrigger>
              <TooltipContent side={isSidebarOpen ? "top" : "right"}>
                Đăng xuất
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
} 