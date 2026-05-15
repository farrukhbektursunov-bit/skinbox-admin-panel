import { useCallback, useEffect, useState } from 'react'
import { Pencil, Trash2, Ticket } from 'lucide-react'
import { Card, CardSubtitle, CardTitle } from '../components/ui/Card'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { CouponRow, CouponType } from '../types/database.types'

const emptyForm = {
  code: '',
  type: 'percent' as CouponType,
  value: '',
  min_subtotal: '',
  max_uses: '',
  expires_at: '',
  active: true,
}

type FormState = typeof emptyForm

function formatCurrency(n: number) {
  return new Intl.NumberFormat('uz-UZ').format(n)
}

export default function KuponlarPage() {
  const [rows, setRows] = useState<CouponRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CouponRow | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) return
    setLoading(true)
    setError(null)
    const { data, error: e } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false })
    setLoading(false)
    if (e) {
      setError(e.message)
      return
    }
    setRows((data as CouponRow[]) ?? [])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(c: CouponRow) {
    setEditing(c)
    setForm({
      code: c.code,
      type: c.type,
      value: String(c.value ?? ''),
      min_subtotal: String(c.min_subtotal ?? ''),
      max_uses: c.max_uses == null ? '' : String(c.max_uses),
      expires_at: c.expires_at ? c.expires_at.slice(0, 16) : '',
      active: c.active,
    })
    setModalOpen(true)
  }

  async function saveCoupon() {
    if (!supabase || !isSupabaseConfigured) {
      setError('Supabase sozlanmagan')
      return
    }
    const code = form.code.trim().toUpperCase()
    if (!/^[A-Z0-9_-]{2,32}$/.test(code)) {
      setError("Kod 2–32 ta belgi: A–Z, 0–9, '_' yoki '-'")
      return
    }
    const valueNum = Number(form.value)
    if (Number.isNaN(valueNum) || valueNum < 0) {
      setError("Qiymat 0 dan kichik bo'lmasligi kerak")
      return
    }
    if (form.type === 'percent' && valueNum > 100) {
      setError('Foiz 0 dan 100 gacha bo‘lishi kerak')
      return
    }
    const minSub = form.min_subtotal === '' ? 0 : Number(form.min_subtotal)
    if (Number.isNaN(minSub) || minSub < 0) {
      setError("Eng kichik buyurtma summasi noto'g'ri")
      return
    }
    const maxUses = form.max_uses === '' ? null : Number(form.max_uses)
    if (maxUses != null && (!Number.isFinite(maxUses) || maxUses < 0)) {
      setError("Eng ko'p ishlatish soni noto'g'ri")
      return
    }

    setSaving(true)
    setError(null)

    const payload = {
      code,
      type: form.type,
      value: valueNum,
      min_subtotal: minSub,
      max_uses: maxUses,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      active: form.active,
    }

    if (editing) {
      const { error: e } = await supabase
        .from('coupons')
        .update(payload)
        .eq('code', editing.code)
      setSaving(false)
      if (e) {
        setError(e.message)
        return
      }
    } else {
      const { error: e } = await supabase.from('coupons').insert(payload)
      setSaving(false)
      if (e) {
        setError(e.message)
        return
      }
    }
    setModalOpen(false)
    void load()
  }

  async function remove(c: CouponRow) {
    if (!supabase) return
    if (!confirm(`"${c.code}" kuponini o‘chirishni tasdiqlaysizmi?`)) return
    const { error: e } = await supabase
      .from('coupons')
      .delete()
      .eq('code', c.code)
    if (e) {
      setError(e.message)
      return
    }
    void load()
  }

  async function toggleActive(c: CouponRow) {
    if (!supabase) return
    const { error: e } = await supabase
      .from('coupons')
      .update({ active: !c.active })
      .eq('code', c.code)
    if (e) {
      setError(e.message)
      return
    }
    void load()
  }

  const activeCount = rows.filter((r) => r.active).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xl font-bold">Kuponlar</div>
          <div className="mt-1 text-sm text-gray-500">
            Jami:{' '}
            <span className="font-semibold">
              {loading ? '…' : `${rows.length} ta`}
            </span>
            {!loading && rows.length > 0 && <> • Faol: {activeCount} ta</>}
          </div>
        </div>
        {isSupabaseConfigured && (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-white hover:brightness-95"
          >
            Yangi kupon
          </button>
        )}
      </div>

      {!isSupabaseConfigured && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          Supabase .env da sozlanmagan. Kupon yaratish uchun DB ulang.
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
          {error}
        </div>
      )}

      <Card>
        <CardTitle>Kuponlar ro‘yxati</CardTitle>
        <CardSubtitle>
          Foiz yoki belgilangan summa chegirma beruvchi kodlar
        </CardSubtitle>
        <div className="mt-4 overflow-x-auto">
          {loading ? (
            <div className="rounded-2xl bg-gray-50 p-6 text-sm text-gray-600">
              Yuklanmoqda…
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl bg-gray-50 p-8 text-center text-sm text-gray-600">
              <Ticket className="mb-2 h-6 w-6 text-gray-400" />
              Kupon yo‘q. &laquo;Yangi kupon&raquo; tugmasini bosing.
            </div>
          ) : (
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium text-gray-500">
                  <th className="py-2 pr-2">Kod</th>
                  <th className="py-2 pr-2">Turi</th>
                  <th className="py-2 pr-2">Qiymat</th>
                  <th className="py-2 pr-2">Min. summa</th>
                  <th className="py-2 pr-2">Ishlatilgan</th>
                  <th className="py-2 pr-2">Tugashi</th>
                  <th className="py-2 pr-2">Holat</th>
                  <th className="py-2 pl-2 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.code} className="border-b border-gray-100">
                    <td className="py-3 pr-2 font-mono font-semibold text-gray-900">
                      {r.code}
                    </td>
                    <td className="py-3 pr-2 text-gray-700">
                      {r.type === 'percent' ? 'Foiz' : 'Belgilangan'}
                    </td>
                    <td className="py-3 pr-2 text-gray-800">
                      {r.type === 'percent'
                        ? `${r.value}%`
                        : `${formatCurrency(Number(r.value))} so'm`}
                    </td>
                    <td className="py-3 pr-2 text-gray-600">
                      {Number(r.min_subtotal) > 0
                        ? `${formatCurrency(Number(r.min_subtotal))} so'm`
                        : '—'}
                    </td>
                    <td className="py-3 pr-2 text-gray-600">
                      {r.used_count ?? 0}
                      {r.max_uses != null ? ` / ${r.max_uses}` : ''}
                    </td>
                    <td className="py-3 pr-2 text-gray-600">
                      {r.expires_at
                        ? new Date(r.expires_at).toLocaleString('uz-UZ', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="py-3 pr-2">
                      <button
                        type="button"
                        onClick={() => void toggleActive(r)}
                        className={
                          r.active
                            ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800 hover:bg-emerald-100'
                            : 'rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200'
                        }
                      >
                        {r.active ? 'Faol' : 'Nofaol'}
                      </button>
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
              {editing ? "Kuponni tahrirlash" : 'Yangi kupon'}
            </div>
            <div className="mt-4 grid gap-3">
              <label className="text-xs font-medium text-gray-600">
                Kupon kodi *
                <input
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      code: e.target.value.toUpperCase().slice(0, 32),
                    }))
                  }
                  disabled={!!editing}
                  className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 font-mono text-sm uppercase disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="Masalan: SAVE20"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-medium text-gray-600">
                  Turi *
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        type: e.target.value as CouponType,
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm"
                  >
                    <option value="percent">Foiz (%)</option>
                    <option value="fixed">Belgilangan summa (so'm)</option>
                  </select>
                </label>
                <label className="text-xs font-medium text-gray-600">
                  Qiymat *
                  <input
                    type="number"
                    min={0}
                    max={form.type === 'percent' ? 100 : undefined}
                    step={form.type === 'percent' ? 1 : 1000}
                    value={form.value}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, value: e.target.value }))
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 text-sm"
                    placeholder={form.type === 'percent' ? '20' : '50000'}
                  />
                </label>
              </div>
              <label className="text-xs font-medium text-gray-600">
                Eng kichik buyurtma summasi (so'm)
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={form.min_subtotal}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, min_subtotal: e.target.value }))
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 text-sm"
                  placeholder="0"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-medium text-gray-600">
                  Eng ko'p ishlatish soni
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={form.max_uses}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, max_uses: e.target.value }))
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 text-sm"
                    placeholder="Cheksiz"
                  />
                </label>
                <label className="text-xs font-medium text-gray-600">
                  Tugash sanasi
                  <input
                    type="datetime-local"
                    value={form.expires_at}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, expires_at: e.target.value }))
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 text-sm"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, active: e.target.checked }))
                  }
                />
                Faol
              </label>
              {editing && (
                <div className="rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600">
                  Ishlatilgan: <b>{editing.used_count ?? 0}</b>
                  {editing.max_uses != null ? ` / ${editing.max_uses}` : ''} marta
                </div>
              )}
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
                onClick={() => void saveCoupon()}
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
