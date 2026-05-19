import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpToLine, ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react'
import { Card, CardSubtitle, CardTitle } from '../components/ui/Card'
import { supabase } from '../lib/supabase'
import { withProductStockSqlHint } from '../lib/productStockSchemaHint'
import type { ProductRow, ProductVariantRow, ProductVariantType } from '../types/database.types'

const VARIANT_TYPES: { value: ProductVariantType; label: string }[] = [
  { value: 'volume', label: 'Hajm' },
  { value: 'size', label: "O'lcham" },
  { value: 'color', label: 'Rang' },
  { value: 'weight', label: "Og'irlik" },
  { value: 'other', label: 'Tur' },
]

type VariantFormRow = {
  key: string
  type: ProductVariantType
  label: string
  value: string
  color_hex: string
  price_diff: string
  in_stock: boolean
  image_url: string
}

function mapDbToVariantForm(v: ProductVariantRow): VariantFormRow {
  const t = ['color', 'size', 'volume', 'weight', 'other'].includes(v.type) ? v.type : 'other'
  return {
    key: v.id,
    type: t as ProductVariantType,
    label: v.label,
    value: v.value,
    color_hex: v.color_hex?.trim() || '#cccccc',
    price_diff: String(v.price_diff ?? 0),
    in_stock: v.in_stock ?? true,
    image_url: v.image_url?.trim() ?? '',
  }
}

function emptyVariantRow(): VariantFormRow {
  return {
    key: crypto.randomUUID(),
    type: 'other',
    label: '',
    value: '',
    color_hex: '#cccccc',
    price_diff: '0',
    in_stock: true,
    image_url: '',
  }
}

const PRODUCT_IMAGES_BUCKET =
  import.meta.env.VITE_SUPABASE_PRODUCT_IMAGES_BUCKET?.trim() || 'product-images'

/** `.env`: VITE_PRODUCTS_DESCRIPTION_COLUMN=desc — jadval bo‘sh bo‘lganda ham majburiy matn ustuni nomi */
function descriptionColumnFromEnv(): 'description' | 'desc' | null {
  const v = import.meta.env.VITE_PRODUCTS_DESCRIPTION_COLUMN?.trim().toLowerCase()
  if (v === 'desc') return 'desc'
  if (v === 'description') return 'description'
  return null
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 80)
}

function descriptionFromRow(p: ProductRow): string {
  if (p.description != null && String(p.description).length > 0) return String(p.description)
  if (p.desc != null && String(p.desc).length > 0) return String(p.desc)
  return ''
}

/** DB: image_url — asosiy; images — qolganlari (ketma-ket) */
function productToGallery(p: ProductRow): string[] {
  const main = p.image_url?.trim() || ''
  const raw = p.images as string[] | string | null | undefined
  const extras = Array.isArray(raw)
    ? raw.map((s) => String(s).trim()).filter(Boolean)
    : typeof raw === 'string' && raw.trim()
      ? [raw.trim()]
      : []
  const seen = new Set<string>()
  const out: string[] = []
  for (const u of [main, ...extras].filter(Boolean)) {
    if (seen.has(u)) continue
    seen.add(u)
    out.push(u)
  }
  return out
}

/** DB da product_categories bo‘lmasa — tanlov uchun zaxira */
const LEGACY_CATEGORY_OPTIONS: { value: string; label: string; section: string }[] = [
  { section: 'Yuz parvarishi', value: 'cleansers', label: 'Tozalagichlar' },
  { section: 'Yuz parvarishi', value: 'serums', label: 'Serumlar' },
  { section: 'Yuz parvarishi', value: 'moisturizers', label: 'Kremlar' },
  { section: 'Yuz parvarishi', value: 'toners', label: 'Toniklar' },
  { section: 'Yuz parvarishi', value: 'masks', label: 'Niqoblar' },
  { section: 'Yuz parvarishi', value: 'sunscreen', label: 'Quyoshdan himoya' },
]

const emptyForm = {
  name: '',
  brand: '',
  description: '',
  price: '',
  /** Batafsil va katalogda birinchi ko‘rinadigan rasmlar (0 — asosiy) */
  gallery: [] as string[],
  category: '',
  rating: '',
  stock_quantity: '0',
  in_stock: true,
  is_import_on_order: false,
  estimated_delivery_days: '',
}

