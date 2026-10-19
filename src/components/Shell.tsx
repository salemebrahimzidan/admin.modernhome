import {
  BadgeCheck,
  Folders,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Warehouse,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth'

const links = [
  { to: '/', label: 'المؤشرات', icon: LayoutDashboard, end: true },
  { to: '/categories', label: 'الأقسام', icon: Folders, end: false },
  { to: '/products', label: 'المنتجات', icon: Package, end: false },
  { to: '/inventory', label: 'المخزون', icon: Warehouse, end: false },
  { to: '/orders', label: 'الطلبات', icon: ShoppingBag, end: false },
  { to: '/payments', label: 'المدفوعات', icon: BadgeCheck, end: false },
]

export default function Shell() {
  const { session, signOut } = useAuth()

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="bg-[#121826] text-white md:min-h-screen">
        <div className="px-5 py-5">
          <p className="text-lg font-semibold tracking-tight">Modern Home</p>
          <p className="text-xs text-white/60">لوحة إدارة المتجر</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:block md:space-y-1 md:px-3">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                [
                  'flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm',
                  isActive ? 'bg-white text-[#121826]' : 'text-white/75 hover:bg-white/10',
                ].join(' ')
              }
            >
              <link.icon size={16} />
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#e7ebf0] bg-white/90 px-4 py-3 backdrop-blur md:px-8">
          <p className="truncate text-sm text-[#667085]">{session?.user.email}</p>
          <button
            type="button"
            className="rounded-xl border border-[#e7ebf0] px-3 py-1.5 text-sm hover:bg-[#f3f5f8]"
            onClick={() => void signOut()}
          >
            خروج
          </button>
        </header>
        <main className="px-4 py-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
