import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { signIn, user, profile, isAdmin, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (loading) return
    if (user && isAdmin) navigate('/', { replace: true })
  }, [loading, user, isAdmin, navigate])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    const { error } = await signIn(email.trim(), password)
    setBusy(false)
    if (error) {
      setErr(error)
      return
    }
  }

  const accessHint =
    user && profile && !isAdmin
      ? 'Bu akkaunt admin emas. Supabase SQL: update public.profiles set role = \'admin\' where id = \'...\';'
      : user && !profile
        ? 'Profil topilmadi. profiles jadvaliga ushbu user uchun qator qo‘shing.'
        : null

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5"
      >
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admin kirish</h1>
          <p className="mt-1 text-sm text-gray-500">SkinBox admin panel</p>
        </div>

        {accessHint && (
          <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
            {accessHint}
          </div>
        )}

        {err && (
          <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-200">
            {err}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600">Email</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-[rgb(var(--primary))]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">Parol</label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-[rgb(var(--primary))]"
          />
        </div>
        <button
          type="submit"
          disabled={busy || loading}
          className="h-10 w-full rounded-xl bg-[rgb(var(--primary))] text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60"
        >
          {busy ? 'Kirilmoqda…' : 'Kirish'}
        </button>
      </form>
    </div>
  )
}
