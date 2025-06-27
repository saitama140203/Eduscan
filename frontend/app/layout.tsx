import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Suspense } from "react"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/authContext"
import { QueryProvider } from "@/providers/query-provider"
import "@/app/globals.css"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  preload: true,
})

export const metadata: Metadata = {
  title: {
    template: "%s | EduScan",
    default: "EduScan - AI-Powered Exam Scanning System",
  },
  description:
    "Automated exam scanning and grading system using AI and Computer Vision technology. Streamline your educational assessment process with real-time results and comprehensive analytics.",
  keywords: [
    "education technology",
    "exam scanning",
    "AI grading",
    "automated assessment",
    "educational software",
    "computer vision",
    "optical mark recognition",
    "OMR",
    "exam management",
    "educational analytics",
  ],
  authors: [{ name: "EduScan Team" }],
  creator: "EduScan",
  publisher: "EduScan Technologies",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: "/",
    siteName: "EduScan",
    title: "EduScan - AI-Powered Exam Scanning System",
    description: "Automated exam scanning and grading system using AI and Computer Vision technology",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "EduScan - AI-Powered Exam Scanning System",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EduScan - AI-Powered Exam Scanning System",
    description: "Automated exam scanning and grading system using AI and Computer Vision technology",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider 
          attribute="class" 
          defaultTheme="light" 
          enableSystem 
          disableTransitionOnChange
        >
            <QueryProvider>
              <AuthProvider>
                    <Suspense
                      fallback={
                        <div className="h-screen flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      }
                    >
                      {children}
                    </Suspense>
                    <Toaster />
              </AuthProvider>
            </QueryProvider>
          </ThemeProvider>
      </body>
    </html>
  )
}
