import { useCallback, useEffect, useMemo, useState } from 'react'
import { Calendar, Package, RefreshCw, ShoppingBag, TrendingUp } from 'lucide-react'
import { Card, CardSubtitle, CardTitle } from '../components/ui/Card'
import { supabase } from '../lib/supabase'

type Period = '7' | '30' | '90' | '365' | 'all'

interface SalesOrderRow {
  id: string
  total: number | string | null
  status: string
  items: unknown
  created_at: string | null
}

interface OrderItem {
  product_id?: string | null
  product_name?: string | null
  name?: string | null
  image?: string | null
  quantity?: number | string | null
  price?: number | string | null
}

/**
 * Sotuv hisobiga kiradigan statuslar.
 * Bekor qilingan buyurtmalarni chiqarib tashlaymiz, qolgan barchasi
 * (pending, awaiting_payment, confirmed, delivering, delivered) sotuv deb sanaladi —
 * shunda admin xom kelayotgan buyurtmalarni ham ko'ra oladi.
 */
const SOLD_STATUSES = new Set([
  'pending',
  'awaiting_payment',
  'confirmed',
  'delivering',
  'delivered',
])

const STATUS_LABEL: Record<string, string> = {
  pending: 'Kutilmoqda',
  awaiting_payment: 'To‘lov kutilmoqda',
  confirmed: 'Tasdiqlangan',
  delivering: 'Yetkazilmoqda',
  delivered: 'Yetkazilgan',
  cancelled: 'Bekor',
}

const PERIOD_OPTIONS: { value: Period; label: string; days: number | null }[] = [
  { value: '7', label: '7 kun', days: 7 },
  { value: '30', label: '30 kun', days: 30 },
  { value: '90', label: '90 kun', days: 90 },
  { value: '365', label: '1 yil', days: 365 },
  { value: 'all', label: 'Barchasi', days: null },
]

function formatMoney(n: number) {
  return new Intl.NumberFormat('uz-UZ').format(Math.round(n)) + ' so‘m'
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('uz-UZ').format(n)
}

function toDayKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function parseItems(raw: unknown): OrderItem[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw as OrderItem[]
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as OrderItem[]) : []
    } catch {
      return []
    }
  }
  return []
}

