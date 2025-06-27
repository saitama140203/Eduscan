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
  getOverview: async () => {
    return apiRequest('/stats/overview')
  },
}

