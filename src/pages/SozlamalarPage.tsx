import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Store } from 'lucide-react'
import { Card, CardSubtitle, CardTitle } from '../components/ui/Card'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { AppSettingRow } from '../types/database.types'

const SHOP_KEYS = ['shop_name', 'shop_phone'] as const

const DEFAULT_SHOP_NAME = 'SkinBox'

function settingToString(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  try {
    const parsed = typeof v === 'object' ? v : JSON.parse(String(v))
    if (typeof parsed === 'string') return parsed
    if (typeof parsed === 'number') return String(parsed)
  } catch {
    /* ignore */
  }
  return String(v)
}

export default function SozlamalarPage() {
  const [shopName, setShopName] = useState('')
  const [shopPhone, setShopPhone] = useState('')
  const [shopLoading, setShopLoading] = useState(true)
  const [shopSaving, setShopSaving] = useState(false)
  const [shopError, setShopError] = useState<string | null>(null)
  const [shopOk, setShopOk] = useState<string | null>(null)
  const [shopUpdatedAt, setShopUpdatedAt] = useState<string | null>(null)

  const [adminEmail, setAdminEmail] = useState('')
  const [promoteLoading, setPromoteLoading] = useState(false)
  const [promoteError, setPromoteError] = useState<string | null>(null)
  const [promoteOk, setPromoteOk] = useState<string | null>(null)

  const loadShop = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) {
      setShopLoading(false)
      return
    }
    setShopLoading(true)
    setShopError(null)
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .in('key', [...SHOP_KEYS])
    setShopLoading(false)
    if (error) {
      setShopError(error.message)
      return
    }
    const rows = (data as AppSettingRow[]) ?? []
    const by = (k: string) => rows.find((r) => r.key === k)
    setShopName(settingToString(by('shop_name')?.value) || DEFAULT_SHOP_NAME)
    setShopPhone(settingToString(by('shop_phone')?.value))
    const latest = SHOP_KEYS.map((k) => by(k)?.updated_at)
      .filter(Boolean)
      .sort()
      .pop()
    setShopUpdatedAt((latest as string | undefined) ?? null)
  }, [])

  useEffect(() => {
    void loadShop()
  }, [loadShop])

  async function saveShop(e: FormEvent) {
    e.preventDefault()
    if (!supabase || !isSupabaseConfigured) {
      setShopError('Supabase sozlanmagan')
      return
    }
    const name = shopName.trim()
    if (!name) {
      setShopError("Do'kon nomi bo'sh bo'lmasligi kerak")
      return
    }
    setShopSaving(true)
    setShopError(null)
    setShopOk(null)
    const { error } = await supabase.from('app_settings').upsert(
      [
        { key: 'shop_name', value: name },
        { key: 'shop_phone', value: shopPhone.trim() },
      ],
      { onConflict: 'key' }
    )
    setShopSaving(false)
    if (error) {
      setShopError(error.message)
      return
    }
    setShopOk('Saqlandi')
    void loadShop()
    setTimeout(() => setShopOk(null), 2500)
  }

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
          Do‘kon ma’lumotlari va admin panel sozlamalari.
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-[rgb(var(--primary))]" />
            <CardTitle>Do‘kon ma’lumoti</CardTitle>
          </div>
          <CardSubtitle>
            Nomi va aloqa raqami — storefront sarlavhasida ko‘rinadi.
          </CardSubtitle>

          {shopError && (
            <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-200">
              {shopError}
            </div>
          )}
          {shopOk && (
            <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-200">
              {shopOk}
            </div>
          )}

          {shopLoading ? (
            <div className="mt-4 rounded-2xl bg-gray-50 p-6 text-sm text-gray-600">
              Yuklanmoqda…
            </div>
          ) : (
            <form className="mt-4 grid gap-3" onSubmit={saveShop}>
              <label className="text-xs font-medium text-gray-600">
                Do‘kon nomi *
                <input
                  value={shopName}
                  onChange={(ev) => setShopName(ev.target.value)}
                  disabled={shopSaving}
                  className="mt-1 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[rgb(var(--primary))]"
                  placeholder="Do‘kon nomi"
                  maxLength={64}
                />
                <span className="mt-1 block text-[11px] text-gray-500">
                  Storefront header, login va profil sahifalarida ishlatiladi.
                </span>
              </label>

              <label className="text-xs font-medium text-gray-600">
                Telefon
                <input
                  type="tel"
                  value={shopPhone}
                  onChange={(ev) => setShopPhone(ev.target.value)}
                  disabled={shopSaving}
                  className="mt-1 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[rgb(var(--primary))]"
                  placeholder="+998 ..."
                  maxLength={32}
                />
              </label>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={shopSaving || !isSupabaseConfigured}
                  className="rounded-xl bg-[rgb(var(--primary))] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60"
                >
                  {shopSaving ? 'Saqlanmoqda…' : 'Saqlash'}
                </button>
                <button
                  type="button"
                  disabled={shopSaving || shopLoading}
                  onClick={() => void loadShop()}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60"
                >
                  Bekor qilish
                </button>
                {shopUpdatedAt && (
                  <span className="text-xs text-gray-500">
                    Oxirgi yangilanish:{' '}
                    {new Date(shopUpdatedAt).toLocaleString('uz-UZ', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
            </form>
          )}
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
