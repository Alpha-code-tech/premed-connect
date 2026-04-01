import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useResources(departmentId: string | null | undefined) {
  return useQuery({
    queryKey: ['resources', departmentId],
    enabled: departmentId !== undefined,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .or(`visibility.eq.all,and(visibility.eq.department,department_id.eq.${departmentId})`)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
  })
}
