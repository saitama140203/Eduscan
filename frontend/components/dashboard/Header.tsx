// "use client"

// import type React from "react"

// import { useState } from "react"
// import { debugLog } from "@/lib/utils/debug"
// import Link from "next/link"
// import { useRouter } from "next/navigation"
// import { Bell, Search, User, LogOut, Menu, X } from "lucide-react"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { useAuth } from "@/contexts/authContext"
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu"
// import { Badge } from "@/components/ui/badge"
// import { cn } from "@/lib/utils"

// interface HeaderProps {
//   onSidebarToggle?: () => void;
//   isSidebarOpen?: boolean;
// }

// export function Header({ onSidebarToggle, isSidebarOpen }: HeaderProps) {
//   const [searchQuery, setSearchQuery] = useState("")
//   const router = useRouter()
//   const { user, logout } = useAuth()
//   const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

//   const handleSearch = (e: React.FormEvent) => {
//     e.preventDefault()
//     debugLog("Search query:", searchQuery)
//     // Implement search functionality
//   }

//   const handleLogout = async () => {
//     await logout()
//     router.push("/auth/login")
//   }

//   const userRole = user?.role ? {
//     admin: "Quản trị viên",
//     manager: "Quản lý",
//     teacher: "Giáo viên"
//   }[user.role.toLowerCase()] || user.role : 'Người dùng'

//   return (
//     <header className="sticky top-0 z-10 h-16 bg-white border-b shadow-sm flex items-center justify-between px-4 lg:px-6">
//       <div className="flex items-center gap-4">
//         {onSidebarToggle && (
//           <Button
//             variant="ghost"
//             size="icon"
//             onClick={onSidebarToggle}
//             className="mr-2"
//             aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
//           >
//             {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
//           </Button>
//         )}
//         <div className="lg:hidden">
//           <span className="text-xl font-medium text-primary">EduScan</span>
//         </div>
//       </div>

//       <form onSubmit={handleSearch} className="hidden md:flex items-center w-full max-w-md">
//         <div className="relative w-full">
//           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//           <Input
//             type="search"
//             placeholder="Tìm kiếm..."
//             className="pl-10"
//             value={searchQuery}
//             onChange={(e) => setSearchQuery(e.target.value)}
//           />
//         </div>
//       </form>

//       <div className="flex items-center gap-3">
//         {/* Notifications */}
//         <DropdownMenu>
//           <DropdownMenuTrigger asChild>
//             <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
//               <Bell className="h-5 w-5" />
//               <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-primary" />
//             </Button>
//           </DropdownMenuTrigger>
//           <DropdownMenuContent align="end" className="w-80">
//             <DropdownMenuLabel>Thông báo</DropdownMenuLabel>
//             <DropdownMenuSeparator />
//             <div className="max-h-80 overflow-auto py-2">
//               <div className="px-2 py-3 hover:bg-muted/50 rounded-md cursor-pointer">
//                 <div className="flex items-start justify-between">
//                   <p className="font-medium text-sm">Yêu cầu duyệt đề thi mới</p>
//                   <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Mới</Badge>
//                 </div>
//                 <p className="text-xs text-muted-foreground mt-1">
//                   Giáo viên Nguyễn Văn A đã gửi một đề thi mới cần duyệt
//                 </p>
//                 <p className="text-xs text-muted-foreground mt-1">2 giờ trước</p>
//               </div>
//               <DropdownMenuSeparator />
//               <div className="px-2 py-3 hover:bg-muted/50 rounded-md cursor-pointer">
//                 <div className="flex items-start justify-between">
//                   <p className="font-medium text-sm">Kết quả chấm thi đã sẵn sàng</p>
//                   <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Hoàn thành</Badge>
//                 </div>
//                 <p className="text-xs text-muted-foreground mt-1">
//                   Đã hoàn tất chấm thi lớp 11A - Toán học
//                 </p>
//                 <p className="text-xs text-muted-foreground mt-1">1 ngày trước</p>
//               </div>
//             </div>
//             <DropdownMenuSeparator />
//             <div className="p-2">
//               <Button variant="outline" className="w-full text-sm">Xem tất cả thông báo</Button>
//             </div>
//           </DropdownMenuContent>
//         </DropdownMenu>

//         {/* User Menu */}
//         <DropdownMenu>
//           <DropdownMenuTrigger asChild>
//             <Button 
//               variant="ghost" 
//               size="sm" 
//               className="flex items-center gap-2 h-9 px-2 md:px-4"
//               aria-label="User menu"
//             >
//               <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
//                 {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
//               </div>
//               <span className="hidden md:inline text-sm font-medium truncate max-w-[120px]">
//                 {user?.name || "User"}
//               </span>
//             </Button>
//           </DropdownMenuTrigger>
//           <DropdownMenuContent align="end" className="w-56">
//             <DropdownMenuLabel>
//               <div className="flex flex-col">
//                 <span className="font-medium">{user?.name || "User"}</span>
//                 <span className="text-xs text-muted-foreground">{user?.email || "user@example.com"}</span>
//                 <Badge variant="outline" className="mt-1 w-fit bg-primary/5 text-primary border-primary/20">{userRole}</Badge>
//               </div>
//             </DropdownMenuLabel>
//             <DropdownMenuSeparator />
//             <DropdownMenuItem asChild>
//               <Link href="/profile" className="cursor-pointer">Thông tin cá nhân</Link>
//             </DropdownMenuItem>
//             <DropdownMenuItem asChild>
//               <Link href="/settings" className="cursor-pointer">Cài đặt</Link>
//             </DropdownMenuItem>
//             <DropdownMenuSeparator />
//             <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
//               <LogOut className="h-4 w-4 mr-2" />
//               <span>Đăng xuất</span>
//             </DropdownMenuItem>
//           </DropdownMenuContent>
//         </DropdownMenu>
//       </div>
//     </header>
//   )
// }
