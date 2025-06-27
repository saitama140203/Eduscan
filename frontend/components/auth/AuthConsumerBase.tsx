'use client'

import { useAuth } from "@/contexts/authContext"
import type { ReactNode } from "react"

// Một phiên bản đơn giản chỉ truyền user xuống cho children
export function AuthConsumerBase({ children }: { children: (user: any) => ReactNode }) {
  const { user } = useAuth();
  return <>{children(user)}</>;
} 