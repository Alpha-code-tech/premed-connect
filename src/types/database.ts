export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      course_topics: {
        Row: {
          id: string
          student_id: string
          course_code: string
          course_name: string
          topic_name: string
          is_completed: boolean
          created_by: 'student' | 'course_rep'
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          course_code: string
          course_name: string
          topic_name: string
          is_completed?: boolean
          created_by: 'student' | 'course_rep'
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          course_code?: string
          course_name?: string
          topic_name?: string
          is_completed?: boolean
          created_by?: 'student' | 'course_rep'
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          department_id: string | null
          student_id: string | null
          role: string
          avatar_url: string | null
          password_changed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          department_id?: string | null
          student_id?: string | null
          role: string
          avatar_url?: string | null
          password_changed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          department_id?: string | null
          student_id?: string | null
          role?: string
          avatar_url?: string | null
          password_changed?: boolean
          created_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
        }
        Relationships: []
      }
      access_requests: {
        Row: {
          id: string
          full_name: string
          department_id: string
          matriculation_number: string
          gmail: string
          status: 'pending' | 'approved' | 'rejected'
          rejection_reason: string | null
          submitted_at: string
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          id?: string
          full_name: string
          department_id: string
          matriculation_number: string
          gmail: string
          status?: 'pending' | 'approved' | 'rejected'
          rejection_reason?: string | null
          submitted_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          department_id?: string
          matriculation_number?: string
          gmail?: string
          status?: 'pending' | 'approved' | 'rejected'
          rejection_reason?: string | null
          submitted_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Relationships: []
      }
      payment_items: {
        Row: {
          id: string
          title: string
          amount: number
          deadline: string
          department_id: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          amount: number
          deadline: string
          department_id?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          amount?: number
          deadline?: string
          department_id?: string | null
          created_by?: string
          created_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          student_id: string
          payment_item_id: string
          amount: number
          status: 'pending' | 'successful' | 'failed'
          paystack_reference: string | null
          receipt_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          payment_item_id: string
          amount: number
          status?: 'pending' | 'successful' | 'failed'
          paystack_reference?: string | null
          receipt_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          payment_item_id?: string
          amount?: number
          status?: 'pending' | 'successful' | 'failed'
          paystack_reference?: string | null
          receipt_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
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
        Insert: {
          id?: string
          title: string
          description?: string | null
          subject: string
          file_url: string
          file_type: string
          visibility: 'all' | 'department'
          department_id?: string | null
          uploaded_by: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          subject?: string
          file_url?: string
          file_type?: string
          visibility?: 'all' | 'department'
          department_id?: string | null
          uploaded_by?: string
          created_at?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          id: string
          title: string
          body: string
          department_id: string | null
          sent_by: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          body: string
          department_id?: string | null
          sent_by: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          body?: string
          department_id?: string | null
          sent_by?: string
          created_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          student_id: string
          title: string
          message: string
          urgency: 'normal' | 'urgent' | 'critical'
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          title: string
          message: string
          urgency?: 'normal' | 'urgent' | 'critical'
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          title?: string
          message?: string
          urgency?: 'normal' | 'urgent' | 'critical'
          is_read?: boolean
          created_at?: string
        }
        Relationships: []
      }
      timetable_entries: {
        Row: {
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
        Insert: {
          id?: string
          student_id: string
          subject: string
          topic: string
          day_of_week: string
          start_time: string
          end_time: string
          note?: string | null
          status?: 'not_started' | 'in_progress' | 'completed'
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          subject?: string
          topic?: string
          day_of_week?: string
          start_time?: string
          end_time?: string
          note?: string | null
          status?: 'not_started' | 'in_progress' | 'completed'
          created_at?: string
        }
        Relationships: []
      }
      mock_tests: {
        Row: {
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
        Insert: {
          id?: string
          title: string
          subject: string
          time_limit: number
          instructions?: string | null
          status?: 'draft' | 'published'
          department_id?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          subject?: string
          time_limit?: number
          instructions?: string | null
          status?: 'draft' | 'published'
          department_id?: string | null
          created_by?: string
          created_at?: string
        }
        Relationships: []
      }
      mock_questions: {
        Row: {
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
        Insert: {
          id?: string
          test_id: string
          question_text: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          correct_answer: 'a' | 'b' | 'c' | 'd'
          order_index: number
          created_at?: string
        }
        Update: {
          id?: string
          test_id?: string
          question_text?: string
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          correct_answer?: 'a' | 'b' | 'c' | 'd'
          order_index?: number
          created_at?: string
        }
        Relationships: []
      }
      mock_attempts: {
        Row: {
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
        Insert: {
          id?: string
          student_id: string
          test_id: string
          answers: Record<string, string>
          score: number
          total_questions: number
          percentage: number
          started_at?: string
          submitted_at?: string | null
        }
        Update: {
          id?: string
          student_id?: string
          test_id?: string
          answers?: Record<string, string>
          score?: number
          total_questions?: number
          percentage?: number
          started_at?: string
          submitted_at?: string | null
        }
        Relationships: []
      }
      issues: {
        Row: {
          id: string
          student_id: string
          category: string
          description: string
          attachment_url: string | null
          status: 'open' | 'in_progress' | 'resolved'
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          category: string
          description: string
          attachment_url?: string | null
          status?: 'open' | 'in_progress' | 'resolved'
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          category?: string
          description?: string
          attachment_url?: string | null
          status?: 'open' | 'in_progress' | 'resolved'
          created_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          id: string
          action_type: string
          performed_by: string
          affected_entity_type: string
          affected_entity_id: string | null
          metadata: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          action_type: string
          performed_by: string
          affected_entity_type: string
          affected_entity_id?: string | null
          metadata?: Record<string, unknown> | null
          created_at?: string
        }
        Update: {
          id?: string
          action_type?: string
          performed_by?: string
          affected_entity_type?: string
          affected_entity_id?: string | null
          metadata?: Record<string, unknown> | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
