import { useCallback, useEffect, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Card, CardSubtitle, CardTitle } from '../components/ui/Card'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { PromotionRow } from '../types/database.types'
import type { ProductRow } from '../types/database.types'

const emptyForm = {
  title: '',
  description: '',
  discount_percent: '',
  product_ids: [] as string[],
  start_at: '',
  end_at: '',
  is_active: true,
}

export default function AksiyalarPage() {
  const [rows, setRows] = useState<PromotionRow[]>([])
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PromotionRow | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) return
    setLoading(true)
    setError(null)
    const [promoRes, prodRes] = await Promise.all([
      supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase.from('products').select('id, name, price').order('name'),
    ])
    setLoading(false)
    if (promoRes.error) {
      setError(promoRes.error.message)
      return
    }
    if (prodRes.error) {
      setError(prodRes.error.message)
      return
    }
    setRows((promoRes.data as PromotionRow[]) ?? [])
    setProducts((prodRes.data as ProductRow[]) ?? [])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(p: PromotionRow) {
    setEditing(p)
    setForm({
      title: p.title,
      description: p.description ?? '',
      discount_percent: String(p.discount_percent),
      product_ids: (p.product_ids ?? []).slice(),
      start_at: p.start_at ? p.start_at.slice(0, 16) : '',
      end_at: p.end_at ? p.end_at.slice(0, 16) : '',
      is_active: p.is_active ?? true,
    })
    setModalOpen(true)
  }

  async function applyPromotionToProducts(
    productIds: string[],
    discountPercent: number
  ) {
    if (!supabase || productIds.length === 0) return
    for (const pid of productIds) {
      const { data: p } = await supabase
        .from('products')
        .select('price')
        .eq('id', pid)
        .single()
      if (p?.price != null) {
        const salePrice = Number(p.price) * (1 - discountPercent / 100)
        await supabase
          .from('products')
          .update({ sale_price: Math.round(salePrice) })
          .eq('id', pid)
      }
    }
  }

  async function clearPromotionFromProducts(productIds: string[]) {
    if (!supabase || productIds.length === 0) return
    await supabase
      .from('products')
      .update({ sale_price: null })
      .in('id', productIds)
  }

  async function savePromotion() {
    if (!supabase || !isSupabaseConfigured) {
      setError('Supabase sozlanmagan')
      return
    }
    const discount = Number(form.discount_percent)
    if (
      !form.title.trim() ||
      Number.isNaN(discount) ||
      discount < 0 ||
      discount > 100
    ) {
      setError("Sarlavha va chegirma foizi (0–100) to'g'ri kiriting")
      return
    }
    if (form.product_ids.length === 0) {
      setError('Kamida bitta mahsulot tanlang')
      return
    }

    setSaving(true)
    setError(null)

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      discount_percent: discount,
      product_ids: form.product_ids,
      start_at: form.start_at ? new Date(form.start_at).toISOString() : null,
      end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
      is_active: form.is_active,
    }

    const oldProductIds = editing?.product_ids ?? []

    if (editing) {
      const { error: e } = await supabase
        .from('promotions')
        .update(payload)
        .eq('id', editing.id)
      if (e) {
        setSaving(false)
        setError(e.message)
        return
      }
      // O'chirilgan mahsulotlardan chegirani olib tashlash
      const removed = oldProductIds.filter((id) => !form.product_ids.includes(id))
      await clearPromotionFromProducts(removed)
    } else {
      const { error: e } = await supabase.from('promotions').insert(payload)
      if (e) {
        setSaving(false)
        setError(e.message)
        return
      }
    }

    // Tanlangan mahsulotlarga chegirmani qo'llash
    if (form.is_active) {
      await applyPromotionToProducts(form.product_ids, discount)
    } else {
      await clearPromotionFromProducts(form.product_ids)
    }

    setSaving(false)
    setModalOpen(false)
    void load()
  }

  async function remove(p: PromotionRow) {
    if (!supabase) return
    if (!confirm(`"${p.title}" aksiyasini o'chirishni tasdiqlaysizmi?`)) return
    const productIds = p.product_ids ?? []
    await clearPromotionFromProducts(productIds)
    const { error: e } = await supabase.from('promotions').delete().eq('id', p.id)
    if (e) {
      setError(e.message)
      return
    }
    void load()
  }

  function toggleProduct(id: string) {
    setForm((f) => ({
      ...f,
      product_ids: f.product_ids.includes(id)
        ? f.product_ids.filter((x) => x !== id)
        : [...f.product_ids, id],
    }))
  }

  const activeCount = rows.filter((r) => r.is_active).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xl font-bold">Aksiyalar</div>
          <div className="mt-1 text-sm text-gray-500">
            Jami:{' '}
            <span className="font-semibold">{loading ? '…' : `${rows.length} ta`}</span>
            {!loading && rows.length > 0 && (
              <> • Faol: {activeCount} ta</>
            )}
          </div>
        </div>
        {isSupabaseConfigured && (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-white hover:brightness-95"
          >
            Aksiya qo'shish
          </button>
        )}
      </div>

      {!isSupabaseConfigured && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          Supabase .env da sozlanmagan. Aksiya yaratish uchun DB ulang.
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
          {error}
        </div>
      )}

      <Card>
        <CardTitle>Joriy aksiyalar</CardTitle>
        <CardSubtitle>Chegirma va kampaniyalar</CardSubtitle>
        <div className="mt-4 overflow-x-auto">
          {loading ? (
            <div className="rounded-2xl bg-gray-50 p-6 text-sm text-gray-600">
              Yuklanmoqda…
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl bg-gray-50 p-6 text-sm text-gray-600">
              Aksiya yo'q. &laquo;Aksiya qo&apos;shish&raquo; tugmasini bosing.
            </div>
          ) : (
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium text-gray-500">
                  <th className="py-2 pr-2">Nomi</th>
                  <th className="py-2 pr-2">Chegirma</th>
                  <th className="py-2 pr-2">Mahsulotlar</th>
                  <th className="py-2 pr-2">Holat</th>
                  <th className="py-2 pl-2 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100">
                    <td className="py-3 pr-2 font-medium text-gray-900">{r.title}</td>
                    <td className="py-3 pr-2 text-gray-800">-{r.discount_percent}%</td>
                    <td className="py-3 pr-2 text-gray-600">
                      {(r.product_ids ?? []).length} ta
                    </td>
                    <td className="py-3 pr-2">
                      <span
                        className={
                          r.is_active
                            ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800'
                            : 'rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600'
                        }
                      >
                        {r.is_active ? 'Faol' : 'Nofaol'}
                      </span>
                    </td>
                    <td className="py-3 pl-2 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                        aria-label="Tahrirlash"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(r)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-rose-700 hover:bg-rose-50"
                        aria-label="O'chirish"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="text-lg font-bold">
              {editing ? "Aksiyani tahrirlash" : 'Yangi aksiya'}
            </div>
            <div className="mt-4 grid gap-3">
              <label className="text-xs font-medium text-gray-600">
                Sarlavha *
                <input
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 text-sm"
                  placeholder="Masalan: Bahor chegirmasi"
                />
              </label>
              <label className="text-xs font-medium text-gray-600">
                Tavsif
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  placeholder="Ixtiyoriy"
                />
              </label>
              <label className="text-xs font-medium text-gray-600">
                Chegirma foizi (0–100) *
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={form.discount_percent}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, discount_percent: e.target.value }))
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 text-sm"
                  placeholder="20"
                />
              </label>
              <label className="text-xs font-medium text-gray-600">
                Mahsulotlar *
                <div className="mt-1 max-h-40 overflow-y-auto rounded-xl border border-gray-200 p-2">
                  {products.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      Mahsulot yo'q. Avval Mahsulotlar bo'limidan qo'shing.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {products.map((p) => (
                        <label
                          key={p.id}
                          className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={form.product_ids.includes(p.id)}
                            onChange={() => toggleProduct(p.id)}
                          />
                          <span className="text-sm">{p.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </label>
              <label className="text-xs font-medium text-gray-600">
                Boshlanish (ixtiyoriy)
                <input
                  type="datetime-local"
                  value={form.start_at}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, start_at: e.target.value }))
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 text-sm"
                />
              </label>
              <label className="text-xs font-medium text-gray-600">
                Tugash (ixtiyoriy)
                <input
                  type="datetime-local"
                  value={form.end_at}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, end_at: e.target.value }))
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 text-sm"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, is_active: e.target.checked }))
                  }
                />
                Faol
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void savePromotion()}
                className="rounded-xl bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60"
              >
                {saving ? 'Saqlanmoqda…' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
