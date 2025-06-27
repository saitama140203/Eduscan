import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + "..."
}

export function generatePaginationArray(currentPage: number, totalPages: number, maxLength = 7) {
  if (totalPages <= maxLength) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const sideWidth = Math.floor(maxLength / 2)

  if (currentPage <= sideWidth) {
    return [...Array.from({ length: maxLength - 1 }, (_, i) => i + 1), totalPages]
  }

  if (currentPage >= totalPages - sideWidth) {
    return [1, ...Array.from({ length: maxLength - 1 }, (_, i) => totalPages - maxLength + i + 2)]
  }

  return [
    1,
    "...",
    ...Array.from({ length: maxLength - 4 }, (_, i) => currentPage - Math.floor((maxLength - 4) / 2) + i),
    "...",
    totalPages,
  ]
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

// Improved API connectivity check function
export async function checkApiConnectivity(apiUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    // Sử dụng endpoint /health hoặc / tùy thuộc vào cấu hình API
    try {
      const response = await fetch(`http://127.0.0.1:8000/health`, {
        method: "GET",
        signal: controller.signal,
        mode: "cors", // Thay đổi từ 'no-cors' sang 'cors'
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })
      clearTimeout(timeoutId)
      return response.ok || response.status === 200
    } catch (getError) {
      console.warn("GET /health failed, thử GET /:", getError)
      // Nếu GET /health fail, thử GET /
      try {
        const response = await fetch(apiUrl, {
          method: "GET",
          signal: controller.signal,
          mode: "cors", // Thay đổi từ 'no-cors' sang 'cors'
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        })
        clearTimeout(timeoutId)
        return response.ok || response.status === 200
      } catch (rootError) {
        clearTimeout(timeoutId)
        throw rootError
      }
    }
  } catch (error) {
    console.error("API connectivity check failed:", error)
    return false
  }
}
