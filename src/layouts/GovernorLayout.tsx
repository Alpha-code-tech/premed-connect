import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Home, CreditCard, Megaphone, BarChart2, Bell, Building2, AlertCircle } from 'lucide-react'
import { Navbar } from '@/components/shared/Navbar'
import { Sidebar, MobileSidebar } from '@/components/shared/Sidebar'
import { Sheet, SheetContent } from '@/components/ui/sheet'

const navItems = [
  { label: 'Dashboard', href: '/governor', icon: Home },
  { label: 'Departments', href: '/governor/departments', icon: Building2 },
  { label: 'Payments', href: '/governor/payments', icon: CreditCard },
  { label: 'Announcements', href: '/governor/announcements', icon: Megaphone },
  { label: 'Issues', href: '/governor/issues', icon: AlertCircle },
  { label: 'Analytics', href: '/governor/analytics', icon: BarChart2 },
  { label: 'Notifications', href: '/governor/notifications', icon: Bell },
]

export default function GovernorLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

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
