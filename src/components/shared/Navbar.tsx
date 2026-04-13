import { Bell, Menu, LogOut, User, GraduationCap, LayoutDashboard, Sun, Moon } from 'lucide-react'
import { InstallPWA } from '@/components/shared/InstallPWA'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useViewMode } from '@/context/ViewModeContext'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { ROLE_ROUTES } from '@/lib/constants'
import { useNotifications } from '@/hooks/useNotifications'
import { useToast } from '@/hooks/use-toast'
import { formatDateShort } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'

interface NavbarProps {
  onMenuClick?: () => void
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { profile, signOut } = useAuth()
  const { isStudentMode, setViewMode } = useViewMode()
  const { isDark, toggle: toggleTheme } = useTheme()
  const navigate = useNavigate()
  const { toast } = useToast()

  const { data: notifications, unreadCount, markAllRead, markOneRead } = useNotifications(
    profile?.role === 'student' || isStudentMode ? profile?.id : undefined
  )

  // Prefetch departments for other parts of the app that may need it
  useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await supabase.from('departments').select('id, name').order('name')
      return data || []
    },
  })

  const handleModeSwitch = () => {
    if (isStudentMode) {
      setViewMode('management')
      navigate(ROLE_ROUTES[profile!.role])
      return
    }
    // All users must have department_id set at account creation — no picker ever shown
    if (!profile?.department_id) {
      toast({
        title: 'No department assigned',
        description: 'Your account has no department linked. Contact a developer to fix this.',
        variant: 'destructive',
      })
      return
    }
    setViewMode('student')
    navigate('/dashboard')
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  const dashboardRoute = profile ? ROLE_ROUTES[profile.role] : '/login'

  return (
    <header className="sticky top-0 z-40 h-16 bg-white dark:bg-gray-900 border-b border-brand-border flex items-center px-4 gap-4">
      <Button variant="ghost" size="icon" className="lg:hidden text-brand-grey" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

      <Link to={dashboardRoute} className="flex items-center gap-2 font-bold text-brand-primary text-lg">
        <div className="w-7 h-7 rounded-full bg-brand-primary flex items-center justify-center">
          <span className="text-white text-xs font-bold">P</span>
        </div>
        <span className="hidden sm:block">PreMed Connect</span>
      </Link>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {/* PWA install */}
        <InstallPWA variant="icon" />

        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-brand-grey hover:text-brand-primary hover:bg-brand-pale transition-colors"
        >
          {isDark ? <Sun className="h-4.5 w-4.5 h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>

        {/* Mode switcher — shown for all non-student roles */}
        {profile && profile.role !== 'student' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleModeSwitch}
            className="hidden sm:flex items-center gap-1.5 text-xs border-brand-border"
          >
            {isStudentMode ? (
              <><LayoutDashboard className="h-3.5 w-3.5" /> Exit Student Mode</>
            ) : (
              <><GraduationCap className="h-3.5 w-3.5" /> Student View</>
            )}
          </Button>
        )}

        {/* Notification bell — shown for students and special roles in student mode */}
        {(profile?.role === 'student' || isStudentMode) && (
          <DropdownMenu onOpenChange={open => { if (open) markAllRead() }}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative text-brand-grey">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-red-500 text-white border-0">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                {unreadCount > 0 && <span className="text-xs font-normal text-brand-grey">{unreadCount} unread</span>}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {!notifications?.length ? (
                <div className="py-6 text-center text-sm text-brand-grey">No notifications</div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {notifications.slice(0, 15).map(n => (
                    <DropdownMenuItem
                      key={n.id}
                      className={`flex flex-col items-start gap-0.5 px-3 py-2.5 cursor-pointer ${!n.is_read ? 'bg-brand-pale/60' : ''}`}
                      onClick={() => { if (!n.is_read) markOneRead(n.id) }}
                    >
                      <div className="flex items-center gap-2 w-full">
                        {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-brand-primary shrink-0" />}
                        <span className={`text-sm font-medium text-brand-text ${n.is_read ? 'pl-3.5' : ''}`}>{n.title}</span>
                      </div>
                      <p className="text-xs text-brand-grey line-clamp-2 pl-3.5">{n.message}</p>
                      <p className="text-[10px] text-brand-grey pl-3.5">{formatDateShort(n.created_at)}</p>
                    </DropdownMenuItem>
                  ))}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name} />}
                <AvatarFallback className="bg-brand-pale text-brand-primary text-sm font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-brand-text">{profile?.full_name}</p>
                <p className="text-xs text-brand-grey capitalize">{profile?.role.replace('_', ' ')}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>{profile?.full_name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(profile?.role === 'student' || isStudentMode) && (
              <DropdownMenuItem asChild>
                <Link to="/dashboard/profile" className="flex items-center gap-2">
                  <User className="h-4 w-4" /> Profile
                </Link>
              </DropdownMenuItem>
            )}
            {profile && profile.role !== 'student' && (
              <DropdownMenuItem onClick={handleModeSwitch} className="flex items-center gap-2 sm:hidden">
                {isStudentMode
                  ? <><LayoutDashboard className="h-4 w-4" /> Exit Student Mode</>
                  : <><GraduationCap className="h-4 w-4" /> Switch to Student View</>}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={signOut} className="text-red-600 focus:text-red-600 flex items-center gap-2">
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
