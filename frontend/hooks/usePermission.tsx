"use client"

import { useAuth } from "./useAuth"

type Permission =
  | "create:org"
  | "edit:org"
  | "delete:org"
  | "create:class"
  | "edit:class"
  | "delete:class"
  | "create:exam"
  | "edit:exam"
  | "delete:exam"
  | "create:template"
  | "edit:template"
  | "delete:template"
  | "create:teacher"
  | "edit:teacher"
  | "delete:teacher"
  | "create:student"
  | "edit:student"
  | "delete:student"
  | "upload:answersheet"
  | "grade:exam"
  | "view:reports"
  | "export:reports"
  | "manage:users"
  | "system:settings"

export function usePermission() {
  const { user } = useAuth()

  const hasPermission = (permission: Permission, resourceOrgId?: string): boolean => {
    if (!user) return false

    // Admin has all permissions across all organizations
    if (user.role === "admin") return true

    // For manager and teacher, check if they belong to the organization
    if (resourceOrgId && user.organizationId !== resourceOrgId) return false

    // Define permissions based on user role
    const permissions: Record<string, Permission[]> = {
      manager: [
        "create:class",
        "edit:class",
        "delete:class",
        "create:exam",
        "edit:exam",
        "delete:exam",
        "create:template",
        "edit:template",
        "delete:template",
        "create:teacher",
        "edit:teacher",
        "delete:teacher",
        "create:student",
        "edit:student",
        "delete:student",
        "upload:answersheet",
        "grade:exam",
        "view:reports",
        "export:reports",
        "manage:users",
      ],
      teacher: [
        "create:exam",
        "edit:exam",
        "delete:exam",
        "create:student",
        "edit:student",
        "delete:student",
        "upload:answersheet",
        "grade:exam",
        "view:reports",
        "export:reports",
      ],
    }

    return permissions[user.role]?.includes(permission) || false
  }

  // Check if user can access a specific class
  const canAccessClass = (classId: string, classOrgId: string, teacherId?: string): boolean => {
    if (!user) return false

    // Admin can access any class
    if (user.role === "admin") return true

    // Manager can access any class in their organization
    if (user.role === "manager" && user.organizationId === classOrgId) return true

    // Teacher can only access classes assigned to them
    if (user.role === "teacher" && user.organizationId === classOrgId) {
      // In a real app, you would check if the class is assigned to this teacher
      return teacherId === user.id
    }

    return false
  }

  return { hasPermission, canAccessClass }
}
