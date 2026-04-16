import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Home, CreditCard } from 'lucide-react'
import { Navbar } from '@/components/shared/Navbar'
import { Sidebar, MobileSidebar } from '@/components/shared/Sidebar'
import { Sheet, SheetContent } from '@/components/ui/sheet'

const navItems = [
  { label: 'Dashboard', href: '/financial', icon: Home },
  { label: 'Payments', href: '/financial/payments', icon: CreditCard },
]

export default function FinancialLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-brand-background flex flex-col overflow-x-hidden">
      <Navbar onMenuClick={() => setMobileOpen(true)} />
      <div className="flex flex-1 min-w-0 overflow-x-hidden">
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
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
