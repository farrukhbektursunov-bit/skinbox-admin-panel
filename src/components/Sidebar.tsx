import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  Box,
  CirclePercent,
  ClipboardList,
  LayoutDashboard,
  Mail,
  Settings,
  ShoppingBag,
  Tags,
  Ticket,
  Truck,
  Users,
  Warehouse,
  X,
} from 'lucide-react'

const items = [
  { to: '/', label: 'Bosh sahifa', icon: LayoutDashboard },
  { to: '/analitika', label: 'Analitika', icon: BarChart3 },
  { to: '/mahsulotlar', label: 'Mahsulotlar', icon: ShoppingBag },
  { to: '/turkum-wa-bolim', label: 'Turkum va bo‘lim', icon: Tags },
  { to: '/aksiyalar', label: 'Aksiyalar', icon: CirclePercent },
  { to: '/kuponlar', label: 'Kuponlar', icon: Ticket },
  { to: '/pochta-narxi', label: 'Pochta narxi', icon: Truck },
  { to: '/ombor', label: 'Ombor', icon: Warehouse },
  { to: '/buyurtmalar', label: 'Buyurtmalar', icon: ClipboardList },
  { to: '/sotuvlar', label: 'Sotuvlar', icon: Box },
  { to: '/mijozlar', label: 'Mijozlar', icon: Users },
  { to: '/xabarnoma', label: 'Xabarnoma', icon: Mail },
  { to: '/sozlamalar', label: 'Sozlamalar', icon: Settings },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobil backdrop */}
      <div
        onClick={onClose}
        aria-hidden
        className={[
          'fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
      />

      {/* Sidebar — mobilda drawer, desktopda inline */}
      <aside
        className={[
          'fixed left-0 top-0 z-50 h-full w-[280px] overflow-y-auto bg-[rgb(var(--sidebar))] p-4 shadow-xl transition-transform',
          'lg:static lg:z-auto lg:h-auto lg:w-[260px] lg:shrink-0 lg:translate-x-0 lg:rounded-2xl lg:px-4 lg:py-5 lg:shadow-sm lg:ring-1 lg:ring-black/5',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-2 px-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgb(var(--primary))] text-white">
              <span className="text-sm font-bold">P</span>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Parfum Savdo</div>
              <div className="text-xs text-[rgb(var(--muted))]">Admin panel</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 hover:bg-white/70 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="mt-6 space-y-1">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition',
                  isActive
                    ? 'bg-white text-[rgb(var(--text))] shadow-sm ring-1 ring-black/5'
                    : 'text-[rgb(var(--text))]/80 hover:bg-white/70 hover:ring-1 hover:ring-black/5',
                ].join(' ')
              }
            >
              <it.icon className="h-4 w-4 opacity-80" />
              <span>{it.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}
