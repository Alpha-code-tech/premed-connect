import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Home, Users, BookOpen, CreditCard, Megaphone, FileText, AlertCircle, Bell } from 'lucide-react'
import { Navbar } from '@/components/shared/Navbar'
import { Sidebar, MobileSidebar } from '@/components/shared/Sidebar'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useAuth } from '@/context/AuthContext'

export default function CourseRepLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { profile } = useAuth()
  const basePath = profile?.role === 'assistant_course_rep' ? '/assistant-rep' : '/course-rep'

  const navItems = [
    { label: 'Dashboard', href: basePath, icon: Home },
    { label: 'My Students', href: `${basePath}/students`, icon: Users },
    { label: 'Resources', href: `${basePath}/resources`, icon: BookOpen },
    { label: 'Payments', href: `${basePath}/payments`, icon: CreditCard },
    { label: 'Announcements', href: `${basePath}/announcements`, icon: Megaphone },
    { label: 'Mock Tests', href: `${basePath}/mock-tests`, icon: FileText },
    { label: 'Issues', href: `${basePath}/issues`, icon: AlertCircle },
    { label: 'Notifications', href: `${basePath}/notifications`, icon: Bell },
  ]

  return (
    <div className="min-h-screen bg-brand-background flex flex-col">
      <Navbar onMenuClick={() => setMobileOpen(true)} />
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
