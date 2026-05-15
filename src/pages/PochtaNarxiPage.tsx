import { useCallback, useEffect, useState } from 'react'
import { Truck, Info } from 'lucide-react'
import { Card, CardSubtitle, CardTitle } from '../components/ui/Card'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { AppSettingRow } from '../types/database.types'

const DEFAULTS = {
  shipping_cost_tashkent: 15000,
  shipping_cost_regions: 25000,
  free_shipping_min: 200000,
}

const SETTING_KEYS = [
  'shipping_cost',
  'shipping_cost_tashkent',
  'shipping_cost_regions',
  'free_shipping_min',
] as const

function parseNumeric(value: unknown, fallback: number): number {
  if (value == null) return fallback
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number(value)
    if (!Number.isNaN(n)) return n
  }
  return fallback
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('uz-UZ').format(n)
}

export default function PochtaNarxiPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [costTashkent, setCostTashkent] = useState<string>('')
  const [costRegions, setCostRegions] = useState<string>('')
  const [freeShippingMin, setFreeShippingMin] = useState<string>('')
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: e } = await supabase
      .from('app_settings')
      .select('*')
      .in('key', [...SETTING_KEYS])
    setLoading(false)
    if (e) {
      setError(e.message)
      return
    }
    const rows = (data as AppSettingRow[]) ?? []
    const by = (k: string) => rows.find((r) => r.key === k)
    const legacy = parseNumeric(by('shipping_cost')?.value, DEFAULTS.shipping_cost_tashkent)
    setCostTashkent(
      String(
        parseNumeric(by('shipping_cost_tashkent')?.value, legacy)
      )
    )
    setCostRegions(
      String(
        parseNumeric(by('shipping_cost_regions')?.value, legacy)
      )
    )
    setFreeShippingMin(
      String(parseNumeric(by('free_shipping_min')?.value, DEFAULTS.free_shipping_min))
    )
    const latest = SETTING_KEYS.map((k) => by(k)?.updated_at)
      .filter(Boolean)
      .sort()
      .pop()
    setUpdatedAt((latest as string | undefined) ?? null)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function save() {
    if (!supabase || !isSupabaseConfigured) {
      setError('Supabase sozlanmagan')
      return
    }
    const t = Number(costTashkent)
    const r = Number(costRegions)
    const fm = Number(freeShippingMin)
    if (!Number.isFinite(t) || t < 0) {
      setError("Toshkent shahri narxi 0 dan kichik bo'lmasligi kerak")
      return
    }
    if (!Number.isFinite(r) || r < 0) {
      setError("Viloyatlar narxi 0 dan kichik bo'lmasligi kerak")
      return
    }
    if (!Number.isFinite(fm) || fm < 0) {
      setError("Tekin yetkazib berish chegarasi 0 dan kichik bo'lmasligi kerak")
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    // shipping_cost — eski integratsiyalar uchun Toshkent shahri bilan bir xil saqlanadi
    const { error: e } = await supabase.from('app_settings').upsert(
      [
        { key: 'shipping_cost', value: t },
        { key: 'shipping_cost_tashkent', value: t },
        { key: 'shipping_cost_regions', value: r },
        { key: 'free_shipping_min', value: fm },
      ],
      { onConflict: 'key' }
    )
    setSaving(false)
    if (e) {
      setError(e.message)
      return
    }
    setSuccess('Sozlamalar saqlandi')
    void load()
    setTimeout(() => setSuccess(null), 2500)
  }

  const previewT = parseNumeric(costTashkent, DEFAULTS.shipping_cost_tashkent)
  const previewR = parseNumeric(costRegions, DEFAULTS.shipping_cost_regions)
  const previewFm = parseNumeric(freeShippingMin, DEFAULTS.free_shipping_min)

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 text-xl font-bold">
          <Truck className="h-5 w-5 text-[rgb(var(--primary))]" />
          Pochta (yetkazib berish) narxi
        </div>
        <div className="mt-1 text-sm text-gray-500">
          Toshkent shahri va boshqa viloyatlar uchun alohida yetkazib berish narxlari, shuningdek
          tekin yetkazib berish chegarasi. O‘zgarishlar serverda trigger orqali hisoblanadi.
        </div>
      </div>

      {!isSupabaseConfigured && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          Supabase .env da sozlanmagan. Sozlamalarni saqlash uchun DB ulang.
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-200">
          {success}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Zonalar bo‘yicha narxlar</CardTitle>
          <CardSubtitle>Toshkent shahri / viloyatlar</CardSubtitle>

          {loading ? (
            <div className="mt-4 rounded-2xl bg-gray-50 p-6 text-sm text-gray-600">
              Yuklanmoqda…
            </div>
          ) : (
            <div className="mt-4 grid gap-4">
              <label className="text-xs font-medium text-gray-600">
                Toshkent shahri — yetkazib berish (so'm) *
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={costTashkent}
                  onChange={(e) => setCostTashkent(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-[rgb(var(--primary))]"
                  placeholder="15000"
                />
                <span className="mt-1 block text-[11px] text-gray-500">
                  Mijoz manzilida «Toshkent shahri» tanlangan bo‘lsa shu narx qo‘llanadi.
                </span>
              </label>

              <label className="text-xs font-medium text-gray-600">
                Viloyatlar — yetkazib berish (so'm) *
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={costRegions}
                  onChange={(e) => setCostRegions(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-[rgb(var(--primary))]"
                  placeholder="25000"
                />
                <span className="mt-1 block text-[11px] text-gray-500">
                  Toshkent viloyati va boshqa barcha viloyatlar shu tarif bo‘yicha.
                </span>
              </label>

              <label className="text-xs font-medium text-gray-600">
                Tekin yetkazib berish chegarasi (so'm) *
                <input
                  type="number"
                  min={0}
                  step={10000}
                  value={freeShippingMin}
                  onChange={(e) => setFreeShippingMin(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-[rgb(var(--primary))]"
                  placeholder="200000"
                />
                <span className="mt-1 block text-[11px] text-gray-500">
                  Chegirmadan keyingi buyurtma summasi shu miqdordan oshsa, yetkazib berish bepul. 0 — hech qachon bepul emas.
                </span>
              </label>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={saving || !isSupabaseConfigured}
                  onClick={() => void save()}
                  className="rounded-xl bg-[rgb(var(--primary))] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60"
                >
                  {saving ? 'Saqlanmoqda…' : 'Saqlash'}
                </button>
                <button
                  type="button"
                  disabled={saving || loading}
                  onClick={() => void load()}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60"
                >
                  Bekor qilish
                </button>
                {updatedAt && (
                  <span className="text-xs text-gray-500">
                    Oxirgi yangilanish:{' '}
                    {new Date(updatedAt).toLocaleString('uz-UZ', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Hozirgi qoida</CardTitle>
          <CardSubtitle>Mijoz uchun namuna</CardSubtitle>
          <div className="mt-4 grid gap-3 text-sm">
            <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
              <div>
                <div className="font-semibold text-emerald-900">Bepul yetkazib berish</div>
                <div className="text-emerald-800">
                  Chegirmadan keyin buyurtma summasi{' '}
                  <b>{formatCurrency(previewFm)} so'm</b> yoki undan ko'p bo'lsa.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-sky-50 p-3 ring-1 ring-sky-100">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-800" />
              <div>
                <div className="font-semibold text-sky-900">Toshkent shahri</div>
                <div className="text-sky-900">
                  Aks holda <b>{formatCurrency(previewT)} so'm</b>.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-100">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div>
                <div className="font-semibold text-amber-900">Viloyatlar</div>
                <div className="text-amber-800">
                  Aks holda <b>{formatCurrency(previewR)} so'm</b>.
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Yakuniy summa har doim DB trigger (`aa_orders_recompute_total`) orqali hisoblanadi.
              Mijoz buyurtmada viloyatni tanlaydi; `delivery_region` ustuniga yoziladi.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
