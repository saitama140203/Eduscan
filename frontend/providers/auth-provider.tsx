"use client"

// Re-export AuthProvider từ contexts/authContext
export { AuthProvider, AuthContext } from "@/contexts/authContext"
export type { User } from "@/contexts/authContext"

// Hàm helper để duy trì khả năng tương thích với code cũ
export function useAuth() {
  // Import động để tránh circular dependency
  const { useAuth: originalUseAuth } = require("@/hooks/useAuth")
  return originalUseAuth()
}
