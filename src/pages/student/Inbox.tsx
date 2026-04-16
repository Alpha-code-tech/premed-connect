import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Megaphone, ChevronRight, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDate } from '@/lib/utils'
import type { Announcement } from '@/types'

export default function StudentInbox() {
  const { profile } = useAuth()
  const [selected, setSelected] = useState<Announcement | null>(null)

  const deptId = profile?.department_id ?? null

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['student-inbox', deptId],
    enabled: !!profile && !!deptId,
    queryFn: async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .or(`department_id.is.null,department_id.eq.${deptId}`)
        .order('created_at', { ascending: false })
      return (data as Announcement[]) || []
    },
  })

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-brand-text">Inbox</h1>
        <p className="text-brand-grey mt-1 text-sm">Announcements from your department and PreMed Set</p>
      </div>

      {/* Mobile: full-width list, tap to open dialog */}
      {/* Desktop sm+: two-column split layout */}
      <div className="flex gap-4 sm:h-[calc(100vh-220px)]">
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
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
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

        {/* Desktop side panel */}
        {selected && (
          <div className="hidden sm:block w-80 lg:w-96 bg-white rounded-lg border border-brand-border p-4 overflow-auto">
            <div className="flex items-start justify-between mb-4">
              <h2 className="font-semibold text-brand-text pr-4">{selected.title}</h2>
              <button onClick={() => setSelected(null)} className="text-brand-grey hover:text-brand-text min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-brand-grey mb-4">{formatDate(selected.created_at)}</p>
            <p className="text-sm text-brand-text leading-relaxed whitespace-pre-wrap">{selected.body}</p>
          </div>
        )}
      </div>

      {/* Mobile dialog for reading announcements */}
      <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null) }}>
        <DialogContent className="sm:hidden max-w-[calc(100vw-2rem)] w-full rounded-xl mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base leading-snug pr-6">{selected?.title}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-brand-grey -mt-1">{selected ? formatDate(selected.created_at) : ''}</p>
          <div className="overflow-y-auto max-h-[60vh]">
            <p className="text-sm text-brand-text leading-relaxed whitespace-pre-wrap">{selected?.body}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
