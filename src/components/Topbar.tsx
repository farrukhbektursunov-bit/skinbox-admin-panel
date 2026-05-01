import { Bell, CalendarDays, LogOut, Search } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'

export default function Topbar() {
  const today = format(new Date(), 'dd MMM, yyyy')
  const { user, profile, signOut } = useAuth()
  const initial =
    (profile?.full_name?.trim()?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-black/5">
      <div className="min-w-[260px] flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Qidirish..."
            className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm outline-none focus:border-[rgb(var(--primary))] focus:bg-white"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right text-xs text-gray-500 sm:block">
          <div className="font-medium text-gray-800">{profile?.full_name || 'Admin'}</div>
          <div className="truncate max-w-[180px]">{user?.email}</div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm">
          <CalendarDays className="h-4 w-4 text-gray-500" />
          <span className="text-gray-700">{today}</span>
        </div>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
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
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgb(var(--primary))] text-sm font-semibold text-white">
          {initial}
        </div>
      </div>
    </header>
  )
}
