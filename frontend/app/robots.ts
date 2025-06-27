import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/auth/login"],
      disallow: ["/api/", "/dashboard/admin/", "/dashboard/manager/", "/dashboard/teacher/", "/auth/reset-password", "/dashboard/teacher/profile"],
    },
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sitemap.xml`,
  }
}