export default function SotuvlarPage() {
  const [rows, setRows] = useState<SalesOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>('30')
  const [lastFetchAt, setLastFetchAt] = useState<Date | null>(null)

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!supabase) return
    if (opts?.silent) setRefreshing(true)
    else setLoading(true)
    setError(null)
    const { data, error: e } = await supabase
      .from('orders')
      .select('id, total, status, items, created_at')
      .order('created_at', { ascending: false })
    if (opts?.silent) setRefreshing(false)
    else setLoading(false)
    if (e) {
      setError(e.message)
      return
    }
    setRows((data as SalesOrderRow[]) ?? [])
    setLastFetchAt(new Date())
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const periodDays = useMemo(
    () => PERIOD_OPTIONS.find((p) => p.value === period)?.days ?? null,
    [period]
  )

  /** Tanlangan davrga tushadigan, “sotilgan” statusdagi buyurtmalar */
  const soldInPeriod = useMemo(() => {
    const now = new Date()
    const from = periodDays
      ? startOfDay(new Date(now.getTime() - (periodDays - 1) * 86400000))
      : null
    return rows.filter((r) => {
      if (!SOLD_STATUSES.has(r.status)) return false
      if (!from) return true
      if (!r.created_at) return false
      return new Date(r.created_at) >= from
    })
  }, [rows, periodDays])

  /** Bugun, 7 kun, 30 kun bo‘yicha “sotilgan” buyurtmalar daromadi */
  const quickStats = useMemo(() => {
    const now = new Date()
    const today = startOfDay(now)
    const last7 = new Date(today.getTime() - 6 * 86400000)
    const last30 = new Date(today.getTime() - 29 * 86400000)

    let todaySum = 0
    let last7Sum = 0
    let last30Sum = 0
    let todayCount = 0
    let last7Count = 0
    let last30Count = 0

    for (const r of rows) {
      if (!SOLD_STATUSES.has(r.status)) continue
      if (!r.created_at) continue
      const d = new Date(r.created_at)
      const total = Number(r.total ?? 0)
      if (d >= today) {
        todaySum += total
        todayCount += 1
      }
      if (d >= last7) {
        last7Sum += total
        last7Count += 1
      }
      if (d >= last30) {
        last30Sum += total
        last30Count += 1
      }
    }
    return { todaySum, last7Sum, last30Sum, todayCount, last7Count, last30Count }
  }, [rows])

  /** Tanlangan davr uchun jami */
  const periodStats = useMemo(() => {
    let sum = 0
    let count = 0
    let itemCount = 0
    for (const r of soldInPeriod) {
      sum += Number(r.total ?? 0)
      count += 1
      for (const it of parseItems(r.items)) {
        const q = Number(it.quantity ?? 1)
        if (Number.isFinite(q) && q > 0) itemCount += q
      }
    }
    const avg = count > 0 ? sum / count : 0
    return { sum, count, itemCount, avg }
  }, [soldInPeriod])

  /** Kunlik bar chart uchun ma’lumot */
  const dailySeries = useMemo(() => {
    const days = periodDays ?? 30
    const today = startOfDay(new Date())
    const buckets = new Map<string, { date: Date; sum: number; count: number }>()
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(today.getTime() - i * 86400000)
      buckets.set(toDayKey(d), { date: d, sum: 0, count: 0 })
    }
    for (const r of soldInPeriod) {
      if (!r.created_at) continue
      const key = toDayKey(new Date(r.created_at))
      const b = buckets.get(key)
      if (!b) continue
      b.sum += Number(r.total ?? 0)
      b.count += 1
    }
    return Array.from(buckets.values())
  }, [soldInPeriod, periodDays])

  /** Tanlangan davrdagi BARCHA buyurtmalarni status bo‘yicha guruhlash */
  const statusBreakdown = useMemo(() => {
    const now = new Date()
    const from = periodDays
      ? startOfDay(new Date(now.getTime() - (periodDays - 1) * 86400000))
      : null
    const map = new Map<string, { count: number; sum: number }>()
    for (const r of rows) {
      if (from && r.created_at && new Date(r.created_at) < from) continue
      if (from && !r.created_at) continue
      const k = r.status || 'unknown'
      const cur = map.get(k) ?? { count: 0, sum: 0 }
      cur.count += 1
      cur.sum += Number(r.total ?? 0)
      map.set(k, cur)
    }
    return Array.from(map.entries())
      .map(([status, v]) => ({ status, ...v }))
      .sort((a, b) => b.count - a.count)
  }, [rows, periodDays])

  /** Eng ko‘p sotilgan mahsulotlar (sotilgan statusdagi buyurtmalardan) */
  const topProducts = useMemo(() => {
    const map = new Map<
      string,
      { name: string; image: string | null; qty: number; revenue: number }
    >()
    for (const r of soldInPeriod) {
      for (const it of parseItems(r.items)) {
        const pid = (it.product_id || it.name || it.product_name || '').toString()
        if (!pid) continue
        const qty = Math.max(1, Number(it.quantity ?? 1) || 1)
        const price = Number(it.price ?? 0) || 0
        const cur = map.get(pid) ?? {
          name: it.product_name || it.name || 'Mahsulot',
          image: it.image || null,
          qty: 0,
          revenue: 0,
        }
        cur.qty += qty
        cur.revenue += price * qty
        map.set(pid, cur)
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
  }, [soldInPeriod])

  const maxDaily = useMemo(
    () => dailySeries.reduce((m, d) => Math.max(m, d.sum), 0),
    [dailySeries]
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xl font-bold">Sotuvlar</div>
          <div className="mt-1 text-sm text-gray-500">
            Manba: <span className="font-medium text-gray-700">orders</span> jadvali —{' '}
            <span className="font-semibold text-gray-700">
              {loading ? '…' : `${formatNumber(rows.length)} ta yozuv`}
            </span>
            {lastFetchAt ? (
              <span className="ml-2 text-xs text-gray-400">
                ({lastFetchAt.toLocaleTimeString('uz-UZ')})
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 text-xs text-gray-400">
            Sotuvga `cancelled` dan tashqari barcha statuslar kiradi.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void load({ silent: true })}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-black/10 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
            />
            Yangilash
          </button>
          <div className="inline-flex items-center gap-1 rounded-xl bg-gray-100 p-1">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPeriod(opt.value)}
                className={
                  period === opt.value
                    ? 'rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-sm ring-1 ring-black/5'
                    : 'rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900'
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          subtitle="Bugun"
          title="Kunlik sotuv"
          value={loading ? '…' : formatMoney(quickStats.todaySum)}
          hint={loading ? '' : `${formatNumber(quickStats.todayCount)} ta buyurtma`}
          icon={<Calendar className="h-5 w-5 text-gray-600" />}
        />
        <StatCard
          subtitle="So‘nggi 7 kun"
          title="Haftalik sotuv"
          value={loading ? '…' : formatMoney(quickStats.last7Sum)}
          hint={loading ? '' : `${formatNumber(quickStats.last7Count)} ta buyurtma`}
          icon={<TrendingUp className="h-5 w-5 text-gray-600" />}
        />
        <StatCard
          subtitle="So‘nggi 30 kun"
          title="Oylik sotuv"
          value={loading ? '…' : formatMoney(quickStats.last30Sum)}
          hint={loading ? '' : `${formatNumber(quickStats.last30Count)} ta buyurtma`}
          icon={<ShoppingBag className="h-5 w-5 text-gray-600" />}
        />
        <StatCard
          subtitle={`Tanlangan davr (${PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? ''})`}
          title="Jami sotuv"
          value={loading ? '…' : formatMoney(periodStats.sum)}
          hint={
            loading
              ? ''
              : `${formatNumber(periodStats.count)} ta buyurtma · ${formatNumber(periodStats.itemCount)} ta mahsulot`
          }
          icon={<Package className="h-5 w-5 text-gray-600" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Kunlik sotuv (so‘m)</CardTitle>
              <CardSubtitle>
                {periodDays
                  ? `So‘nggi ${periodDays} kun`
                  : 'Barcha vaqt (oxirgi 30 kun ko‘rsatildi)'}
              </CardSubtitle>
            </div>
            <div className="text-right text-xs text-gray-500">
              <div>O‘rtacha chek</div>
              <div className="text-sm font-semibold text-gray-800">
                {loading ? '…' : formatMoney(periodStats.avg)}
              </div>
            </div>
          </div>
          <div className="mt-4">
            {loading ? (
              <div className="h-[240px] animate-pulse rounded-2xl bg-gray-50" />
            ) : maxDaily <= 0 ? (
              <div className="flex h-[240px] items-center justify-center rounded-2xl bg-gray-50 text-sm text-gray-500 ring-1 ring-black/5">
                Tanlangan davrda sotuv yo‘q
              </div>
            ) : (
              <DailyBarChart series={dailySeries} max={maxDaily} />
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>Status bo‘yicha</CardTitle>
          <CardSubtitle>Tanlangan davr</CardSubtitle>
          <div className="mt-4 space-y-2">
            {loading ? (
              <div className="h-[160px] animate-pulse rounded-2xl bg-gray-50" />
            ) : statusBreakdown.length === 0 ? (
              <div className="rounded-2xl bg-gray-50 p-6 text-sm text-gray-600">
                Buyurtma yo‘q.
              </div>
            ) : (
              statusBreakdown.map((s) => (
                <div
                  key={s.status}
                  className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2 ring-1 ring-black/5"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900">
                      {STATUS_LABEL[s.status] ?? s.status}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatNumber(s.count)} ta buyurtma
                    </div>
                  </div>
                  <div className="text-right text-sm font-semibold text-gray-800">
                    {formatMoney(s.sum)}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Eng ko‘p sotilgan mahsulotlar</CardTitle>
            <CardSubtitle>Tanlangan davr — sotilgan buyurtmalar bo‘yicha</CardSubtitle>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          {loading ? (
            <div className="rounded-2xl bg-gray-50 p-6 text-sm text-gray-600">
              Yuklanmoqda…
            </div>
          ) : topProducts.length === 0 ? (
            <div className="rounded-2xl bg-gray-50 p-6 text-sm text-gray-600">
              Sotilgan mahsulot yo‘q.
            </div>
          ) : (
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium text-gray-500">
                  <th className="py-2 pr-2">#</th>
                  <th className="py-2 pr-2">Mahsulot</th>
                  <th className="py-2 pr-2 text-right">Soni</th>
                  <th className="py-2 pr-2 text-right">Daromad</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, idx) => (
                  <tr key={p.name + idx} className="border-b border-gray-100">
                    <td className="py-3 pr-2 text-gray-500">{idx + 1}</td>
                    <td className="py-3 pr-2">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 overflow-hidden rounded-lg bg-gray-50 ring-1 ring-black/5">
                          {p.image ? (
                            <img
                              src={p.image}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="font-medium text-gray-900 line-clamp-2">
                          {p.name}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-2 text-right font-medium text-gray-800">
                      {formatNumber(p.qty)} dona
                    </td>
                    <td className="py-3 pr-2 text-right font-semibold text-gray-900">
                      {formatMoney(p.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}

function StatCard({
  subtitle,
  title,
  value,
  hint,
  icon,
}: {
  subtitle: string
  title: string
  value: string
  hint: string
  icon: React.ReactNode
}) {
  return (
    <Card className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <CardSubtitle>{subtitle}</CardSubtitle>
        <CardTitle>{title}</CardTitle>
        <div className="mt-3 truncate text-2xl font-bold">{value}</div>
        {hint ? <div className="mt-1 text-xs text-gray-500">{hint}</div> : null}
      </div>
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gray-50 ring-1 ring-black/5">
        {icon}
      </div>
    </Card>
  )
}

function DailyBarChart({
  series,
  max,
}: {
  series: { date: Date; sum: number; count: number }[]
  max: number
}) {
  const height = 220
  const barGap = 2
  const labelEveryN = Math.max(1, Math.ceil(series.length / 8))

  return (
    <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-black/5">
      <div className="flex h-[200px] items-end gap-[2px]" style={{ minHeight: height - 20 }}>
        {series.map((d, i) => {
          const ratio = max > 0 ? d.sum / max : 0
          const barH = Math.max(d.sum > 0 ? 4 : 0, Math.round(ratio * (height - 40)))
          return (
            <div
              key={toDayKey(d.date)}
              className="group relative flex flex-1 flex-col items-center justify-end"
              style={{ marginRight: i < series.length - 1 ? barGap : 0 }}
            >
              <div
                className="w-full rounded-t bg-gray-900/80 transition group-hover:bg-gray-900"
                style={{ height: `${barH}px` }}
              />
              <div className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2 py-1 text-[10px] text-white opacity-0 shadow group-hover:opacity-100">
                <div className="font-semibold">{formatMoney(d.sum)}</div>
                <div className="text-[9px] text-gray-300">
                  {d.date.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' })} ·{' '}
                  {d.count} buyurtma
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-gray-500">
        {series.map((d, i) =>
          i % labelEveryN === 0 || i === series.length - 1 ? (
            <span key={toDayKey(d.date)}>
              {d.date.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit' })}
            </span>
          ) : (
            <span key={toDayKey(d.date)} className="opacity-0">
              .
            </span>
          )
        )}
      </div>
    </div>
  )
}
