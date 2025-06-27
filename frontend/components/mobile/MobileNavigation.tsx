"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  Home, 
  BarChart3, 
  Users, 
  FileText, 
  Settings, 
  Menu,
  Bell,
  Search,
  Plus,
  Activity,
  Calendar,
  BookOpen,
  Camera,
  MessageSquare,
  User,
  ChevronUp,
  X
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface NavigationItem {
  id: string
  label: string
  icon: React.ReactNode
  href: string
  badge?: number
  isActive?: boolean
  submenu?: NavigationItem[]
}

interface MobileNavigationProps {
  userRole: 'TEACHER' | 'ADMIN' | 'MANAGER'
  notifications?: number
}

const TEACHER_NAV_ITEMS: NavigationItem[] = [
  {
    id: 'home',
    label: 'Trang chủ',
    icon: <Home className="h-5 w-5" />,
    href: '/dashboard/teacher'
  },
  {
    id: 'analytics',
    label: 'Phân tích',
    icon: <BarChart3 className="h-5 w-5" />,
    href: '/dashboard/teacher/analytics'
  },
  {
    id: 'exams',
    label: 'Bài kiểm tra',
    icon: <FileText className="h-5 w-5" />,
    href: '/dashboard/teacher/exams',
    badge: 3
  },
  {
    id: 'students',
    label: 'Học sinh',
    icon: <Users className="h-5 w-5" />,
    href: '/dashboard/teacher/students'
  },
  {
    id: 'more',
    label: 'Thêm',
    icon: <Menu className="h-5 w-5" />,
    href: '#',
    submenu: [
      {
        id: 'scan',
        label: 'Quét bài thi',
        icon: <Camera className="h-5 w-5" />,
        href: '/dashboard/teacher/scan'
      },
      {
        id: 'calendar',
        label: 'Lịch thi',
        icon: <Calendar className="h-5 w-5" />,
        href: '/dashboard/teacher/calendar'
      },
      {
        id: 'reports',
        label: 'Báo cáo',
        icon: <BookOpen className="h-5 w-5" />,
        href: '/dashboard/teacher/reports'
      },
      {
        id: 'messages',
        label: 'Tin nhắn',
        icon: <MessageSquare className="h-5 w-5" />,
        href: '/dashboard/teacher/messages',
        badge: 2
      },
      {
        id: 'profile',
        label: 'Hồ sơ',
        icon: <User className="h-5 w-5" />,
        href: '/dashboard/teacher/profile'
      },
      {
        id: 'settings',
        label: 'Cài đặt',
        icon: <Settings className="h-5 w-5" />,
        href: '/dashboard/teacher/settings'
      }
    ]
  }
]

