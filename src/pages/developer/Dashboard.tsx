import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Users, FileText, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface DeveloperStats {
  totalUsers: number
  pendingRequests: number
  totalResources: number
}

export default function DeveloperDashboard() {
  const { data: stats, isLoading } = useQuery<DeveloperStats>({
    queryKey: ['developer-stats'],
    queryFn: async () => {
      const [
        { count: totalUsers },
        { count: pendingRequests },
        { count: totalResources },
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('access_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('resources').select('id', { count: 'exact', head: true }),
      ])
      return {
        totalUsers: totalUsers ?? 0,
        pendingRequests: pendingRequests ?? 0,
        totalResources: totalResources ?? 0,
      }
    },
  })

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-brand-text">Developer Portal</h1>
        <p className="text-brand-grey mt-1 text-sm">Manage access, users, and platform configuration</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {isLoading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)
        ) : (
          <>
            <Link to="/developer/access-requests">
              <Card className="hover:border-brand-secondary transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-brand-grey font-normal flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Access Requests
                    </span>
                    {(stats?.pendingRequests ?? 0) > 0 && (
                      <Badge variant="danger">{stats!.pendingRequests} pending</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl sm:text-2xl font-bold text-brand-text">{stats?.pendingRequests}</p>
                  <p className="text-xs text-brand-grey mt-1">Awaiting review</p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/developer/user-management">
              <Card className="hover:border-brand-secondary transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-brand-grey font-normal flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Total Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl sm:text-2xl font-bold text-brand-text">{stats?.totalUsers}</p>
                  <p className="text-xs text-brand-grey mt-1">Active accounts</p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/developer/overview">
              <Card className="hover:border-brand-secondary transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-brand-grey font-normal flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Resources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl sm:text-2xl font-bold text-brand-text">{stats?.totalResources}</p>
                  <p className="text-xs text-brand-grey mt-1">Uploaded files</p>
                </CardContent>
              </Card>
            </Link>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Link
          to="/developer/access-requests"
          className="block p-4 rounded-lg border border-brand-border bg-white hover:bg-brand-pale transition-colors text-sm font-medium text-brand-primary"
        >
          Manage Access Requests →
        </Link>
        <Link
          to="/developer/user-management"
          className="block p-4 rounded-lg border border-brand-border bg-white hover:bg-brand-pale transition-colors text-sm font-medium text-brand-primary"
        >
          Manage Users →
        </Link>
        <Link
          to="/developer/overview"
          className="block p-4 rounded-lg border border-brand-border bg-white hover:bg-brand-pale transition-colors text-sm font-medium text-brand-primary"
        >
          Platform Overview →
        </Link>
      </div>
    </div>
  )
}
