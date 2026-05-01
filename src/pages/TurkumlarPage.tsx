import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Card, CardSubtitle, CardTitle } from '../components/ui/Card'
import { supabase } from '../lib/supabase'
import type { CategorySectionRow, ProductCategoryRow } from '../types/database.types'

const SLUG_HINT = 'faqat kichik harf, raqam va tire (masalan: essences)'

function isValidSlug(s: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)
}

const emptySection = {
  slug: '',
  name_uz: '',
  name_ru: '',
  name_en: '',
  sort_order: '0',
}

const emptyCategory = {
  section_id: '',
  slug: '',
  name_uz: '',
  name_ru: '',
  name_en: '',
  sort_order: '0',
}

export default function TurkumlarPage() {
  const [sections, setSections] = useState<CategorySectionRow[]>([])
  const [categories, setCategories] = useState<ProductCategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [sectionForm, setSectionForm] = useState(emptySection)
  const [categoryForm, setCategoryForm] = useState(emptyCategory)
  const [editingSection, setEditingSection] = useState<CategorySectionRow | null>(null)
  const [editingCategory, setEditingCategory] = useState<ProductCategoryRow | null>(null)
  const [savingSection, setSavingSection] = useState(false)
  const [savingCategory, setSavingCategory] = useState(false)

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError(null)
    const [s, c] = await Promise.all([
      supabase.from('category_sections').select('*').order('sort_order', { ascending: true }),
      supabase.from('product_categories').select('*').order('sort_order', { ascending: true }),
    ])
    setLoading(false)
    if (s.error) {
      setError(
        `${s.error.message} — category_sections jadvali bormi? supabase-category-hierarchy.sql ni ishga tushiring.`,
      )
      return
    }
    if (c.error) {
      setError(
        `${c.error.message} — product_categories jadvali bormi? supabase-category-hierarchy.sql ni ishga tushiring.`,
      )
      return
    }
    setSections((s.data as CategorySectionRow[]) ?? [])
    setCategories((c.data as ProductCategoryRow[]) ?? [])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (sections.length === 0) return
    setCategoryForm((f) => (f.section_id ? f : { ...f, section_id: sections[0].id }))
  }, [sections])

  const categoriesBySection = useMemo(() => {
    const m = new Map<string, ProductCategoryRow[]>()
    for (const c of categories) {
      const list = m.get(c.section_id) ?? []
      list.push(c)
      m.set(c.section_id, list)
    }
    return m
  }, [categories])

  function sectionName(s: CategorySectionRow) {
    return `${s.name_uz} (${s.slug})`
  }

  async function saveSection() {
    if (!supabase) return
    const slug = sectionForm.slug.trim().toLowerCase()
    if (!isValidSlug(slug)) {
      setError(`Bo‘lim slug: ${SLUG_HINT}`)
      return
    }
    if (!sectionForm.name_uz.trim()) {
      setError('Bo‘lim nomi (UZ) majburiy')
      return
    }
    const sort_order = Number(sectionForm.sort_order)
    if (!Number.isFinite(sort_order)) {
      setError('Tartib raqami butun son bo‘lsin')
      return
    }
    setSavingSection(true)
    setError(null)
    const row = {
      slug,
      name_uz: sectionForm.name_uz.trim(),
      name_ru: sectionForm.name_ru.trim() || null,
      name_en: sectionForm.name_en.trim() || null,
      sort_order: Math.floor(sort_order),
    }
    if (editingSection) {
      const { error: e } = await supabase.from('category_sections').update(row).eq('id', editingSection.id)
      setSavingSection(false)
      if (e) {
        setError(e.message)
        return
      }
    } else {
      const { error: e } = await supabase.from('category_sections').insert(row)
      setSavingSection(false)
      if (e) {
        setError(e.message)
        return
      }
    }
    setEditingSection(null)
    setSectionForm(emptySection)
    void load()
  }

  async function removeSection(id: string) {
    if (!supabase) return
    const kids = categoriesBySection.get(id) ?? []
    if (
      !confirm(
        `Bo‘limni o‘chirish? ${kids.length ? `Ichida ${kids.length} ta turkum bor — ular ham o‘chadi (mahsulotlardagi slug matni saqlanadi).` : ''}`,
      )
    )
      return
    const { error: e } = await supabase.from('category_sections').delete().eq('id', id)
    if (e) {
      setError(e.message)
      return
    }
    void load()
  }

  async function saveCategory() {
    if (!supabase) return
    if (!categoryForm.section_id) {
      setError('Avval bo‘lim tanlang yoki yarating')
      return
    }
    const slug = categoryForm.slug.trim().toLowerCase()
    if (!isValidSlug(slug)) {
      setError(`Turkum slug: ${SLUG_HINT}`)
      return
    }
    if (!categoryForm.name_uz.trim()) {
      setError('Turkum nomi (UZ) majburiy')
      return
    }
    const sort_order = Number(categoryForm.sort_order)
    if (!Number.isFinite(sort_order)) {
      setError('Tartib raqami butun son bo‘lsin')
      return
    }
    setSavingCategory(true)
    setError(null)
    const row = {
      section_id: categoryForm.section_id,
      slug,
      name_uz: categoryForm.name_uz.trim(),
      name_ru: categoryForm.name_ru.trim() || null,
      name_en: categoryForm.name_en.trim() || null,
      sort_order: Math.floor(sort_order),
    }
    if (editingCategory) {
      const { error: e } = await supabase.from('product_categories').update(row).eq('id', editingCategory.id)
      setSavingCategory(false)
      if (e) {
        setError(e.message)
        return
      }
    } else {
      const { error: e } = await supabase.from('product_categories').insert(row)
      setSavingCategory(false)
      if (e) {
        setError(e.message)
        return
      }
    }
    setEditingCategory(null)
    setCategoryForm((f) => ({ ...emptyCategory, section_id: f.section_id }))
    void load()
  }

  async function removeCategory(cat: ProductCategoryRow) {
    if (!supabase) return
    const { count, error: countErr } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category', cat.slug)
    if (countErr) {
      setError(countErr.message)
      return
    }
    if (count && count > 0) {
      setError(`«${cat.slug}» turkumida ${count} ta mahsulot bor — avval ularni boshqa turkumga o‘tkazing yoki o‘chiring.`)
      return
    }
    if (!confirm(`Turkum «${cat.name_uz}» (${cat.slug}) o‘chirilsinmi?`)) return
    const { error: e } = await supabase.from('product_categories').delete().eq('id', cat.id)
    if (e) {
      setError(e.message)
      return
    }
    void load()
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xl font-bold">Bo‘limlar va turkumlar</div>
        <div className="mt-1 text-sm text-gray-500">
          Do‘konda chapda bo‘limlar, o‘ngda tanlangan bo‘limdagi turkumlar ko‘rinadi (SkinBox).
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
          {error}
        </div>
      )}

      <Card>
        <CardTitle>{editingSection ? 'Bo‘limni tahrirlash' : 'Yangi bo‘lim'}</CardTitle>
        <CardSubtitle>Slug keyin o‘zgarmas bo‘lsa yaxshi (URL va mahsulot bilan bog‘langan)</CardSubtitle>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-gray-600 sm:col-span-2">
            Slug *
            <input
              value={sectionForm.slug}
              disabled={!!editingSection}
              onChange={(e) => setSectionForm((f) => ({ ...f, slug: e.target.value }))}
              className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 text-sm disabled:bg-gray-100"
              placeholder="masalan: skincare"
            />
          </label>
          <label className="text-xs font-medium text-gray-600">
            Nomi (UZ) *
            <input
              value={sectionForm.name_uz}
              onChange={(e) => setSectionForm((f) => ({ ...f, name_uz: e.target.value }))}
              className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-gray-600">
            Nomi (RU)
            <input
              value={sectionForm.name_ru}
              onChange={(e) => setSectionForm((f) => ({ ...f, name_ru: e.target.value }))}
              className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-gray-600">
            Nomi (EN)
            <input
              value={sectionForm.name_en}
              onChange={(e) => setSectionForm((f) => ({ ...f, name_en: e.target.value }))}
              className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-gray-600">
            Tartib
            <input
              type="number"
              value={sectionForm.sort_order}
              onChange={(e) => setSectionForm((f) => ({ ...f, sort_order: e.target.value }))}
              className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 text-sm"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {editingSection && (
            <button
              type="button"
              onClick={() => {
                setEditingSection(null)
                setSectionForm(emptySection)
              }}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
            >
              Bekor
            </button>
          )}
          <button
            type="button"
            disabled={savingSection || !supabase}
            onClick={() => void saveSection()}
            className="rounded-xl bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60"
          >
            {savingSection ? 'Saqlanmoqda…' : editingSection ? 'Bo‘limni saqlash' : 'Bo‘lim qo‘shish'}
          </button>
        </div>
      </Card>

      <Card>
        <CardTitle>{editingCategory ? 'Turkumni tahrirlash' : 'Yangi turkum'}</CardTitle>
        <CardSubtitle>Mahsulotlar `category` maydoni shu slug bilan mos keladi</CardSubtitle>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-gray-600 sm:col-span-2">
            Bo‘lim *
            <select
              value={categoryForm.section_id}
              onChange={(e) => setCategoryForm((f) => ({ ...f, section_id: e.target.value }))}
              className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 text-sm"
            >
              <option value="">— tanlang —</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {sectionName(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-gray-600 sm:col-span-2">
            Slug *
            <input
              value={categoryForm.slug}
              disabled={!!editingCategory}
              onChange={(e) => setCategoryForm((f) => ({ ...f, slug: e.target.value }))}
              className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 text-sm disabled:bg-gray-100"
              placeholder="masalan: essences"
            />
          </label>
          <label className="text-xs font-medium text-gray-600">
            Nomi (UZ) *
            <input
              value={categoryForm.name_uz}
              onChange={(e) => setCategoryForm((f) => ({ ...f, name_uz: e.target.value }))}
              className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-gray-600">
            Tartib
            <input
              type="number"
              value={categoryForm.sort_order}
              onChange={(e) => setCategoryForm((f) => ({ ...f, sort_order: e.target.value }))}
              className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-gray-600">
            Nomi (RU)
            <input
              value={categoryForm.name_ru}
              onChange={(e) => setCategoryForm((f) => ({ ...f, name_ru: e.target.value }))}
              className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-gray-600">
            Nomi (EN)
            <input
              value={categoryForm.name_en}
              onChange={(e) => setCategoryForm((f) => ({ ...f, name_en: e.target.value }))}
              className="mt-1 h-10 w-full rounded-xl border border-gray-200 px-3 text-sm"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {editingCategory && (
            <button
              type="button"
              onClick={() => {
                setEditingCategory(null)
                setCategoryForm((f) => ({ ...emptyCategory, section_id: f.section_id }))
              }}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
            >
              Bekor
            </button>
          )}
          <button
            type="button"
            disabled={savingCategory || !supabase}
            onClick={() => void saveCategory()}
            className="rounded-xl bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60"
          >
            {savingCategory ? 'Saqlanmoqda…' : editingCategory ? 'Turkumni saqlash' : 'Turkum qo‘shish'}
          </button>
        </div>
      </Card>

      <Card>
        <CardTitle>Ro‘yxat</CardTitle>
        <CardSubtitle>{loading ? 'Yuklanmoqda…' : `${sections.length} bo‘lim, ${categories.length} turkum`}</CardSubtitle>
        <div className="mt-4 space-y-6">
          {!loading &&
            sections.map((sec) => (
              <div key={sec.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-gray-900">{sec.name_uz}</div>
                    <div className="text-xs text-gray-500">
                      slug: <code className="rounded bg-gray-100 px-1">{sec.slug}</code> · tartib: {sec.sort_order}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSection(sec)
                        setSectionForm({
                          slug: sec.slug,
                          name_uz: sec.name_uz,
                          name_ru: sec.name_ru ?? '',
                          name_en: sec.name_en ?? '',
                          sort_order: String(sec.sort_order),
                        })
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      aria-label="Tahrirlash"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeSection(sec.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-rose-700 hover:bg-rose-50"
                      aria-label="O‘chirish"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <ul className="mt-3 divide-y divide-gray-200/80 rounded-lg border border-gray-100 bg-white text-sm">
                  {(categoriesBySection.get(sec.id) ?? []).length === 0 ? (
                    <li className="px-3 py-2 text-gray-500">Turkum yo‘q</li>
                  ) : (
                    (categoriesBySection.get(sec.id) ?? []).map((cat) => (
                      <li key={cat.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                        <span>
                          <span className="font-medium text-gray-900">{cat.name_uz}</span>{' '}
                          <code className="text-[11px] text-gray-500">{cat.slug}</code>
                        </span>
                        <span className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategory(cat)
                              setCategoryForm({
                                section_id: cat.section_id,
                                slug: cat.slug,
                                name_uz: cat.name_uz,
                                name_ru: cat.name_ru ?? '',
                                name_en: cat.name_en ?? '',
                                sort_order: String(cat.sort_order),
                              })
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                            aria-label="Tahrirlash"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeCategory(cat)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-rose-700 hover:bg-rose-50"
                            aria-label="O‘chirish"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ))}
        </div>
      </Card>
    </div>
  )
}
