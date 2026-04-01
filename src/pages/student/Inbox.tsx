import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Megaphone, ChevronRight, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'
import type { Announcement } from '@/types'

export default function StudentInbox() {
  const { profile } = useAuth()
  const [selected, setSelected] = useState<Announcement | null>(null)

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['student-inbox', profile?.department_id],
    enabled: !!profile,
    queryFn: async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .or(`department_id.is.null,department_id.eq.${profile!.department_id}`)
        .order('created_at', { ascending: false })
      return (data as Announcement[]) || []
    },
  })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-text">Inbox</h1>
        <p className="text-brand-grey mt-1">Announcements from your department and PreMed Set</p>
      </div>
      <div className="flex gap-4 h-[calc(100vh-220px)]">
        <div className="flex-1 overflow-auto space-y-2">
          {isLoading ? (
            [...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
          ) : announcements?.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-brand-border">
              <Megaphone className="h-8 w-8 text-brand-grey mx-auto mb-3" />
              <p className="text-brand-grey">No announcements yet</p>
            </div>
          ) : announcements?.map(a => (
            <div
              key={a.id}
              onClick={() => setSelected(a)}
              className={`bg-white rounded-lg border p-4 cursor-pointer hover:border-brand-accent transition-colors ${selected?.id === a.id ? 'border-brand-primary' : 'border-brand-border'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-sm text-brand-text">{a.title}</h3>
                    {!a.department_id && <Badge variant="outline" className="text-xs">All Depts</Badge>}
                  </div>
                  <p className="text-xs text-brand-grey line-clamp-2">{a.body}</p>
                  <p className="text-xs text-brand-grey mt-1">{formatDate(a.created_at)}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-brand-grey shrink-0 mt-0.5" />
              </div>
            </div>
          ))}
        </div>

        {selected && (
          <div className="hidden sm:block w-80 lg:w-96 bg-white rounded-lg border border-brand-border p-4 overflow-auto">
            <div className="flex items-start justify-between mb-4">
              <h2 className="font-semibold text-brand-text pr-4">{selected.title}</h2>
              <button onClick={() => setSelected(null)} className="text-brand-grey hover:text-brand-text">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-brand-grey mb-4">{formatDate(selected.created_at)}</p>
            <p className="text-sm text-brand-text leading-relaxed whitespace-pre-wrap">{selected.body}</p>
          </div>
        )}
      </div>
    </div>
  )
}
