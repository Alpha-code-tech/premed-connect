import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Download, ExternalLink, File, FileText, Image, BookOpen, Link } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { formatDateShort } from '@/lib/utils'

function getFileIcon(fileType: string) {
  const t = fileType.toUpperCase()
  if (t === 'PDF') return <FileText className="h-5 w-5 text-red-500" />
  if (t === 'PNG' || t === 'JPG') return <Image className="h-5 w-5 text-blue-500" />
  if (t === 'LINK') return <Link className="h-5 w-5 text-brand-primary" />
  return <File className="h-5 w-5 text-brand-grey" />
}

export default function StudentResources() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [opening, setOpening] = useState<string | null>(null)

  const { data: resources, isLoading } = useQuery({
    queryKey: ['student-resources', profile?.department_id],
    enabled: !!profile,
    queryFn: async () => {
      const { data } = await supabase
        .from('resources')
        .select('*')
        .or(`visibility.eq.all,and(visibility.eq.department,department_id.eq.${profile!.department_id})`)
        .order('created_at', { ascending: false })
      return data || []
    },
  })

  const handleOpen = async (resource: { id: string; file_url: string; file_type: string }) => {
    setOpening(resource.id)
    try {
      if (resource.file_type === 'LINK') {
        // Direct link — just open it
        window.open(resource.file_url, '_blank', 'noopener,noreferrer')
      } else {
        // File stored in bucket — get signed URL
        const { data, error } = await supabase.storage.from('resources').createSignedUrl(resource.file_url, 3600)
        if (error || !data?.signedUrl) throw error ?? new Error('Could not generate download link')
        window.open(data.signedUrl, '_blank')
        toast({ title: 'Download started' })
      }
    } catch (e) {
      toast({ title: 'Failed to open resource', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setOpening(null)
    }
  }

  const subjects = ['all', ...new Set(resources?.map(r => r.subject) || [])]
  const filtered = resources?.filter(r => {
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.subject.toLowerCase().includes(search.toLowerCase())
    const matchSubject = subjectFilter === 'all' || r.subject === subjectFilter
    return matchSearch && matchSubject
  })

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Resources</h1>
        <p className="text-brand-grey mt-1">Access study materials and course resources</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-grey" />
          <Input placeholder="Search resources..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter by subject" /></SelectTrigger>
          <SelectContent>
            {subjects.map(s => <SelectItem key={s} value={s}>{s === 'all' ? 'All Subjects' : s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : filtered?.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-brand-border">
          <BookOpen className="h-8 w-8 text-brand-grey mx-auto mb-3" />
          <p className="text-brand-grey">No resources found</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered?.map(resource => {
            const isLink = resource.file_type === 'LINK'
            return (
              <div key={resource.id} className="bg-white rounded-lg border border-brand-border p-4 flex flex-col gap-3 hover:border-brand-accent transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-pale flex items-center justify-center shrink-0">
                    {getFileIcon(resource.file_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-brand-text line-clamp-2">{resource.title}</h3>
                    <p className="text-xs text-brand-grey mt-0.5">{resource.subject}</p>
                  </div>
                </div>
                {resource.description && (
                  <p className="text-xs text-brand-grey line-clamp-2">{resource.description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-brand-grey">
                  <span>{formatDateShort(resource.created_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">{isLink ? 'Link' : resource.file_type}</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-brand-primary border-brand-border hover:bg-brand-pale"
                    onClick={() => handleOpen({ id: resource.id, file_url: resource.file_url, file_type: resource.file_type })}
                    disabled={opening === resource.id}
                  >
                    {isLink ? (
                      <><ExternalLink className="h-3.5 w-3.5 mr-1" /> Open Link</>
                    ) : (
                      <><Download className="h-3.5 w-3.5 mr-1" /> Download</>
                    )}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