function formatMoney(n: number) {
  return new Intl.NumberFormat('uz-UZ').format(n) + ' so‘m'
}

export default function MahsulotlarPage() {
  const [rows, setRows] = useState<ProductRow[]>([])
  /** Supabase jadvalida matn ustuni `description` yoki `desc` bo‘lishi mumkin */
  const [descriptionColumn, setDescriptionColumn] = useState<'description' | 'desc'>('description')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ProductRow | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [urlDraft, setUrlDraft] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [variantRows, setVariantRows] = useState<VariantFormRow[]>([])

  const [categorySelectOptions, setCategorySelectOptions] =
    useState<{ value: string; label: string; section: string }[]>(LEGACY_CATEGORY_OPTIONS)

  const categorySelectGroups = useMemo(() => {
    const groups = new Map<string, { value: string; label: string }[]>()
    for (const o of categorySelectOptions) {
      const list = groups.get(o.section) ?? []
      list.push({ value: o.value, label: o.label })
      groups.set(o.section, list)
    }
    return Array.from(groups.entries())
  }, [categorySelectOptions])

  const loadCategoryOptions = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase
      .from('product_categories')
      .select('slug, name_uz, sort_order, category_sections(name_uz, sort_order)')
    if (error || !data?.length) {
      setCategorySelectOptions(LEGACY_CATEGORY_OPTIONS)
      return
    }
    type Sec = { name_uz: string; sort_order: number | null }
    type CatRow = {
      slug: string
      name_uz: string
      sort_order: number | null
      category_sections: Sec | Sec[] | null
    }
    const embedSection = (raw: CatRow['category_sections']): Sec | null => {
      if (!raw) return null
      if (Array.isArray(raw)) return raw[0] ?? null
      return raw
    }
    const rows = data as unknown as CatRow[]
    const sorted = [...rows].sort((a, b) => {
      const asec = embedSection(a.category_sections)?.sort_order ?? 0
      const bsec = embedSection(b.category_sections)?.sort_order ?? 0
      if (asec !== bsec) return asec - bsec
      return (a.sort_order ?? 0) - (b.sort_order ?? 0)
    })
    setCategorySelectOptions(
      sorted.map((c) => ({
        value: c.slug,
        label: c.name_uz,
        section: embedSection(c.category_sections)?.name_uz ?? 'Boshqa',
      })),
    )
  }, [])

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError(null)
    const { data, error: e } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    setLoading(false)
    if (e) {
      setError(withProductStockSqlHint(e.message))
      return
    }
    const list = (data as ProductRow[]) ?? []
    setRows(list)

    const envCol = descriptionColumnFromEnv()
    if (envCol) {
      setDescriptionColumn(envCol)
    } else if (list.length > 0) {
      const r = list[0] as unknown as Record<string, unknown>
      if (Object.prototype.hasOwnProperty.call(r, 'desc') && !Object.prototype.hasOwnProperty.call(r, 'description')) {
        setDescriptionColumn('desc')
      } else {
        setDescriptionColumn('description')
      }
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void loadCategoryOptions()
  }, [loadCategoryOptions])

  useEffect(() => {
    if (!modalOpen || !supabase) return
    if (!editing) {
      setVariantRows([])
      return
    }
    let cancelled = false
    void (async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', editing.id)
        .order('sort_order', { ascending: true })
      if (cancelled) return
      if (error) {
        setVariantRows([])
        return
      }
      setVariantRows((data as ProductVariantRow[]).map(mapDbToVariantForm))
    })()
    return () => {
      cancelled = true
    }
  }, [modalOpen, editing?.id, supabase])

  async function onImageFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target
    // Brauzerda avval value ni tozalasa, `files` ham bo‘shab qoladi — avval nusxa oling
    const picked = input.files ? Array.from(input.files) : []
    input.value = ''

    if (!picked.length || !supabase) return

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.user) {
      setError('Rasm yuklash uchun admin sifatida tizimga kiring.')
      return
    }

    const isImageFile = (f: File) =>
      f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(f.name)

    const list = picked.filter(isImageFile)
    if (list.length === 0) {
      setError('Faqat rasm fayli (JPEG, PNG, WebP, GIF)')
      return
    }

    setUploadingImage(true)
    setError(null)

    const newUrls: string[] = []
    for (const file of list) {
      const path = `products/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`
      const { error: upError } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || 'image/jpeg',
      })
      if (upError) {
        setUploadingImage(false)
        const hint =
          upError.message.includes('Bucket not found') || upError.message.includes('not found')
            ? ` Bucket «${PRODUCT_IMAGES_BUCKET}» yaratilganini tekshiring (SQL yoki Dashboard → Storage).`
            : upError.message.includes('row-level security') ||
                upError.message.includes('RLS') ||
                upError.message.includes('Unauthorized')
              ? ' Storage policy: supabase-storage-product-images.sql ni qayta ishga tushiring; profiles.role = \'admin\' bo‘lishi kerak.'
              : ` supabase-storage-product-images.sql va bucket «${PRODUCT_IMAGES_BUCKET}».`
        setError(`${upError.message}${hint}`)
        return
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path)
      newUrls.push(publicUrl)
    }

    setUploadingImage(false)
    setForm((f) => {
      const seen = new Set(f.gallery)
      const merged = [...f.gallery]
      for (const u of newUrls) {
        if (!seen.has(u)) {
          seen.add(u)
          merged.push(u)
        }
      }
      return { ...f, gallery: merged }
    })
  }

  function removeGalleryImage(index: number) {
    setForm((f) => ({ ...f, gallery: f.gallery.filter((_, i) => i !== index) }))
  }

  function setPrimaryGalleryIndex(index: number) {
    if (index <= 0) return
    setForm((f) => {
      const g = [...f.gallery]
      const [item] = g.splice(index, 1)
      return { ...f, gallery: [item, ...g] }
    })
  }

  function moveGalleryRelative(index: number, delta: number) {
    const j = index + delta
    setForm((f) => {
      const g = [...f.gallery]
      if (j < 0 || j >= g.length) return f
      ;[g[index], g[j]] = [g[j], g[index]]
      return { ...f, gallery: g }
    })
  }

  function appendUrlFromDraft() {
    const u = urlDraft.trim()
    if (!u) return
    let valid = false
    try {
      const parsed = new URL(u)
      valid = parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      valid = false
    }
    if (!valid) {
      setError('To‘g‘ri rasm havolasini kiriting (https://...)')
      return
    }
    setError(null)
    setForm((f) => (f.gallery.includes(u) ? f : { ...f, gallery: [...f.gallery, u] }))
    setUrlDraft('')
  }

  function openCreate() {
    setEditing(null)
    setUrlDraft('')
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(p: ProductRow) {
    setEditing(p)
    setUrlDraft('')
    setForm({
      name: p.name,
      brand: p.brand ?? '',
      description: descriptionFromRow(p),
      price: String(p.price),
      gallery: productToGallery(p),
      category: p.category?.trim() ?? '',
      rating: p.rating != null ? String(p.rating) : '',
      stock_quantity: String(p.stock_quantity ?? 0),
      in_stock: p.in_stock ?? true,
      is_import_on_order: p.is_import_on_order ?? false,
      estimated_delivery_days:
        p.estimated_delivery_days != null ? String(p.estimated_delivery_days) : '',
    })
    setModalOpen(true)
  }

  async function persistVariants(productId: string) {
    if (!supabase) return
    const { error: delErr } = await supabase.from('product_variants').delete().eq('product_id', productId)
    if (delErr) throw new Error(delErr.message)
    const filled = variantRows.filter((r) => r.label.trim())
    if (filled.length === 0) return
    const rows = filled.map((r, i) => {
      const pd = r.price_diff.trim() === '' ? 0 : Number(r.price_diff)
      const price_diff = Number.isFinite(pd) ? pd : 0
      return {
        product_id: productId,
        type: r.type,
        label: r.label.trim(),
        value: r.value.trim() || r.label.trim(),
        color_hex: r.type === 'color' && r.color_hex.trim() ? r.color_hex.trim() : null,
        price_diff,
        in_stock: r.in_stock,
        image_url: r.image_url.trim() || null,
        sort_order: i,
      }
    })
    const { error: insErr } = await supabase.from('product_variants').insert(rows)
    if (insErr) throw new Error(insErr.message)
  }

  async function saveProduct() {
    if (!supabase) return
    const price = Number(form.price)
    if (!form.name.trim() || Number.isNaN(price) || price < 0) {
      setError('Nom va narx to‘g‘ri kiriting')
      return
    }
    const rating =
      form.rating.trim() === '' ? null : Math.min(5, Math.max(0, Number(form.rating)))
    if (form.rating.trim() !== '' && Number.isNaN(Number(form.rating))) {
      setError('Reyting 0–5 oraliqda bo‘lishi kerak')
      return
    }
    const rawStock = form.stock_quantity.trim()
    const parsedStock = rawStock === '' ? 0 : Number(rawStock)
    if (rawStock !== '' && !Number.isFinite(parsedStock)) {
      setError('Ombor sonini to‘g‘ri kiriting')
      return
    }
    const stockQty = Math.max(0, Math.floor(parsedStock))
    const isImport = form.is_import_on_order
    const rawDelivery = form.estimated_delivery_days.trim()
    const parsedDelivery = rawDelivery === '' ? null : Number(rawDelivery)
    if (isImport) {
      if (rawDelivery === '' || !Number.isFinite(parsedDelivery) || parsedDelivery < 1) {
        setError('Chet eldan keltirish uchun taxminiy yetkazish kunini kiriting (kamida 1)')
        return
      }
    }

    setSaving(true)
    setError(null)
    const gallery = form.gallery.map((s) => s.trim()).filter(Boolean)
    const textBody = form.description.trim() || null
    const basePayload = {
      name: form.name.trim(),
      brand: form.brand.trim() || null,
      price,
      image_url: gallery[0] ?? null,
      /** Har doim yuboramiz: oldingi qo‘shimcha rasmlarni tozalash uchun `[]` ham muhim */
      images: gallery.slice(1),
      category: form.category || null,
      rating,
      stock_quantity: stockQty,
      in_stock: (isImport || stockQty > 0) && form.in_stock,
      is_import_on_order: isImport,
      estimated_delivery_days: isImport
        ? Math.max(1, Math.floor(parsedDelivery ?? 0))
        : null,
    }
    const payload =
      descriptionColumn === 'desc'
        ? { ...basePayload, desc: textBody }
        : { ...basePayload, description: textBody }

    try {
      if (editing) {
        const { data: updated, error: e } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editing.id)
          .select('id, stock_quantity, in_stock, image_url, images')
        if (e) {
          setError(withProductStockSqlHint(e.message))
          return
        }
        if (!updated?.length) {
          setError(
            'Mahsulot yangilanmadi (0 qator). Admin sifatida kirganingizni yoki `stock_quantity` ustunini SQL da qo‘shganingizni tekshiring.',
          )
          return
        }
        await persistVariants(editing.id)
      } else {
        const { data: insertedRows, error: e } = await supabase.from('products').insert(payload).select('id')
        if (e) {
          setError(withProductStockSqlHint(e.message))
          return
        }
        const newId = insertedRows?.[0]?.id
        if (newId) await persistVariants(newId)
      }
    } catch (ve) {
      const msg = ve instanceof Error ? ve.message : String(ve)
      setError(
        msg.toLowerCase().includes('variant') || msg.includes('policy')
          ? `${msg} — SQL: admin-panel/supabase-product-variants-admin.sql`
          : msg,
      )
      return
    } finally {
      setSaving(false)
    }
    setModalOpen(false)
    void load()
  }

  async function remove(id: string) {
    if (!supabase) return
    if (!confirm('Mahsulotni o‘chirishni tasdiqlaysizmi?')) return
    const { error: e } = await supabase.from('products').delete().eq('id', id)
    if (e) {
      setError(withProductStockSqlHint(e.message))
      return
    }
    void load()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xl font-bold">Mahsulotlar</div>
          <div className="mt-1 text-sm text-gray-500">
            Jami:{' '}
            <span className="font-semibold">{loading ? '…' : `${rows.length} ta`}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-xl bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-white hover:brightness-95"
        >
          Mahsulot qo‘shish
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
          {error}
        </div>
      )}

      <Card>
        <CardTitle>Ro‘yxat</CardTitle>
        <CardSubtitle>Supabase `products` jadvali</CardSubtitle>
        <div className="mt-4 overflow-x-auto">
          {loading ? (
            <div className="rounded-2xl bg-gray-50 p-6 text-sm text-gray-600">Yuklanmoqda…</div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl bg-gray-50 p-6 text-sm text-gray-600">
              Mahsulot yo‘q. «Mahsulot qo‘shish» yoki SQL namuna insert.
            </div>
          ) : (
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium text-gray-500">
                  <th className="py-2 pr-2">Nomi</th>
                  <th className="py-2 pr-2">Brend</th>
                  <th className="py-2 pr-2">Kategoriya</th>
                  <th className="py-2 pr-2">Narx</th>
                  <th className="py-2 pr-2 text-right tabular-nums">Omborda (dona)</th>
                  <th className="py-2 pr-2">Holat</th>
                  <th className="py-2 pl-2 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="py-3 pr-2 font-medium text-gray-900">{p.name}</td>
                    <td className="py-3 pr-2 text-gray-600">{p.brand ?? '—'}</td>
                    <td className="py-3 pr-2 text-gray-600">{p.category ?? '—'}</td>
                    <td className="py-3 pr-2 text-gray-800">{formatMoney(Number(p.price))}</td>
                    <td className="py-3 pr-2 text-right tabular-nums font-medium text-gray-900">
                      {p.stock_quantity ?? 0}
                    </td>
                    <td className="py-3 pr-2">
                      <span
                        className={
                          p.in_stock
                            ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800'
                            : 'rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600'
                        }
                      >
                        {p.in_stock && (p.stock_quantity ?? 0) > 0 ? 'Sotuvda' : 'Yo‘q'}
                      </span>
                    </td>
                    <td className="py-3 pl-2 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                        aria-label="Tahrirlash"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(p.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-rose-700 hover:bg-rose-50"
                        aria-label="O‘chirish"
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
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-x-hidden overflow-y-auto bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-[min(32rem,calc(100vw-2rem))] min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain rounded-2xl bg-white p-4 shadow-xl sm:p-6 sm:max-w-lg">
            <div className="min-w-0 text-lg font-bold">{editing ? 'Tahrirlash' : 'Yangi mahsulot'}</div>
            <div className="mt-4 grid min-w-0 gap-3">
              <label className="text-xs font-medium text-gray-600">
                Nomi *
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 h-10 w-full min-w-0 max-w-full rounded-xl border border-gray-200 px-3 text-sm"
                />
              </label>
              <label className="text-xs font-medium text-gray-600">
                Brend
                <input
                  value={form.brand}
                  onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                  className="mt-1 h-10 w-full min-w-0 max-w-full rounded-xl border border-gray-200 px-3 text-sm"
                />
              </label>
              <label className="text-xs font-medium text-gray-600">
                Tavsif
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full min-w-0 max-w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-medium text-gray-600">
                Narx (so‘m) *
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  className="mt-1 h-10 w-full min-w-0 max-w-full rounded-xl border border-gray-200 px-3 text-sm"
                />
              </label>
              <div className="min-w-0 text-xs font-medium text-gray-600">
                Mahsulot rasmlari
                <p className="mt-1 text-[11px] font-normal text-gray-500">
                  Birinchi rasm — katalog va batafsil sahifada asosiy; qolganlari slayd / swipe
                  bo‘ylab ko‘rinadi (SkinBox ilovasi).
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    className="hidden"
                    onChange={(ev) => void onImageFilesSelected(ev)}
                  />
                  <button
                    type="button"
                    disabled={uploadingImage || !supabase}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex max-w-full min-w-0 flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ImagePlus className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 text-left leading-snug">
                      {uploadingImage ? 'Yuklanmoqda…' : 'Rasm yuklash (bir yoki bir nechta)'}
                    </span>
                  </button>
                </div>
                {form.gallery.length > 0 && (
                  <ul className="mt-3 flex min-w-0 flex-col gap-2">
                    {form.gallery.map((url, idx) => (
                      <li
                        key={`${url}-${idx}`}
                        className="flex max-w-full flex-wrap items-center gap-2 overflow-hidden rounded-xl border border-gray-100 bg-gray-50/80 p-2"
                      >
                        <img
                          src={url}
                          alt=""
                          className="h-16 w-16 shrink-0 rounded-lg border border-gray-200 object-cover"
                        />
                        <div className="min-w-0 flex-1 overflow-hidden">
                          {idx === 0 ? (
                            <span className="text-[11px] font-semibold text-emerald-800">
                              Asosiy rasm
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPrimaryGalleryIndex(idx)}
                              className="inline-flex max-w-full items-center gap-1 text-[11px] font-medium text-[rgb(var(--primary))] hover:underline"
                            >
                              <ArrowUpToLine className="h-3 w-3 shrink-0" />
                              Asosiy qilish
                            </button>
                          )}
                          <p
                            className="mt-0.5 break-all text-[10px] leading-snug text-gray-500"
                            title={url}
                          >
                            {url}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveGalleryRelative(idx, -1)}
                            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                            aria-label="Yuqoriga"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={idx >= form.gallery.length - 1}
                            onClick={() => moveGalleryRelative(idx, 1)}
                            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                            aria-label="Pastga"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => removeGalleryImage(idx)}
                            className="rounded-lg border border-rose-200 bg-white px-2 py-1 text-[11px] text-rose-700 hover:bg-rose-50"
                            aria-label="O‘chirish"
                          >
                            <Trash2 className="mx-auto h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 text-[11px] text-gray-500">
                  Yoki havola qo‘shish (pastdagi «Qo‘shish» faqat shu havola uchun; fayl tanlasa avtomatik
                  ro‘yxatga tushadi).
                </p>
                <div className="mt-1 flex min-w-0 gap-2">
                  <input
                    value={urlDraft}
                    onChange={(e) => setUrlDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), appendUrlFromDraft())}
                    className="h-10 min-w-0 max-w-full flex-1 rounded-xl border border-gray-200 px-3 text-sm"
                    placeholder="https://…"
                  />
                  <button
                    type="button"
                    onClick={appendUrlFromDraft}
                    className="shrink-0 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-800 hover:bg-gray-50"
                  >
                    Havolani qo‘shish
                  </button>
                </div>
              </div>
              <div className="min-w-0 rounded-xl border border-gray-200 bg-gray-50/50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-medium text-gray-700">Tur / variantlar</div>
                  <button
                    type="button"
                    onClick={() => setVariantRows((rows) => [...rows, emptyVariantRow()])}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium text-gray-800 hover:bg-gray-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Qator qo‘shish
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-gray-500">
                  Ilovada “Tur” tanlovi uchun kamida 2 ta variant kiriting (masalan SPF30 va SPF50). Ixtiyoriy:
                  har variant uchun alohida rasm havolasi.
                </p>
                {variantRows.length === 0 ? (
                  <p className="mt-2 text-[11px] text-gray-400">Hozircha variant yo‘q.</p>
                ) : (
                  <ul className="mt-2 space-y-3">
                    {variantRows.map((row, idx) => (
                      <li key={row.key} className="max-w-full overflow-hidden rounded-lg border border-gray-100 bg-white p-2">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-gray-500">#{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => setVariantRows((rows) => rows.filter((r) => r.key !== row.key))}
                            className="text-[11px] text-rose-600 hover:underline"
                          >
                            O‘chirish
                          </button>
                        </div>
                        <div className="grid min-w-0 gap-2">
                          <label className="min-w-0 text-[11px] text-gray-600">
                            Guruh
                            <select
                              value={row.type}
                              onChange={(e) =>
                                setVariantRows((rows) =>
                                  rows.map((r) =>
                                    r.key === row.key
                                      ? { ...r, type: e.target.value as ProductVariantType }
                                      : r,
                                  ),
                                )
                              }
                              className="mt-0.5 h-9 w-full rounded-lg border border-gray-200 px-2 text-sm"
                            >
                              {VARIANT_TYPES.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-[11px] text-gray-600">
                            Nomi (ko‘rinadi) *
                            <input
                              value={row.label}
                              onChange={(e) =>
                                setVariantRows((rows) =>
                                  rows.map((r) => (r.key === row.key ? { ...r, label: e.target.value } : r)),
                                )
                              }
                              className="mt-0.5 h-9 w-full rounded-lg border border-gray-200 px-2 text-sm"
                              placeholder="masalan: SPF50"
                            />
                          </label>
                          {row.type === 'color' && (
                            <label className="text-[11px] text-gray-600">
                              Rang kodi
                              <input
                                type="color"
                                value={row.color_hex.match(/^#[0-9a-fA-F]{6}$/) ? row.color_hex : '#cccccc'}
                                onChange={(e) =>
                                  setVariantRows((rows) =>
                                    rows.map((r) =>
                                      r.key === row.key ? { ...r, color_hex: e.target.value } : r,
                                    ),
                                  )
                                }
                                className="mt-0.5 h-9 w-full cursor-pointer rounded-lg border border-gray-200"
                              />
                            </label>
                          )}
                          <label className="text-[11px] text-gray-600">
                            Narx farqi (so‘m, ixtiyoriy, + yoki −)
                            <input
                              type="number"
                              value={row.price_diff}
                              onChange={(e) =>
                                setVariantRows((rows) =>
                                  rows.map((r) =>
                                    r.key === row.key ? { ...r, price_diff: e.target.value } : r,
                                  ),
                                )
                              }
                              className="mt-0.5 h-9 w-full rounded-lg border border-gray-200 px-2 text-sm"
                            />
                          </label>
                          <label className="text-[11px] text-gray-600">
                            Variant rasmi (URL, ixtiyoriy)
                            <input
                              value={row.image_url}
                              onChange={(e) =>
                                setVariantRows((rows) =>
                                  rows.map((r) =>
                                    r.key === row.key ? { ...r, image_url: e.target.value } : r,
                                  ),
                                )
                              }
                              className="mt-0.5 h-9 w-full rounded-lg border border-gray-200 px-2 text-sm"
                              placeholder="https://…"
                            />
                          </label>
                          <label className="flex items-center gap-2 text-[11px] text-gray-800">
                            <input
                              type="checkbox"
                              checked={row.in_stock}
                              onChange={(e) =>
                                setVariantRows((rows) =>
                                  rows.map((r) =>
                                    r.key === row.key ? { ...r, in_stock: e.target.checked } : r,
                                  ),
                                )
                              }
                            />
                            Mavjud
                          </label>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <label className="min-w-0 text-xs font-medium text-gray-600">
                Kategoriya
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      category: e.target.value,
                    }))
                  }
                  className="mt-1 h-10 w-full min-w-0 max-w-full rounded-xl border border-gray-200 px-3 text-sm"
                >
                  <option value="">—</option>
                  {categorySelectGroups.map(([sectionLabel, opts]) => (
                    <optgroup key={sectionLabel} label={sectionLabel}>
                      {opts.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label className="min-w-0 text-xs font-medium text-gray-600">
                Reyting (0–5)
                <input
                  type="number"
                  min={0}
                  max={5}
                  step={0.1}
                  value={form.rating}
                  onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
                  className="mt-1 h-10 w-full min-w-0 max-w-full rounded-xl border border-gray-200 px-3 text-sm"
                />
              </label>
              <label className="min-w-0 text-xs font-medium text-gray-600">
                Ombordagi soni (dona) *
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={form.stock_quantity}
                  onChange={(e) => setForm((f) => ({ ...f, stock_quantity: e.target.value }))}
                  className="mt-1 h-10 w-full min-w-0 max-w-full rounded-xl border border-gray-200 px-3 text-sm"
                  placeholder="0"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  Buyurtma qilinganda shu sondan ayiriladi; 0 bo‘lsa sotuvda ko‘rinmaydi.
                </p>
              </label>
              <label className="flex min-w-0 items-start gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  className="mt-0.5 shrink-0"
                  checked={form.in_stock}
                  onChange={(e) => setForm((f) => ({ ...f, in_stock: e.target.checked }))}
                />
                <span className="min-w-0 leading-snug">
                  Katalogda ko‘rsatish (0 dona bo‘lsa avtomatik o‘chadi)
                </span>
              </label>
              <label className="flex min-w-0 items-start gap-2 text-sm text-gray-800 sm:col-span-2">
                <input
                  type="checkbox"
                  className="mt-0.5 shrink-0"
                  checked={form.is_import_on_order}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      is_import_on_order: e.target.checked,
                      estimated_delivery_days: e.target.checked ? f.estimated_delivery_days : '',
                    }))
                  }
                />
                <span className="min-w-0 leading-snug">
                  Buyurtma asosida chet eldan keltiriladi (ombordan ayirilmaydi)
                </span>
              </label>
              {form.is_import_on_order ? (
                <label className="min-w-0 text-xs font-medium text-gray-600 sm:col-span-2">
                  Taxminiy yetkazish muddati (ish kuni) *
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={form.estimated_delivery_days}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, estimated_delivery_days: e.target.value }))
                    }
                    className="mt-1 h-10 w-full min-w-0 max-w-full rounded-xl border border-gray-200 px-3 text-sm"
                    placeholder="Masalan: 14"
                  />
                </label>
              ) : null}
            </div>
            <div className="mt-6 flex min-w-0 flex-wrap justify-end gap-2">
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
                onClick={() => void saveProduct()}
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
