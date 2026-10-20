import {
  BadgeCheck,
  Folders,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Warehouse,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../auth'

const links = [
  { to: '/', label: 'المؤشرات', icon: LayoutDashboard, end: true },
  { to: '/categories', label: 'الأقسام', icon: Folders, end: false },
  { to: '/products', label: 'المنتجات', icon: Package, end: false },
  { to: '/inventory', label: 'المخزون', icon: Warehouse, end: false },
  { to: '/orders', label: 'الطلبات', icon: ShoppingBag, end: false },
  { to: '/payments', label: 'المدفوعات', icon: BadgeCheck, end: false },
]

export function AppFrame({
  email,
  onSignOut,
  children,
}: {
  email?: string
  onSignOut: () => void
  children: ReactNode
}) {
  return (
    <div className="app-shell min-h-dvh md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="flex flex-col bg-[#121826] text-white md:sticky md:top-0 md:h-dvh print:hidden">
        <div className="px-5 py-5">
          <p className="text-lg font-semibold tracking-tight">Modern Home</p>
          <p className="text-xs text-white/60">لوحة إدارة المتجر</p>
        </div>
        <nav className="grid grid-cols-6 gap-1 px-3 pb-3 md:block md:min-h-0 md:flex-1 md:space-y-1 md:overflow-y-auto md:px-3 md:pb-0">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              title={link.label}
              className={({ isActive }) =>
                [
                  'flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1.5 text-[10px] leading-3 md:flex-row md:justify-start md:gap-2 md:px-3 md:py-2 md:text-sm md:leading-normal',
                  isActive ? 'bg-white text-[#121826]' : 'text-white/75 hover:bg-white/10',
                ].join(' ')
              }
            >
              <link.icon size={18} className="shrink-0" />
              <span className="max-w-full text-center">{link.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3 md:block">
          <p className="truncate text-xs text-white/60">{email}</p>
          <button
            type="button"
            className="shrink-0 rounded-xl bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15 md:mt-3 md:w-full"
            onClick={onSignOut}
          >
            خروج
          </button>
        </div>
      </aside>
      <main className="min-w-0 w-full px-4 py-6 md:px-6">{children}</main>
    </div>
  )
}

export default function Shell() {
  const { session, signOut } = useAuth()
  return (
    <AppFrame email={session?.user.email} onSignOut={() => void signOut()}>
      <Outlet />
    </AppFrame>
  )
}
