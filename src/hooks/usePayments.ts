import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useStudentPayments(studentId: string | undefined, departmentId: string | null | undefined) {
  return useQuery({
    queryKey: ['payments', studentId, departmentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data: items } = await supabase
        .from('payment_items')
        .select('*')
        .or(`department_id.is.null,department_id.eq.${departmentId}`)

      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', studentId!)

      return { items: items || [], payments: payments || [] }
    },
  })
}
