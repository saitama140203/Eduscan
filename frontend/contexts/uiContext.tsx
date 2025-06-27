"use client"

import type React from "react"

import { createContext, useState } from "react"

type UIContextType = {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}

export const UIContext = createContext<UIContextType>({
  sidebarOpen: false,
  setSidebarOpen: () => {},
  toggleSidebar: () => {},
})

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return <UIContext.Provider value={{ sidebarOpen, setSidebarOpen, toggleSidebar }}>{children}</UIContext.Provider>
}
