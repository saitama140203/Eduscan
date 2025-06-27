import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Protected routes configuration
const dashboardRoutes = ["/dashboard"]
const authRoutes = ["/auth/login", "/auth/register"]
const roleBasedRoutes = {
  admin: ["/dashboard/admin"],
  manager: ["/dashboard/manager"],
  teacher: ["/dashboard/teacher"],
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get("access_token")?.value

  // Add security headers
  const response = NextResponse.next()
  response.headers.set("X-DNS-Prefetch-Control", "on")
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "origin-when-cross-origin")

  // Kiểm tra nếu là route xác thực
  const isAuthRoute = authRoutes.some((route) => pathname === route)
  // Kiểm tra nếu là route dashboard
  const isDashboardRoute = dashboardRoutes.some((route) => pathname.startsWith(route)) ||
    Object.values(roleBasedRoutes).flat().some((route) => pathname.startsWith(route))

  // Nếu đang ở trang auth và đã có token, chuyển hướng đến dashboard
  if (isAuthRoute && token) {
    // Không chuyển hướng tự động, để client xử lý
    return response
  }

  // Nếu đang ở trang dashboard và không có token, chuyển hướng đến login
  if (isDashboardRoute && !token) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
}
