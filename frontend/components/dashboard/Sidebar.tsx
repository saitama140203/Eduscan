// "use client"

// import { useMemo, useCallback, memo } from "react"
// import Link from "next/link"
// import { usePathname } from "next/navigation"
// import { cn } from "@/lib/utils"
// import { Button } from "@/components/ui/button"
// import { ScrollArea } from "@/components/ui/scroll-area"
// import { useAuth } from "@/contexts/authContext"
// import {
//   MenuIcon,
//   LayoutDashboard,
//   BookOpen,
//   Users,
//   UserSquare,
//   Building,
//   FileSpreadsheet,
//   FileCheck,
//   Settings,
//   BarChart3,
//   TrendingUp,
//   Scan,
//   PanelLeftClose,
//   PanelLeftOpen,
//   LogOut,
//   PencilRuler,
//   UserCog,
// } from "lucide-react"

// interface SidebarLink {
//   label: string;
//   href: string;
//   icon: any;
//   access: string[];
//   description?: string;
// }

// const NavLink = memo(({ 
//   href, 
//   isActive, 
//   icon: Icon, 
//   label, 
//   description,
//   onClick,
//   isSidebarOpen
// }: { 
//   href: string; 
//   isActive: boolean; 
//   icon: any; 
//   label: string; 
//   description?: string;
//   onClick?: () => void;
//   isSidebarOpen: boolean;
// }) => {
//   return (
//     <Link
//       href={href}
//       onClick={onClick}
//       className={cn(
//         "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all hover:bg-muted group",
//         isActive 
//           ? "bg-primary text-primary-foreground hover:bg-primary/90" 
//           : "text-foreground hover:bg-muted/80",
//       )}
//       title={description}
//     >
//       <Icon className="h-5 w-5 flex-shrink-0" />
//       {isSidebarOpen && <span className="truncate">{label}</span>}
//       {isActive && (
//         <div className="ml-auto w-1.5 h-1.5 bg-primary-foreground rounded-full" />
//       )}
//     </Link>
//   )
// })

// NavLink.displayName = 'NavLink'

// interface SidebarProps {
//   isSidebarOpen: boolean;
//   toggleSidebar: () => void;
//   closeSidebar: () => void;
// }

// export function Sidebar({
//   isSidebarOpen,
//   toggleSidebar,
//   closeSidebar,
// }: SidebarProps) {
//   const pathname = usePathname()
//   const { user, logout } = useAuth()

//   // Các menu tối ưu hóa theo vai trò
//   const links = useMemo(() => {
//     const allLinks: SidebarLink[] = [
//       // --- Super Admin ---
//       {
//         label: "Trang chủ",
//         href: "/",
//         icon: LayoutDashboard,
//         access: ["admin", "manager", "teacher"],
//         description: "Tổng quan hệ thống"
//       },
//       {
//         label: "Quản lý tổ chức",
//         href: "/dashboard/admin/organizations",
//         icon: Building,
//         access: ["admin"],
//         description: "Quản lý thông tin trường học, tổ chức"
//       },
//       {
//         label: "Quản lý lớp học",
//         href: "/dashboard/admin/classes",
//         icon: BookOpen,
//         access: ["admin"],
//         description: "Quản lý các lớp học trong hệ thống"
//       },
//       {
//         label: "Quản lý người dùng",
//         href: "/dashboard/admin/users",
//         icon: UserCog,
//         access: ["admin"],
//         description: "Quản lý danh sách giáo viên"
//       },
//       {
//         label: "Quản lý đề thi",
//         href: "/dashboard/admin/exams",
//         icon: FileSpreadsheet,
//         access: ["admin"],
//         description: "Quản lý đề thi toàn hệ thống"
//       },
//       {
//         label: "Mẫu phiếu trả lời",
//         href: "/dashboard/admin/answer-templates",
//         icon: FileCheck,
//         access: ["admin"],
//         description: "Cấu hình mẫu phiếu trả lời toàn hệ thống"
//       },
//       {
//         label: "Cài đặt hệ thống",
//         href: "/dashboard/admin/system-settings",
//         icon: Settings,
//         access: ["admin"],
//         description: "Cấu hình, tuỳ chỉnh hệ thống"
//       },
//       {
//         label: "Phân tích hệ thống",
//         href: "/dashboard/admin/system-analytics",
//         icon: BarChart3,
//         access: ["admin"],
//         description: "Thống kê, phân tích dữ liệu tổng thể"
//       },

//       // --- Manager ---
//       {
//         label: "Lớp học",
//         href: "/dashboard/manager/classes",
//         icon: BookOpen,
//         access: ["manager"],
//         description: "Quản lý lớp học của tổ chức"
//       },
//       {
//         label: "Giáo viên",
//         href: "/dashboard/manager/teachers",
//         icon: Users,
//         access: ["manager"],
//         description: "Quản lý giáo viên trong tổ chức"
//       },
//       {
//         label: "Đề thi",
//         href: "/dashboard/manager/exams",
//         icon: FileSpreadsheet,
//         access: ["manager"],
//         description: "Quản lý đề thi tổ chức"
//       },
//       {
//         label: "Thống kê",
//         href: "/dashboard/manager/statistics",
//         icon: TrendingUp,
//         access: ["manager"],
//         description: "Xem báo cáo, thống kê tổ chức"
//       },

