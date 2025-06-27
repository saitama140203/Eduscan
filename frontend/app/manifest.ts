import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EduScan - AI-Powered Exam Scanning System",
    short_name: "EduScan",
    description: "Automated exam scanning and grading system using AI and Computer Vision technology",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/screenshot1.png",
        sizes: "1280x720",
        type: "image/png",
        label: "EduScan Dashboard",
      },
      {
        src: "/screenshot2.png",
        sizes: "1280x720",
        type: "image/png",
        label: "Exam Scanning Interface",
      },
    ],
    categories: ["education", "productivity", "utilities"],
    orientation: "portrait",
    shortcuts: [
      {
        name: "Dashboard",
        url: "/dashboard",
        description: "View your dashboard",
      },
      {
        name: "Scan Exam",
        url: "/dashboard/teacher/scan",
        description: "Scan a new exam",
      },
    ],
  }
}
