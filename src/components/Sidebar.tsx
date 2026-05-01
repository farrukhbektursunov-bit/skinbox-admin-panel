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
  Users,
  Warehouse,
} from 'lucide-react'

const items = [
  { to: '/', label: 'Bosh sahifa', icon: LayoutDashboard },
  { to: '/analitika', label: 'Analitika', icon: BarChart3 },
  { to: '/mahsulotlar', label: 'Mahsulotlar', icon: ShoppingBag },
  { to: '/turkum-wa-bolim', label: 'Turkum va bo‘lim', icon: Tags },
  { to: '/aksiyalar', label: 'Aksiyalar', icon: CirclePercent },
  { to: '/ombor', label: 'Ombor', icon: Warehouse },
  { to: '/buyurtmalar', label: 'Buyurtmalar', icon: ClipboardList },
  { to: '/sotuvlar', label: 'Sotuvlar', icon: Box },
  { to: '/mijozlar', label: 'Mijozlar', icon: Users },
  { to: '/xabarnoma', label: 'Xabarnoma', icon: Mail },
  { to: '/sozlamalar', label: 'Sozlamalar', icon: Settings },
]

export default function Sidebar() {
  return (
    <aside className="w-[260px] shrink-0 rounded-2xl bg-[rgb(var(--sidebar))] px-4 py-5 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgb(var(--primary))] text-white">
          <span className="text-sm font-bold">P</span>
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Parfum Savdo</div>
          <div className="text-xs text-[rgb(var(--muted))]">Admin panel</div>
        </div>
      </div>

      <nav className="mt-6 space-y-1">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === '/'}
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
  )
}