//       // --- Teacher ---
//       {
//         label: "Lớp học của tôi",
//         href: "/dashboard/teacher/classes",
//         icon: BookOpen,
//         access: ["teacher"],
//         description: "Lớp học được phân công"
//       },
//       {
//         label: "Đề thi",
//         href: "/dashboard/teacher/exams",
//         icon: FileSpreadsheet,
//         access: ["teacher"],
//         description: "Quản lý đề thi cá nhân"
//       },
//       {
//         label: "Chấm bài OMR",
//         href: "/dashboard/teacher/scan",
//         icon: PencilRuler,
//         access: ["teacher"],
//         description: "Upload và chấm bài OMR"
//       },
//       {
//         label: "Thống kê",
//         href: "/dashboard/teacher/statistics",
//         icon: TrendingUp,
//         access: ["teacher"],
//         description: "Xem báo cáo, thống kê kết quả chấm"
//       },
//     ]
//     // Lọc menu theo quyền
//     return allLinks.filter(link =>
//       user?.role && link.access.includes(user.role)
//     )
//   }, [user?.role])

//   const handleLogout = useCallback(async () => {
//     await logout()
//   }, [logout])

//   return (
//     <>
//       {/* Overlay for mobile */}
//       {isSidebarOpen && (
//         <div 
//           className="fixed inset-0 z-20 bg-black/50 md:hidden" 
//           onClick={closeSidebar}
//           aria-hidden="true"
//         />
//       )}

//       {/* Mobile menu button */}
//       <Button
//         variant="outline"
//         size="icon"
//         className="fixed left-4 top-4 z-40 rounded-full md:hidden shadow-md"
//         onClick={toggleSidebar}
//       >
//         <MenuIcon className="h-4 w-4" />
//       </Button>

//       {/* Sidebar */}
//       <aside
//         className={cn(
//           "fixed inset-y-0 left-0 z-30 flex flex-col border-r bg-background transition-all duration-300 ease-in-out shadow-sm md:shadow-none",
//           isSidebarOpen ? "w-64 translate-x-0" : "w-16 -translate-x-full md:translate-x-0"
//         )}
//       >
//         {/* Sidebar header */}
//         <div className="flex h-14 items-center border-b px-4">
//           <Link href="/dashboard/admin" className="flex items-center gap-2 overflow-hidden">
//             <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
//               <Scan className="h-5 w-5 text-primary-foreground" />
//             </div>
//             <span
//               className={cn(
//                 "font-semibold tracking-tight transition-opacity",
//                 isSidebarOpen ? "opacity-100" : "opacity-0 hidden"
//               )}
//             >
//               EduScan
//             </span>
//           </Link>
//           <Button
//             variant="ghost"
//             size="icon"
//             className="ml-auto rounded-full"
//             onClick={toggleSidebar}
//           >
//             {isSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
//           </Button>
//         </div>

//         {/* Sidebar Content */}
//         <ScrollArea
//           className="flex-1 overflow-auto"
//           scrollHideDelay={200}
//         >
//           <nav className="flex-1 px-3 py-4">
//             <ul className="space-y-1.5">
//               {links.map((link) => {
//                 const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)
//                 return (
//                   <li key={link.href}>
//                     <NavLink 
//                       href={link.href}
//                       isActive={isActive}
//                       icon={link.icon}
//                       label={link.label}
//                       description={link.description}
//                       onClick={closeSidebar}
//                       isSidebarOpen={isSidebarOpen}
//                     />
//                   </li>
//                 )
//               })}
//             </ul>
//           </nav>
//         </ScrollArea>

//         {/* User Profile */}
//         <div className="border-t p-4">
//           <div className="flex items-center gap-3">
//             <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
//               {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
//             </div>
//             {isSidebarOpen && (
//               <div className="overflow-hidden">
//                 <p className="text-sm font-medium leading-none truncate">
//                   {user?.name || 'User'}
//                 </p>
//                 <p className="text-xs text-muted-foreground truncate">
//                   {user?.email || ''}
//                 </p>
//               </div>
//             )}
//             <Button 
//               variant="ghost" 
//               size="icon" 
//               className={cn(
//                 "ml-auto rounded-full hover:bg-destructive/10 hover:text-destructive",
//                 !isSidebarOpen && "hidden"
//               )}
//               onClick={handleLogout}
//               title="Đăng xuất"
//             >
//               <LogOut className="h-4 w-4" />
//             </Button>
//           </div>
//         </div>
//       </aside>
//     </>
//   )
// }
