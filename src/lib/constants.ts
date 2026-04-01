export const DEPARTMENTS = [
  'Medical Laboratory Science',
  'Medicine and Surgery',
  'Pharmacy',
  'Radiography',
  'Anatomy',
  'Physiology',
  'Pharmacology',
  'Nursing',
  'Physiotherapy',
  'Dentistry',
] as const

export type DepartmentName = typeof DEPARTMENTS[number]

export const ROLES = {
  STUDENT: 'student',
  COURSE_REP: 'course_rep',
  ASSISTANT_COURSE_REP: 'assistant_course_rep',
  GOVERNOR: 'governor',
  FINANCIAL_SECRETARY: 'financial_secretary',
  DEVELOPER: 'developer',
} as const

export const ROLE_LABELS: Record<string, string> = {
  student: 'Student',
  course_rep: 'Course Representative',
  assistant_course_rep: 'Assistant Course Rep',
  governor: 'Governor',
  financial_secretary: 'Financial Secretary',
  developer: 'Developer',
}

export const ROLE_ROUTES: Record<string, string> = {
  student: '/dashboard',
  course_rep: '/course-rep',
  assistant_course_rep: '/assistant-rep',
  governor: '/governor',
  financial_secretary: '/financial',
  developer: '/developer',
}

export const COLORS = {
  primary: '#0D5C2E',
  secondary: '#1A8A4A',
  accent: '#4DBD74',
  pale: '#E8F5ED',
  background: '#F7FDF9',
  text: '#0D2B18',
  grey: '#5E7A68',
  border: '#B2DBC2',
} as const

export const ISSUE_CATEGORIES = [
  'Academic',
  'Payment',
  'Resource',
  'Technical',
  'Administrative',
  'Other',
] as const

export const FILE_TYPES = ['PDF', 'DOCX', 'PPTX', 'PNG', 'JPG'] as const
export const MAX_FILE_SIZE_MB = 20
export const MAX_ATTACHMENT_SIZE_MB = 5
