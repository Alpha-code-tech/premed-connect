// Table of all dept students with name, email, matric number, payment status
// Search functionality

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Users } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export default function CourseRepStudents() {
  const { profile } = useAuth()
  const [search, setSearch] = useState('')

  const { data: students, isLoading } = useQuery({
    queryKey: ['dept-students', profile?.department_id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('department_id', profile!.department_id!)
        .eq('role', 'student')
        .order('full_name')
      if (error) throw error
      return data
    },
  })

  const filtered = (students || []).filter(s =>
    !search || s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    (s.student_id || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-brand-text">My Students</h1>
        <p className="text-brand-grey mt-1 text-sm">All students in your department ({students?.length || 0} total)</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-grey" />
        <Input className="pl-9" placeholder="Search by name, email, or matric number..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-brand-border">
          <Users className="h-8 w-8 text-brand-grey mx-auto mb-3" />
          <p className="text-brand-grey">No students found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-brand-border overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-brand-pale border-b border-brand-border">
              <tr>
                <th className="text-left px-4 py-3 text-brand-grey font-medium">Name</th>
                <th className="text-left px-4 py-3 text-brand-grey font-medium">Email</th>
                <th className="text-left px-4 py-3 text-brand-grey font-medium">Matric No.</th>
                <th className="text-left px-4 py-3 text-brand-grey font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filtered.map(student => (
                <tr key={student.id} className="hover:bg-brand-pale/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-brand-text">{student.full_name}</td>
                  <td className="px-4 py-3 text-brand-grey">{student.email}</td>
                  <td className="px-4 py-3 text-brand-grey">{student.student_id || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={student.password_changed ? 'success' : 'warning'}>
                      {student.password_changed ? 'Active' : 'Pending'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
