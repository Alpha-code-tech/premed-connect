import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

export default function GovernorDepartments() {
  const [search, setSearch] = useState('')
  const [selectedDept, setSelectedDept] = useState<string | null>(null)

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await supabase.from('departments').select('id, name').order('name')
      return data || []
    },
  })

  const { data: members, isLoading } = useQuery({
    queryKey: ['governor-all-members'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, student_id, department_id, role')
        .not('department_id', 'is', null)
        .order('full_name')
      return data || []
    },
  })

  const deptMap = Object.fromEntries((departments || []).map(d => [d.id, d.name]))

  const deptCounts = (departments || []).map(dept => ({
    id: dept.id,
    name: dept.name,
    count: members?.filter(s => s.department_id === dept.id).length ?? 0,
  }))

  const filtered = members?.filter(s => {
    const matchDept = !selectedDept || s.department_id === selectedDept
    const matchSearch = !search ||
      s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.student_id?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase())
    return matchDept && matchSearch
  })

  const selectedDeptName = selectedDept ? deptMap[selectedDept] : null

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-brand-text">Departments</h1>
        <p className="text-brand-grey mt-1 text-sm">Members across all departments</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {deptCounts.map(d => (
          <button
            key={d.id}
            onClick={() => setSelectedDept(selectedDept === d.id ? null : d.id)}
            className={`p-3 rounded-lg border text-left transition-colors ${
              selectedDept === d.id
                ? 'border-brand-primary bg-brand-pale'
                : 'border-brand-border bg-white hover:border-brand-accent'
            }`}
          >
            <p className="text-lg font-bold text-brand-primary">{d.count}</p>
            <p className="text-xs text-brand-grey mt-0.5 line-clamp-2">{d.name}</p>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-brand-border">
        <div className="p-4 border-b border-brand-border flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-grey" />
            <span className="text-sm font-medium text-brand-text">
              {selectedDeptName ? `${selectedDeptName} (${filtered?.length ?? 0})` : `All Members (${members?.length ?? 0})`}
            </span>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-grey" />
            <Input placeholder="Search members..." className="pl-9 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : filtered?.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-brand-grey text-sm">No members found</p>
          </div>
        ) : (
          <>
            {/* ── Mobile cards ── */}
            <div className="block md:hidden p-3 space-y-3">
              {filtered?.map(s => (
                <div key={s.id} className="bg-white border border-brand-border rounded-lg p-4 space-y-1.5">
                  <div className="flex justify-between items-center gap-2">
                    <p className="font-semibold text-sm text-brand-text">{s.full_name}</p>
                    <Badge variant="secondary" className="text-xs capitalize shrink-0">{s.role?.replace(/_/g, ' ')}</Badge>
                  </div>
                  <p className="text-xs text-brand-grey truncate">{s.email}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-brand-grey">{s.student_id || 'N/A'}</span>
                    <Badge variant="outline" className="text-xs">{deptMap[s.department_id ?? ''] || s.department_id}</Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Desktop table ── */}
            <div className="hidden md:block overflow-x-auto max-w-full">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-border text-brand-grey text-xs">
                    <th className="text-left px-4 py-2 font-medium">Name</th>
                    <th className="text-left px-4 py-2 font-medium">Student ID</th>
                    <th className="text-left px-4 py-2 font-medium">Email</th>
                    <th className="text-left px-4 py-2 font-medium">Department</th>
                    <th className="text-left px-4 py-2 font-medium">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered?.map(s => (
                    <tr key={s.id} className="border-b border-brand-border last:border-0 hover:bg-brand-pale/30">
                      <td className="px-4 py-3 font-medium text-brand-text">{s.full_name}</td>
                      <td className="px-4 py-3 text-brand-grey">{s.student_id || 'N/A'}</td>
                      <td className="px-4 py-3 text-brand-grey max-w-[180px] truncate">{s.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">{deptMap[s.department_id ?? ''] || s.department_id}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-xs capitalize">{s.role?.replace(/_/g, ' ')}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
