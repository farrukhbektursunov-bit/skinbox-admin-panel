import { Bell, CalendarDays, LogOut, Menu, Search } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'

interface TopbarProps {
  onMenuClick: () => void
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const today = format(new Date(), 'dd MMM, yyyy')
  const { user, profile, signOut } = useAuth()
  const initial =
    (profile?.full_name?.trim()?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()

  return (
    <header className="flex flex-wrap items-center gap-2 rounded-2xl bg-white px-3 py-3 shadow-sm ring-1 ring-black/5 sm:gap-3 sm:px-5 sm:py-4">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Menyu"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="order-3 w-full min-w-0 flex-1 basis-full sm:order-2 sm:basis-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Qidirish..."
            className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm outline-none focus:border-[rgb(var(--primary))] focus:bg-white"
          />
        </div>
      </div>

      <div className="order-2 ml-auto flex items-center gap-2 sm:order-3 sm:gap-3">
        <div className="hidden text-right text-xs text-gray-500 md:block">
          <div className="font-medium text-gray-800">{profile?.full_name || 'Admin'}</div>
          <div className="max-w-[180px] truncate">{user?.email}</div>
        </div>
        <div className="hidden items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm md:flex">
          <CalendarDays className="h-4 w-4 text-gray-500" />
          <span className="text-gray-700">{today}</span>
        </div>
        <button
          type="button"
          className="hidden h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 sm:inline-flex"
          aria-label="Bildirishnomalar"
        >
          <Bell className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => void signOut()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
          aria-label="Chiqish"
        >
          <LogOut className="h-4 w-4" />
        </button>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--primary))] text-sm font-semibold text-white">
          {initial}
        </div>
      </div>
    </header>
  )
}