export default function MobileNavigation({ userRole, notifications = 0 }: MobileNavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [activeTab, setActiveTab] = useState('home')
  const pathname = usePathname()

  // Auto-hide navigation on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false)
      } else {
        setIsVisible(true)
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  // Update active tab based on pathname
  useEffect(() => {
    const currentItem = TEACHER_NAV_ITEMS.find(item => 
      pathname.startsWith(item.href) && item.href !== '#'
    )
    if (currentItem) {
      setActiveTab(currentItem.id)
    }
  }, [pathname])

  const handleTabClick = (item: NavigationItem) => {
    if (item.submenu) {
      setIsMenuOpen(true)
    } else {
      setActiveTab(item.id)
    }
  }

  return (
    <>
      {/* Top Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">E</span>
            </div>
            <div>
              <h1 className="font-semibold text-sm">EduScan</h1>
              <p className="text-xs text-muted-foreground">Teacher Dashboard</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="relative">
              <Search className="h-5 w-5" />
            </Button>
            
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-5 w-5" />
              {notifications > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {notifications > 99 ? '99+' : notifications}
                </Badge>
              )}
            </Button>
            
            <Button variant="ghost" size="sm">
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t"
          >
            <div className="grid grid-cols-5 gap-1 px-2 py-2">
              {TEACHER_NAV_ITEMS.map((item) => (
                <motion.div
                  key={item.id}
                  whileTap={{ scale: 0.95 }}
                  className="relative"
                >
                  {item.submenu ? (
                    <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                      <SheetTrigger asChild>
                        <Button
                          variant="ghost"
                          className={`w-full h-12 flex flex-col items-center justify-center gap-1 relative ${
                            activeTab === item.id ? 'text-primary' : 'text-muted-foreground'
                          }`}
                          onClick={() => handleTabClick(item)}
                        >
                          {item.icon}
                          <span className="text-xs font-medium">{item.label}</span>
                          {item.badge && (
                            <Badge 
                              variant="destructive" 
                              className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-xs"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </Button>
                      </SheetTrigger>
                      
                      <SheetContent side="bottom" className="h-[60vh]">
                        <SheetHeader>
                          <SheetTitle>Menu</SheetTitle>
                          <SheetDescription>
                            Chọn chức năng bạn muốn sử dụng
                          </SheetDescription>
                        </SheetHeader>
                        
                        <ScrollArea className="mt-6 h-full">
                          <div className="grid grid-cols-2 gap-3">
                            {item.submenu.map((subItem) => (
                              <Link
                                key={subItem.id}
                                href={subItem.href}
                                onClick={() => setIsMenuOpen(false)}
                              >
                                <motion.div
                                  whileTap={{ scale: 0.95 }}
                                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors relative"
                                >
                                  <div className="flex flex-col items-center gap-2">
                                    {subItem.icon}
                                    <span className="text-sm font-medium text-center">
                                      {subItem.label}
                                    </span>
                                  </div>
                                  {subItem.badge && (
                                    <Badge 
                                      variant="destructive" 
                                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                                    >
                                      {subItem.badge}
                                    </Badge>
                                  )}
                                </motion.div>
                              </Link>
                            ))}
                          </div>
                        </ScrollArea>
                      </SheetContent>
                    </Sheet>
                  ) : (
                    <Link href={item.href}>
                      <Button
                        variant="ghost"
                        className={`w-full h-12 flex flex-col items-center justify-center gap-1 relative ${
                          activeTab === item.id ? 'text-primary' : 'text-muted-foreground'
                        }`}
                        onClick={() => handleTabClick(item)}
                      >
                        {item.icon}
                        <span className="text-xs font-medium">{item.label}</span>
                        {item.badge && (
                          <Badge 
                            variant="destructive" 
                            className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-xs"
                          >
                            {item.badge}
                          </Badge>
                        )}
                        
                        {/* Active indicator */}
                        {activeTab === item.id && (
                          <motion.div
                            layoutId="activeTab"
                            className="absolute top-0 left-1/2 transform -translate-x-1/2 w-6 h-1 bg-primary rounded-full"
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          />
                        )}
                      </Button>
                    </Link>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.div
        className="lg:hidden fixed bottom-20 right-4 z-40"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <motion.div
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.1 }}
        >
          <Button
            size="lg"
            className="w-14 h-14 rounded-full shadow-lg"
            asChild
          >
            <Link href="/dashboard/teacher/exams/new">
              <Plus className="h-6 w-6" />
            </Link>
          </Button>
        </motion.div>
      </motion.div>

      {/* Pull-to-refresh indicator */}
      <motion.div
        className="lg:hidden fixed top-16 left-1/2 transform -translate-x-1/2 z-40"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <div className="bg-background/90 backdrop-blur rounded-full px-4 py-2 shadow-lg border">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Activity className="h-4 w-4" />
            </motion.div>
            <span className="text-sm">Đang làm mới...</span>
          </div>
        </div>
      </motion.div>

      {/* Gesture hint */}
      <motion.div
        className="lg:hidden fixed bottom-2 left-1/2 transform -translate-x-1/2 z-30"
        initial={{ opacity: 1 }}
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-8 h-1 bg-muted-foreground/30 rounded-full" />
      </motion.div>
    </>
  )
} 