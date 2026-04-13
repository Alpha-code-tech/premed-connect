// Summary dashboard for course rep:
// - Stats: total dept students, pending issues, recent announcements count, payment summary
// - Quick links to key sections
// - Recent issues list (last 5)
// - Recent student activity

import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Users, AlertCircle, Megaphone, CreditCard } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateShort } from '@/lib/utils'
import { useAuth as _useAuth } from '@/context/AuthContext'

export default function CourseRepDashboard() {
  const { profile } = useAuth()
  const basePath = profile?.role === 'assistant_course_rep' ? '/assistant-rep' : '/course-rep'

  const { data: stats, isLoading } = useQuery({
    queryKey: ['courserep-stats', profile?.department_id],
    enabled: !!profile,
    queryFn: async () => {
      const [
        { count: totalStudents },
        { count: openIssues },
        { data: recentAnnouncements },
        { data: recentIssues },
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('department_id', profile!.department_id!),
        supabase.from('issues').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('announcements').select('*').eq('department_id', profile!.department_id!).order('created_at', { ascending: false }).limit(3),
        supabase.from('issues').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(5),
      ])
      return { totalStudents: totalStudents || 0, openIssues: openIssues || 0, recentAnnouncements: recentAnnouncements || [], recentIssues: recentIssues || [] }
    },
  })

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Course Rep Dashboard</h1>
        <p className="text-brand-grey mt-1">Overview of your department</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />) : (
          <>
            <Link to={`${basePath}/students`}>
              <Card className="hover:border-brand-accent cursor-pointer transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-brand-grey">Dept Students</p>
                    <div className="w-8 h-8 rounded-lg bg-brand-pale flex items-center justify-center">
                      <Users className="h-4 w-4 text-brand-primary" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-brand-text">{stats?.totalStudents}</p>
                </CardContent>
              </Card>
            </Link>
            <Link to={`${basePath}/issues`}>
              <Card className={`hover:border-brand-accent cursor-pointer transition-colors ${stats?.openIssues ? 'border-amber-200' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-brand-grey">Open Issues</p>
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-brand-text">{stats?.openIssues}</p>
                </CardContent>
              </Card>
            </Link>
            <Link to={`${basePath}/announcements`}>
              <Card className="hover:border-brand-accent cursor-pointer transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-brand-grey">Announcements</p>
                    <div className="w-8 h-8 rounded-lg bg-brand-pale flex items-center justify-center">
                      <Megaphone className="h-4 w-4 text-brand-primary" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-brand-text">{stats?.recentAnnouncements.length}</p>
                </CardContent>
              </Card>
            </Link>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Issues</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />) :
              stats?.recentIssues.length === 0 ? <p className="text-sm text-brand-grey text-center py-4">No issues</p> :
              (stats?.recentIssues as unknown as { id: string; subject: string; status: string; created_at: string; profiles: { full_name: string } | null }[])?.map((issue) => (
                <div key={issue.id} className="flex items-center gap-3 p-2 rounded-lg bg-brand-pale/50">
                  <Badge variant={issue.status === 'open' ? 'warning' : issue.status === 'resolved' ? 'success' : 'outline'} className="text-xs shrink-0">
                    {issue.status}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-brand-text truncate">{issue.subject}</p>
                    <p className="text-xs text-brand-grey">{issue.profiles?.full_name}</p>
                  </div>
                  <span className="text-xs text-brand-grey shrink-0">{formatDateShort(issue.created_at)}</span>
                </div>
              ))
            }
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Announcements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />) :
              stats?.recentAnnouncements.length === 0 ? <p className="text-sm text-brand-grey text-center py-4">No announcements</p> :
              stats?.recentAnnouncements.map((ann: { id: string; title: string; body: string; created_at: string }) => (
                <div key={ann.id} className="p-2 rounded-lg bg-brand-pale/50">
                  <p className="text-sm font-medium text-brand-text">{ann.title}</p>
                  <p className="text-xs text-brand-grey line-clamp-1 mt-0.5">{ann.body}</p>
                </div>
              ))
            }
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
