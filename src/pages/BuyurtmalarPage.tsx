import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Card, CardSubtitle, CardTitle } from '../components/ui/Card'
import { supabase } from '../lib/supabase'
import type { OrderRow, OrderStatus } from '../types/database.types'

const STATUSES: { value: OrderStatus; label: string }[] = [
  { value: 'pending', label: 'Kutilmoqda' },
  { value: 'confirmed', label: 'Tasdiqlangan' },
  { value: 'delivering', label: 'Yetkazilmoqda' },
  { value: 'delivered', label: 'Yetkazilgan' },
  { value: 'cancelled', label: 'Bekor' },
]

function formatMoney(n: number) {
  return new Intl.NumberFormat('uz-UZ').format(n) + ' so‘m'
}

function itemsPreview(items: unknown): string {
  if (items == null) return '—'
  if (Array.isArray(items)) {
    return items
      .map((it) => {
        if (it && typeof it === 'object' && 'product_name' in it)
          return String((it as { product_name?: string }).product_name ?? '')
        if (it && typeof it === 'object' && 'name' in it)
          return String((it as { name?: string }).name ?? '')
        return JSON.stringify(it)
      })
      .filter(Boolean)
      .join(', ')
  }
  try {
    return JSON.stringify(items)
  } catch {
    return String(items)
  }
}

export default function BuyurtmalarPage() {
  const [rows, setRows] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError(null)
    const { data, error: e } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    setLoading(false)
    if (e) {
      setError(e.message)
      return
    }
    setRows((data as OrderRow[]) ?? [])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function setStatus(id: string, status: OrderStatus) {
    if (!supabase) return
    const { error: e } = await supabase.from('orders').update({ status }).eq('id', id)
    if (e) {
      setError(e.message)
      return
    }
    void load()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xl font-bold">Buyurtmalar</div>
          <div className="mt-1 text-sm text-gray-500">
            Jami:{' '}
            <span className="font-semibold">{loading ? '…' : `${rows.length} ta`}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
          {error}
        </div>
      )}

      <Card>
        <CardTitle>Ro‘yxat</CardTitle>
        <CardSubtitle>Supabase `orders` — admin RLS kerak</CardSubtitle>
        <div className="mt-4 overflow-x-auto">
          {loading ? (
            <div className="rounded-2xl bg-gray-50 p-6 text-sm text-gray-600">Yuklanmoqda…</div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl bg-gray-50 p-6 text-sm text-gray-600">
              Buyurtma yo‘q.
            </div>
          ) : (
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium text-gray-500">
                  <th className="py-2 pr-2">Sana</th>
                  <th className="py-2 pr-2">Mijoz</th>
                  <th className="py-2 pr-2">Telefon</th>
                  <th className="py-2 pr-2">Mahsulotlar</th>
                  <th className="py-2 pr-2">Jami</th>
                  <th className="py-2 pr-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} className="border-b border-gray-100 align-top">
                    <td className="py-3 pr-2 whitespace-nowrap text-gray-600">
                      {o.created_at
                        ? format(new Date(o.created_at), 'dd.MM.yyyy HH:mm')
                        : '—'}
                    </td>
                    <td className="py-3 pr-2">
                      <div className="font-medium text-gray-900">{o.full_name}</div>
                      <div className="mt-0.5 max-w-[200px] text-xs text-gray-500">
                        {o.address}
                      </div>
                    </td>
                    <td className="py-3 pr-2 text-gray-700">{o.phone}</td>
                    <td className="py-3 pr-2 max-w-[240px] text-xs text-gray-600">
                      {itemsPreview(o.items)}
                    </td>
                    <td className="py-3 pr-2 font-medium text-gray-900">
                      {formatMoney(Number(o.total))}
                    </td>
                    <td className="py-3 pr-2">
                      <select
                        value={o.status}
                        onChange={(e) => void setStatus(o.id, e.target.value as OrderStatus)}
                        className="h-9 max-w-[160px] rounded-lg border border-gray-200 bg-white px-2 text-xs"
                      >
                        {STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
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
