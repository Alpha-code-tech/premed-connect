import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Download, FileText, BarChart2 } from 'lucide-react'
import { formatDateShort } from '@/lib/utils'

export default function StudentResults() {
  const { profile } = useAuth()

  const { data: results, isLoading } = useQuery({
    queryKey: ['student-results', profile?.department_id],
    enabled: !!profile,
    queryFn: async () => {
      const { data } = await supabase
        .from('resources')
        .select('*')
        .or(`visibility.eq.all,and(visibility.eq.department,department_id.eq.${profile!.department_id})`)
        .ilike('subject', '%result%')
        .order('created_at', { ascending: false })
      return data || []
    },
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-text">Results</h1>
        <p className="text-brand-grey mt-1">Download your academic results</p>
      </div>
      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : results?.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-brand-border">
          <BarChart2 className="h-8 w-8 text-brand-grey mx-auto mb-3" />
          <p className="text-brand-grey">No results available yet</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {results?.map(r => (
            <div key={r.id} className="bg-white rounded-lg border border-brand-border p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-brand-pale flex items-center justify-center">
                <FileText className="h-5 w-5 text-brand-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-brand-text line-clamp-1">{r.title}</p>
                <p className="text-xs text-brand-grey mt-0.5">{formatDateShort(r.created_at)}</p>
              </div>
              <Button size="sm" variant="outline" onClick={async () => {
                const { data } = await supabase.storage.from('resources').createSignedUrl(r.file_url, 3600)
                if (data?.signedUrl) window.open(data.signedUrl, '_blank')
              }}>
                <Download className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
