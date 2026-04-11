import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Home, BookOpen, CreditCard, Calendar, FileText, Inbox, BarChart2, User, AlertCircle, GraduationCap, Trophy } from 'lucide-react'
import { Navbar } from '@/components/shared/Navbar'
import { Sidebar, MobileSidebar } from '@/components/shared/Sidebar'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useAuth } from '@/context/AuthContext'
import { useViewMode } from '@/context/ViewModeContext'
import { ROLE_LABELS } from '@/lib/constants'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Resources', href: '/dashboard/resources', icon: BookOpen },
  { label: 'Payments', href: '/dashboard/payments', icon: CreditCard },
  { label: 'Timetable', href: '/dashboard/timetable', icon: Calendar },
  { label: 'Exams', href: '/dashboard/exams', icon: FileText },
  { label: 'Leaderboard', href: '/dashboard/leaderboard', icon: Trophy },
  { label: 'Inbox', href: '/dashboard/inbox', icon: Inbox },
  { label: 'Results', href: '/dashboard/results', icon: BarChart2 },
  { label: 'Issues', href: '/dashboard/issues', icon: AlertCircle },
  { label: 'Profile', href: '/dashboard/profile', icon: User },
]

export default function StudentLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { profile } = useAuth()
  const { isStudentMode } = useViewMode()
  const isNonStudent = profile?.role !== 'student'

  return (
    <div className="min-h-screen bg-brand-background flex flex-col">
      <Navbar onMenuClick={() => setMobileOpen(true)} />
      {isNonStudent && isStudentMode && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 flex items-center gap-2 text-xs text-amber-800">
          <GraduationCap className="h-3.5 w-3.5 shrink-0" />
          <span>Student View — viewing as student. Your {ROLE_LABELS[profile!.role]} permissions remain active in the background.</span>
        </div>
      )}
      <div className="flex flex-1">
        <Sidebar items={navItems} />
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-72">
            <div className="flex items-center gap-2 p-4 border-b border-brand-border">
              <div className="w-7 h-7 rounded-full bg-brand-primary flex items-center justify-center">
                <span className="text-white text-xs font-bold">P</span>
              </div>
              <span className="font-bold text-brand-primary">PreMed Connect</span>
            </div>
            <MobileSidebar items={navItems} onClose={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
