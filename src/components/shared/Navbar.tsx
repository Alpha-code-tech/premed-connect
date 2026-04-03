import { useState } from 'react'
import { Bell, Menu, LogOut, User, GraduationCap, LayoutDashboard } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useViewMode } from '@/context/ViewModeContext'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ROLE_ROUTES } from '@/lib/constants'
import { useNotifications } from '@/hooks/useNotifications'
import { formatDateShort } from '@/lib/utils'

interface NavbarProps {
  onMenuClick?: () => void
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { profile, signOut } = useAuth()
  const { viewMode, setViewMode, isStudentMode, studentDepartmentId, setStudentDepartmentId } = useViewMode()
  const navigate = useNavigate()
  const [deptPickerOpen, setDeptPickerOpen] = useState(false)
  const [pickedDept, setPickedDept] = useState<string>('')

  const { data: notifications, unreadCount, markAllRead, markOneRead } = useNotifications(
    profile?.role === 'student' || isStudentMode ? profile?.id : undefined
  )

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await supabase.from('departments').select('id, name').order('name')
      return data || []
    },
    enabled: !!profile && profile.role !== 'student',
  })

  const handleModeSwitch = () => {
    if (isStudentMode) {
      setViewMode('management')
      navigate(ROLE_ROUTES[profile!.role])
      return
    }
    // If user already has a department, switch directly
    if (profile?.department_id) {
      setViewMode('student')
      navigate('/dashboard')
      return
    }
    // No department — prompt to pick one
    setPickedDept(studentDepartmentId ?? '')
    setDeptPickerOpen(true)
  }

  const confirmDeptAndSwitch = () => {
    if (!pickedDept) return
    setStudentDepartmentId(pickedDept)
    setDeptPickerOpen(false)
    setViewMode('student')
    navigate('/dashboard')
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  const dashboardRoute = profile ? ROLE_ROUTES[profile.role] : '/login'

  return (
    <>
      <header className="sticky top-0 z-40 h-16 bg-white border-b border-brand-border flex items-center px-4 gap-4">
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
          {/* Mode switcher — only for non-student roles */}
          {profile && profile.role !== 'student' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleModeSwitch}
              className="hidden sm:flex items-center gap-1.5 text-xs border-brand-border"
            >
              {isStudentMode ? (
                <><LayoutDashboard className="h-3.5 w-3.5" /> Management</>
              ) : (
                <><GraduationCap className="h-3.5 w-3.5" /> Student View</>
              )}
            </Button>
          )}

          {/* Notification bell */}
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
                    ? <><LayoutDashboard className="h-4 w-4" /> Switch to Management</>
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

      {/* Department picker dialog — shown when special role switches to student mode without a department */}
      <Dialog open={deptPickerOpen} onOpenChange={setDeptPickerOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Select Your Department</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-brand-grey">
            Choose the department you want to view as a student. This affects resources, issues, and announcements you see.
          </p>
          <Select value={pickedDept} onValueChange={setPickedDept}>
            <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
            <SelectContent>
              {(departments || []).map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeptPickerOpen(false)}>Cancel</Button>
            <Button
              className="bg-brand-primary hover:bg-brand-secondary"
              disabled={!pickedDept}
              onClick={confirmDeptAndSwitch}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
