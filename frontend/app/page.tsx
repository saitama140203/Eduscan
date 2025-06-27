"use client"

import { useEffect, useState, useCallback, useMemo, Suspense } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/authContext"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Brain, 
  Scan, 
  BarChart3, 
  Clock, 
  CheckCircle, 
  Users,
  FileText,
  Zap,
  ArrowRight,
  Shield,
  ChevronRight,
  Play,
  Star,
  TrendingUp,
  Sparkles,
  CheckCheck,
  Menu,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"

// Type definitions for Next.js 15+ compatibility
interface FeatureCard {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  gradient: string
  delay: number
}

interface StatCard {
  value: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

// Custom hooks optimized for Next.js 15
const useScrollAnimation = () => {
  const [scrollY, setScrollY] = useState(0)
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  useEffect(() => {
    if (!isClient) return
    
    let rafId: number
    const handleScroll = () => {
      rafId = requestAnimationFrame(() => {
        setScrollY(window.scrollY)
      })
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [isClient])
  
  return scrollY
}

const useIntersectionObserver = (threshold = 0.1) => {
  const [isVisible, setIsVisible] = useState(false)
  const [ref, setRef] = useState<HTMLElement | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!ref || !isClient || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
      },
      { 
        threshold,
        rootMargin: '50px'
      }
    )

    observer.observe(ref)
    return () => observer.disconnect()
  }, [ref, threshold, isClient])

  return [setRef, isVisible] as const
}

// Components optimized for Next.js 15
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
    <div className="relative">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border border-blue-400 opacity-20"></div>
    </div>
  </div>
)

const FloatingElements = () => {
  const scrollY = useScrollAnimation()
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) return null
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div 
        className="absolute top-20 left-10 w-20 h-20 bg-blue-200/30 rounded-full blur-xl transition-transform duration-300 ease-out"
        style={{ transform: `translate3d(0, ${scrollY * 0.1}px, 0)` }}
      />
      <div 
        className="absolute top-40 right-20 w-32 h-32 bg-indigo-200/20 rounded-full blur-xl transition-transform duration-300 ease-out"
        style={{ transform: `translate3d(0, ${scrollY * -0.1}px, 0)` }}
      />
      <div 
        className="absolute bottom-40 left-1/4 w-16 h-16 bg-purple-200/25 rounded-full blur-xl transition-transform duration-300 ease-out"
        style={{ transform: `translate3d(0, ${scrollY * 0.05}px, 0)` }}
      />
    </div>
  )
}

const MobileMenu = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      
      {/* Menu */}
      <div className={cn(
        "fixed inset-y-0 right-0 w-full max-w-sm bg-white z-50 transition-transform duration-300 ease-in-out md:hidden shadow-2xl",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">EduScan</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        <nav className="p-6 space-y-6">
          {[
            { href: "#features", label: "Tính năng" },
            { href: "#how-it-works", label: "Cách hoạt động" },
            { href: "#contact", label: "Liên hệ" }
          ].map((item) => (
            <a 
              key={item.href}
              href={item.href} 
              className="block py-3 text-lg font-medium hover:text-blue-600 transition-colors border-b border-gray-100 last:border-0" 
              onClick={onClose}
            >
              {item.label}
            </a>
          ))}
          <Link href="/auth/login" onClick={onClose}>
            <Button className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600">
              Đăng nhập
            </Button>
          </Link>
        </nav>
      </div>
    </>
  )
}

const AnimatedCounter = ({ value, duration = 2000 }: { value: string; duration?: number }) => {
  const [count, setCount] = useState(0)
  const [ref, isVisible] = useIntersectionObserver()
  const [mounted, setMounted] = useState(false)
  
  const numericValue = useMemo(() => {
    const match = value.match(/\d+/)
    return match ? parseInt(match[0]) : 0
  }, [value])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isVisible || !mounted) return
    
    let rafId: number
    let startTime: number
    
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      setCount(Math.floor(progress * numericValue))
      
      if (progress < 1) {
        rafId = requestAnimationFrame(animate)
      }
    }
    
    rafId = requestAnimationFrame(animate)
    
    return () => {
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [isVisible, numericValue, duration, mounted])

  if (!mounted) {
    return <span ref={ref as any}>{value.replace(/\d+/, '0')}</span>
  }

  return (
    <span ref={ref as any}>
      {value.replace(/\d+/, count.toString())}
    </span>
  )
}

