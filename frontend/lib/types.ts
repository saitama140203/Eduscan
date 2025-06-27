// User types
export type User = {
  id: string
  name: string
  email: string
  role: "admin" | "manager" | "teacher"
  organizationId?: string
  createdAt: string
}

export type Admin = User & {
  role: "admin"
}

export type Manager = User & {
  role: "manager"
  organizationId: string
}

export type Teacher = User & {
  role: "teacher"
  organizationId: string
}

// Organization types
export type Organization = {
  id: string
  name: string
  address?: string
  phone?: string
  email?: string
  website?: string
  createdAt: string
  updatedAt?: string
}

// Class types
export type Class = {
  id: string
  name: string
  grade: number
  section?: string
  organizationId: string
  teacherId?: string
  createdAt: string
  updatedAt?: string
}

// Student types
export type Student = {
  id: string
  name: string
  email?: string
  rollNumber?: string
  classId: string
  organizationId: string
  createdAt: string
  updatedAt?: string
}

// Exam types
export type Exam = {
  id: string
  title: string
  subject: string
  description?: string
  date?: string
  duration?: number
  totalQuestions: number
  answerKey?: string[]
  classId: string
  teacherId: string
  organizationId: string
  templateId?: string
  createdAt: string
  updatedAt?: string
}

// Answer sheet template types
export type AnswerSheetTemplate = {
  id: string
  name: string
  description?: string
  questionCount: number
  optionsPerQuestion: number
  format: "A4" | "Letter" | "Custom"
  organizationId: string
  createdAt: string
  updatedAt?: string
}

// Answer sheet types
export type AnswerSheet = {
  id: string
  examId: string
  studentId: string
  score?: number
  correctAnswers?: number
  answers?: string[]
  status: "pending" | "processing" | "graded" | "error"
  errorMessage?: string
  imageUrl?: string
  organizationId: string
  uploadedBy: string
  uploadedAt: string
  gradedAt?: string
}

// Report types
export type ExamReport = {
  examId: string
  title: string
  subject: string
  classId: string
  className: string
  date: string
  totalStudents: number
  submittedSheets: number
  averageScore: number
  highestScore: number
  lowestScore: number
  passingRate: number
  questionAnalysis: {
    questionNumber: number
    correctRate: number
  }[]
}

export type ClassReport = {
  classId: string
  className: string
  totalStudents: number
  totalExams: number
  averageScore: number
  examBreakdown: {
    examId: string
    title: string
    averageScore: number
    date: string
  }[]
}

export type StudentReport = {
  studentId: string
  name: string
  classId: string
  className: string
  examResults: {
    examId: string
    title: string
    score: number
    date: string
  }[]
  averageScore: number
}

// Form types
export type LoginFormData = {
  email: string
  password: string
}

export type OrganizationFormData = {
  name: string
  address?: string
  phone?: string
  email?: string
  website?: string
}

export type ClassFormData = {
  name: string
  grade: number
  section?: string
  teacherId?: string
  organizationId: string
}

export type TeacherFormData = {
  name: string
  email: string
  password: string
  organizationId: string
}

export type StudentFormData = {
  name: string
  email?: string
  rollNumber?: string
  classId: string
}

export type ExamFormData = {
  title: string
  subject: string
  description?: string
  date?: string
  duration?: number
  totalQuestions: number
  answerKey?: string[]
  classId: string
  templateId?: string
}

export type TemplateFormData = {
  name: string
  description?: string
  questionCount: number
  optionsPerQuestion: number
  format: "A4" | "Letter" | "Custom"
}
