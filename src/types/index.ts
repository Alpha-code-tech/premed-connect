export type { Database, Tables, TablesInsert, TablesUpdate } from './database'

export type UserRole =
  | 'student'
  | 'course_rep'
  | 'assistant_course_rep'
  | 'governor'
  | 'financial_secretary'
  | 'developer'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  department_id: string | null
  student_id: string | null
  role: UserRole
  avatar_url: string | null
  password_changed: boolean
  created_at: string
}

export interface Department {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface PaymentItem {
  id: string
  title: string
  amount: number
  deadline: string
  department_id: string | null
  created_by: string
  created_at: string
}

export interface Payment {
  id: string
  student_id: string
  payment_item_id: string
  amount: number
  status: 'pending' | 'successful' | 'failed'
  paystack_reference: string | null
  receipt_url: string | null
  created_at: string
}

export interface Resource {
  id: string
  title: string
  description: string | null
  subject: string
  file_url: string
  file_type: string
  visibility: 'all' | 'department'
  department_id: string | null
  uploaded_by: string
  created_at: string
}

export interface Announcement {
  id: string
  title: string
  body: string
  department_id: string | null
  sent_by: string
  created_at: string
}

export interface Notification {
  id: string
  student_id: string
  title: string
  message: string
  urgency: 'normal' | 'urgent' | 'critical'
  is_read: boolean
  created_at: string
}

export interface TimetableEntry {
  id: string
  student_id: string
  subject: string
  topic: string
  day_of_week: string
  start_time: string
  end_time: string
  note: string | null
  status: 'not_started' | 'in_progress' | 'completed'
  created_at: string
}

export interface MockTest {
  id: string
  title: string
  subject: string
  time_limit: number
  instructions: string | null
  status: 'draft' | 'published'
  department_id: string | null
  created_by: string
  created_at: string
}

export interface MockQuestion {
  id: string
  test_id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: 'a' | 'b' | 'c' | 'd'
  order_index: number
  created_at: string
}

export interface MockAttempt {
  id: string
  student_id: string
  test_id: string
  answers: Record<string, string>
  score: number
  total_questions: number
  percentage: number
  started_at: string
  submitted_at: string | null
}

export interface Issue {
  id: string
  student_id: string
  category: string
  description: string
  attachment_url: string | null
  status: 'open' | 'in_progress' | 'resolved'
  created_at: string
}

export interface AuditLog {
  id: string
  action_type: string
  performed_by: string
  affected_entity_type: string
  affected_entity_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}
