import { apiRequest } from './base'

export interface AdminStats {
  organizations: number
  classes: number
  managers: number
  teachers: number
  exams: number
  students: number
  averageScore?: number | null
}

export interface ManagerStats {
  classes: number
  teachers: number
  exams: number
  students: number
  averageScore?: number | null
}

export interface TeacherStats {
  classes: number
  exams: number
  answerSheets: number
  averageScore?: number | null
}

export const statsApi = {
  getManagerOverview: async () => {
    return await apiRequest('/stats/overview')
  },
  getRecentActivities: async () => {
    return await apiRequest('/stats/recent-activities')
  },
  getOverview: async () => {
    // This can be an alias or a more general stats endpoint
    return await apiRequest('/stats/overview')
  },
}