const FeatureCard = ({ feature, index }: { feature: FeatureCard; index: number }) => {
  const [ref, isVisible] = useIntersectionObserver()
  
  return (
    <Card 
      ref={ref as any}
      className={cn(
        "group border-0 shadow-lg hover:shadow-2xl transition-all duration-700 cursor-pointer overflow-hidden relative backdrop-blur-sm",
        "hover:-translate-y-2 hover:scale-[1.02] will-change-transform",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}
      style={{ 
        transitionDelay: `${feature.delay}ms`,
      }}
    >
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: feature.gradient }}
      />
      <CardHeader className="relative z-10">
        <div className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
          <feature.icon className="w-6 h-6 text-blue-600 group-hover:text-blue-700" />
        </div>
        <CardTitle className="text-gray-900 group-hover:text-white transition-colors duration-300">
          {feature.title}
        </CardTitle>
        <CardDescription className="text-gray-600 group-hover:text-white/90 transition-colors duration-300">
          {feature.description}
        </CardDescription>
      </CardHeader>
    </Card>
  )
}

export default function HomePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const scrollY = useScrollAnimation()

  // Memoized values với useMemo để tối ưu re-renders
  const features = useMemo<FeatureCard[]>(() => [
    {
      icon: Clock,
      title: "Tiết kiệm thời gian",
      description: "Chấm điểm tự động trong vài giây thay vì hàng giờ thủ công",
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      delay: 0
    },
    {
      icon: CheckCircle,
      title: "Độ chính xác cao",
      description: "AI đảm bảo độ chính xác lên đến 99.9% trong việc nhận diện và chấm điểm",
      gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      delay: 100
    },
    {
      icon: BarChart3,
      title: "Phân tích thông minh",
      description: "Báo cáo chi tiết về kết quả học tập và xu hướng của từng học sinh",
      gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      delay: 200
    },
    {
      icon: Users,
      title: "Quản lý dễ dàng",
      description: "Giao diện trực quan, dễ sử dụng cho giáo viên và quản lý",
      gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
      delay: 300
    },
    {
      icon: Shield,
      title: "Bảo mật cao",
      description: "Dữ liệu được mã hóa và bảo vệ theo tiêu chuẩn quốc tế",
      gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
      delay: 400
    },
    {
      icon: FileText,
      title: "Đa dạng mẫu đề",
      description: "Hỗ trợ nhiều loại phiếu trả lời và định dạng đề thi khác nhau",
      gradient: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
      delay: 500
    }
  ], [])

  const stats = useMemo<StatCard[]>(() => [
    { value: "99.9%", label: "Độ chính xác", icon: CheckCheck },
    { value: "95%", label: "Tiết kiệm thời gian", icon: TrendingUp },
    { value: "10K+", label: "Giáo viên tin dùng", icon: Users },
    { value: "1M+", label: "Bài thi đã chấm", icon: FileText }
  ], [])

  // Event handlers với useCallback để tối ưu performance
  const handleRoleBasedRedirect = useCallback(() => {
    if (!user) return
    
    const roleRoutes = {
      admin: "/dashboard/admin",
      manager: "/dashboard/manager", 
      teacher: "/dashboard/teacher"
    } as const
    
    const route = roleRoutes[user.role as keyof typeof roleRoutes]
    if (route) {
      router.replace(route)
    } else {
      router.replace("/auth/login")
    }
  }, [user, router])

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false)
  }, [])

  const openMobileMenu = useCallback(() => {
    setMobileMenuOpen(true)
  }, [])

  // Effects
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !isLoading && user) {
      handleRoleBasedRedirect()
    }
  }, [mounted, user, isLoading, handleRoleBasedRedirect])

  // Tối ưu header style computation
  const headerStyle = useMemo(() => {
    if (!mounted) return {}
    return {
      backgroundColor: scrollY > 50 ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.8)',
      borderBottomWidth: scrollY > 50 ? '2px' : '1px'
    }
  }, [mounted, scrollY])

  if (!mounted || isLoading) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <LoadingSpinner />
      </Suspense>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-x-hidden">
      <FloatingElements />
      
      {/* Header với performance optimization */}
      <header 
        className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50 transition-all duration-300 will-change-transform"
        style={headerStyle}
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                EduScan
              </h1>
              <p className="text-xs text-gray-600 group-hover:text-blue-500 transition-colors">
                AI Powered
              </p>
            </div>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-6">
            {[
              { href: "#features", label: "Tính năng" },
              { href: "#how-it-works", label: "Cách hoạt động" },
              { href: "#contact", label: "Liên hệ" }
            ].map((item) => (
              <a 
                key={item.href}
                href={item.href} 
                className="text-gray-600 hover:text-gray-900 transition-colors relative group"
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </nav>
          
          <div className="flex items-center space-x-3">
            <Link href="/auth/login" className="hidden md:block">
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300">
                Đăng nhập
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="sm" 
              className="md:hidden"
              onClick={openMobileMenu}
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <MobileMenu isOpen={mobileMenuOpen} onClose={closeMobileMenu} />

      {/* Hero Section với enhanced animations */}
      <section className="py-20 px-4 relative">
        <div className="container mx-auto text-center relative z-10">
          <Badge variant="secondary" className="mb-6 bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors animate-pulse">
            <Sparkles className="w-4 h-4 mr-2" />
            Công nghệ AI tiên tiến
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-8 leading-tight">
            <span className="inline-block animate-fadeInUp">Hệ thống AI chấm điểm</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 animate-pulse">
              tự động
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            EduScan mang đến giải pháp chấm điểm trắc nghiệm hoàn toàn tự động bằng công nghệ AI và Computer Vision. 
            <span className="font-semibold text-gray-800"> Tiết kiệm 95% thời gian chấm điểm</span> và đảm bảo độ chính xác tuyệt đối.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/auth/login">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg px-8 py-4 shadow-2xl hover:shadow-blue-500/25 transform hover:scale-105 transition-all duration-300 group"
              >
                Bắt đầu ngay
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 py-4 hover:bg-gray-50 group border-2 hover:border-blue-300 transition-all duration-300"
            >
              <Play className="w-5 h-5 mr-2" />
              Xem demo
              <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
          
          {/* Stats Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {stats.map((stat, index) => (
              <div key={index} className="text-center group">
                <div className="flex items-center justify-center mb-2">
                  <stat.icon className="w-8 h-8 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  <AnimatedCounter value={stat.value} />
                </div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
          
          {/* Hero Demo */}
          <div className="relative max-w-6xl mx-auto">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                {[
                  {
                    icon: Scan,
                    title: "Quét phiếu trả lời",
                    description: "AI nhận diện và xử lý phiếu trả lời trong thời gian thực",
                    color: "blue"
                  },
                  {
                    icon: Brain,
                    title: "Xử lý thông minh", 
                    description: "Thuật toán AI phân tích và chấm điểm tự động với độ chính xác cao",
                    color: "green"
                  },
                  {
                    icon: BarChart3,
                    title: "Báo cáo chi tiết",
                    description: "Thống kê và phân tích kết quả học tập toàn diện",
                    color: "purple"
                  }
                ].map((item, index) => (
                  <div 
                    key={index}
                    className={cn(
                      "flex flex-col items-center p-6 rounded-2xl transition-all duration-500 group hover:scale-105 cursor-pointer",
                      item.color === "blue" && "bg-blue-50 hover:bg-blue-100",
                      item.color === "green" && "bg-green-50 hover:bg-green-100", 
                      item.color === "purple" && "bg-purple-50 hover:bg-purple-100"
                    )}
                  >
                    <div className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300 shadow-lg",
                      item.color === "blue" && "bg-blue-600",
                      item.color === "green" && "bg-green-600",
                      item.color === "purple" && "bg-purple-600"
                    )}>
                      <item.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-3 text-lg group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-600 text-center leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-white/50 backdrop-blur-sm relative overflow-hidden">
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              <Star className="w-4 h-4 mr-2" />
              Tính năng nổi bật
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Tại sao chọn EduScan?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Được trang bị công nghệ AI tiên tiến và giao diện thân thiện, EduScan là giải pháp hoàn hảo cho mọi cơ sở giáo dục.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard key={index} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4 bg-gradient-to-br from-gray-50/80 to-blue-50/80 backdrop-blur-sm relative">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              <Zap className="w-4 h-4 mr-2" />
              Quy trình đơn giản
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Cách hoạt động
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Quy trình đơn giản chỉ với 3 bước để có kết quả chấm điểm chính xác
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 opacity-30" />
            
            {[
              {
                step: 1,
                title: "Upload phiếu trả lời",
                description: "Chụp ảnh hoặc scan phiếu trả lời của học sinh và tải lên hệ thống",
                color: "blue"
              },
              {
                step: 2, 
                title: "AI xử lý tự động",
                description: "Hệ thống AI nhận diện và chấm điểm tự động trong vài giây",
                color: "green"
              },
              {
                step: 3,
                title: "Nhận kết quả", 
                description: "Xem kết quả chi tiết và báo cáo phân tích ngay lập tức",
                color: "purple"
              }
            ].map((item, index) => (
              <div key={index} className="text-center group">
                <div className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 relative group-hover:scale-110 transition-all duration-300 shadow-2xl",
                  item.color === "blue" && "bg-gradient-to-br from-blue-500 to-blue-700",
                  item.color === "green" && "bg-gradient-to-br from-green-500 to-green-700",
                  item.color === "purple" && "bg-gradient-to-br from-purple-500 to-purple-700"
                )}>
                  <span className="text-2xl font-bold text-white">{item.step}</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
                  {item.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="container mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Sẵn sàng trải nghiệm EduScan?
          </h2>
          <p className="text-xl text-blue-100 mb-12 max-w-2xl mx-auto">
            Tham gia cùng hàng ngàn giáo viên đã tin tưởng và sử dụng EduScan để nâng cao hiệu quả giảng dạy
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/login">
              <Button 
                size="lg" 
                variant="secondary" 
                className="text-lg px-8 py-4 shadow-2xl hover:shadow-white/25 transform hover:scale-105 transition-all duration-300 group"
              >
                Đăng nhập ngay
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 py-4 border-white text-white hover:bg-white hover:text-blue-600 transition-all duration-300"
            >
              Liên hệ tư vấn
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-gray-300 py-16 px-4 relative">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <Link href="/" className="flex items-center space-x-3 mb-6 group">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">
                  EduScan
                </span>
              </Link>
              <p className="text-gray-400 mb-4 leading-relaxed">
                Giải pháp AI chấm điểm tự động hàng đầu Việt Nam
              </p>
            </div>
            
            {[
              {
                title: "Sản phẩm",
                links: ["Chấm điểm AI", "Phân tích dữ liệu", "Quản lý lớp học"]
              },
              {
                title: "Hỗ trợ", 
                links: ["Hướng dẫn sử dụng", "FAQ", "Liên hệ"]
              },
              {
                title: "Công ty",
                links: ["Về chúng tôi", "Tin tức", "Tuyển dụng"]
              }
            ].map((section, index) => (
              <div key={index}>
                <h4 className="text-white font-semibold mb-6 text-lg">{section.title}</h4>
                <ul className="space-y-3">
                  {section.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <a 
                        href="#" 
                        className="hover:text-white transition-colors duration-300 hover:translate-x-1 transform inline-block"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-400">
              &copy; {new Date().getFullYear()} EduScan. Tất cả quyền được bảo lưu. 
              <span className="text-blue-400 ml-2">Powered by AI</span>
            </p>
        </div>
      </div>
      </footer>
    </div>
  )
}