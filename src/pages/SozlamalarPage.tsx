import { useState, type FormEvent } from 'react'
import { Card, CardSubtitle, CardTitle } from '../components/ui/Card'
import { supabase } from '../lib/supabase'

export default function SozlamalarPage() {
  const [adminEmail, setAdminEmail] = useState('')
  const [promoteLoading, setPromoteLoading] = useState(false)
  const [promoteError, setPromoteError] = useState<string | null>(null)
  const [promoteOk, setPromoteOk] = useState<string | null>(null)

  async function promoteToAdmin(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    const email = adminEmail.trim()
    if (!email) {
      setPromoteError('Email kiriting')
      setPromoteOk(null)
      return
    }
    setPromoteLoading(true)
    setPromoteError(null)
    setPromoteOk(null)
    const { error } = await supabase.rpc('promote_user_to_admin_by_email', {
      admin_email: email,
    })
    setPromoteLoading(false)
    if (error) {
      setPromoteError(error.message)
      return
    }
    setPromoteOk(`Admin berildi: ${email}`)
    setAdminEmail('')
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xl font-bold">Sozlamalar</div>
        <div className="mt-1 text-sm text-gray-500">
          Do‘kon va admin panel sozlamalari (keyin to‘liq qilamiz).
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Do‘kon ma’lumoti</CardTitle>
          <CardSubtitle>Nomi, aloqa</CardSubtitle>
          <div className="mt-4 grid gap-3">
            <input
              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[rgb(var(--primary))]"
              placeholder="Do‘kon nomi"
              defaultValue="Parfum Savdo"
            />
            <input
              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[rgb(var(--primary))]"
              placeholder="Telefon"
            />
            <button
              type="button"
              className="w-fit rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
            >
              Saqlash
            </button>
          </div>
        </Card>

        <Card>
          <CardTitle>Admin qo‘shish</CardTitle>
          <CardSubtitle>
            SkinBox bazasi: `profiles` ga `id`, `full_name`, `role` — SQL / seed bilan bir xil
            (`supabase-add-admin-by-email.sql`). Avval Supabase Authentication da user bo‘lishi kerak.
          </CardSubtitle>
          <form className="mt-4 grid gap-3" onSubmit={promoteToAdmin}>
            <input
              type="email"
              autoComplete="email"
              value={adminEmail}
              onChange={(ev) => setAdminEmail(ev.target.value)}
              disabled={promoteLoading}
              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[rgb(var(--primary))]"
              placeholder="admin@example.com"
            />
            {promoteError && (
              <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-200">
                {promoteError}
              </div>
            )}
            {promoteOk && (
              <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-200">
                {promoteOk}
              </div>
            )}
            <button
              type="submit"
              disabled={promoteLoading}
              className="w-fit rounded-xl bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {promoteLoading ? 'Jo‘natilmoqda…' : 'Admin qilish'}
            </button>
            <p className="text-xs text-gray-500">
              Bir marta Supabase SQL Editor da `supabase-promote-admin-rpc.sql` ni ishga tushiring.
            </p>
          </form>
        </Card>
      </div>
    </div>
  )
}

