import { type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { type LucideIcon } from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

interface SidebarProps {
  items: NavItem[]
  children?: ReactNode
}

export function Sidebar({ items, children }: SidebarProps) {
  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-brand-border min-h-full">
      <nav className="flex-1 p-4 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href.endsWith('/') || item.href.split('/').length === 2}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
              isActive
                ? 'bg-brand-pale text-brand-primary'
                : 'text-brand-grey hover:bg-brand-pale/60 hover:text-brand-primary'
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      {children}
    </aside>
  )
}

export function MobileSidebar({ items, onClose }: SidebarProps & { onClose: () => void }) {
  return (
    <nav className="p-3 space-y-1">
      {items.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          end={item.href.endsWith('/') || item.href.split('/').length === 2}
          onClick={onClose}
          className={({ isActive }) => cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors min-h-[48px]',
            isActive
              ? 'bg-brand-pale text-brand-primary'
              : 'text-brand-grey hover:bg-brand-pale/60 hover:text-brand-primary'
          )}
        >
          <item.icon className="h-5 w-5 shrink-0" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
