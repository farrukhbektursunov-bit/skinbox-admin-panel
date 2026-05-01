import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardSubtitle, CardTitle } from '../components/ui/Card'
import { supabase } from '../lib/supabase'
import { withProductStockSqlHint } from '../lib/productStockSchemaHint'
import type { ProductRow } from '../types/database.types'

/** Shu sondan past — “kam qolgan” deb chiqariladi */
const LOW_STOCK_THRESHOLD = 10

export default function OmborPage() {
  const [rows, setRows] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError(null)
    const { data, error: e } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true })
    setLoading(false)
    if (e) {
      setError(withProductStockSqlHint(e.message))
      return
    }
    setRows((data as ProductRow[]) ?? [])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function stockQty(p: ProductRow) {
    return Math.max(0, Math.floor(Number(p.stock_quantity ?? 0)))
  }

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const qa = stockQty(a)
      const qb = stockQty(b)
      if (qa !== qb) return qa - qb
      return (a.name || '').localeCompare(b.name || '', 'uz')
    })
  }, [rows])

  const stats = useMemo(() => {
    let out = 0
    let low = 0
    for (const p of rows) {
      const q = stockQty(p)
      if (q === 0 || p.in_stock === false) out += 1
      else if (q > 0 && q <= LOW_STOCK_THRESHOLD) low += 1
    }
    return { out, low, total: rows.length }
  }, [rows])

  async function toggleStock(p: ProductRow) {
    if (!supabase) return
    const next = !(p.in_stock ?? true)
    const { error: e } = await supabase.from('products').update({ in_stock: next }).eq('id', p.id)
    if (e) {
      setError(withProductStockSqlHint(e.message))
      return
    }
    void load()
  }

  function stockBadge(p: ProductRow) {
    const q = stockQty(p)
    const unavailable = q === 0 || p.in_stock === false
    if (unavailable) {
      return (
        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-800">
          Tugagan / sotuvda emas
        </span>
      )
    }
    if (q <= LOW_STOCK_THRESHOLD) {
      return (
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200">
          Kam qolgan
        </span>
      )
    }
    return (
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
        Yetarli
      </span>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xl font-bold">Ombor</div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
          <span>
            Jami:{' '}
            <span className="font-semibold text-gray-800">{loading ? '…' : `${stats.total} ta`}</span>
          </span>
          <span>
            Kam qolgan (≤{LOW_STOCK_THRESHOLD} dona):{' '}
            <span className="font-semibold text-amber-700">{loading ? '…' : `${stats.low} ta`}</span>
          </span>
          <span>
            Tugagan yoki o‘chirilgan:{' '}
            <span className="font-semibold text-rose-700">{loading ? '…' : `${stats.out} ta`}</span>
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
          {error}
        </div>
      )}

      <Card>
        <CardTitle>Zaxira holati</CardTitle>
        <CardSubtitle>
          Har mahsulot uchun ombordagi dona soni. Ro‘yxat kam qoldan boshlab tartiblangan.
        </CardSubtitle>
        <div className="mt-4 overflow-x-auto">
          {loading ? (
            <div className="rounded-2xl bg-gray-50 p-6 text-sm text-gray-600">Yuklanmoqda…</div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl bg-gray-50 p-6 text-sm text-gray-600">
              Mahsulot yo‘q.
            </div>
          ) : (
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium text-gray-500">
                  <th className="py-2 pr-2">Mahsulot</th>
                  <th className="py-2 pr-2 text-right">Omborda (dona)</th>
                  <th className="py-2 pr-2">Belgi</th>
                  <th className="py-2 pr-2">Katalog</th>
                  <th className="py-2 pr-2">Amal</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((p) => {
                  const q = stockQty(p)
                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-gray-100 ${
                        q <= LOW_STOCK_THRESHOLD && q > 0 && p.in_stock
                          ? 'bg-amber-50/50'
                          : q === 0 || !p.in_stock
                            ? 'bg-rose-50/30'
                            : ''
                      }`}
                    >
                      <td className="py-3 pr-2 font-medium text-gray-900">{p.name}</td>
                      <td className="py-3 pr-2 text-right tabular-nums">
                        <span
                          className={
                            q === 0
                              ? 'text-lg font-bold text-rose-700'
                              : q <= LOW_STOCK_THRESHOLD
                                ? 'text-lg font-bold text-amber-800'
                                : 'text-lg font-semibold text-gray-900'
                          }
                        >
                          {q}
                        </span>
                      </td>
                      <td className="py-3 pr-2">{stockBadge(p)}</td>
                      <td className="py-3 pr-2">
                        {p.in_stock ? (
                          <span className="text-xs text-gray-600">Ko‘rsatilmoqda</span>
                        ) : (
                          <span className="text-xs text-gray-500">Yashirilgan</span>
                        )}
                      </td>
                      <td className="py-3 pr-2">
                        <button
                          type="button"
                          onClick={() => void toggleStock(p)}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50"
                        >
                          {p.in_stock ? 'Katalogdan yashirish' : 'Katalogga qaytarish'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}
