import { useState } from 'react'
import { Card, CardSubtitle, CardTitle } from '../components/ui/Card'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const BROADCAST_TYPES = [
  { value: 'news', label: 'Yangiliklar' },
  { value: 'promotion', label: 'Aksiya/Chegirma' },
  { value: 'general', label: 'Umumiy' },
] as const

export default function XabarnomaPage() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [type, setType] = useState<'news' | 'promotion' | 'general'>('news')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) {
      setMessage({ type: 'error', text: 'Sarlavha va matnni to\'ldiring' })
      return
    }
    if (!isSupabaseConfigured || !supabase) {
      setMessage({ type: 'error', text: 'Supabase sozlanmagan' })
      return
    }

    setLoading(true)
    setMessage(null)
    const { error } = await supabase.from('admin_broadcasts').insert({
      title: title.trim(),
      body: body.trim(),
      type,
    })
    setLoading(false)

    if (error) {
      setMessage({ type: 'error', text: error.message })
      return
    }
    setMessage({ type: 'success', text: 'Xabar yuborildi! SkinBox ilovasida ko\'rinadi.' })
    setTitle('')
    setBody('')
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xl font-bold">Xabarnoma</div>
        <div className="mt-1 text-sm text-gray-500">
          SkinBox ilovasidagi Bildirishnomalar sahifasida ko‘rinadigan xabar yuborish.
        </div>
      </div>

      <Card>
        <CardTitle>Yuborish</CardTitle>
        <CardSubtitle>Xabar SkinBox foydalanuvchilariga ko‘rinadi</CardSubtitle>
        <div className="mt-4 grid gap-3">
          <input
            className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[rgb(var(--primary))]"
            placeholder="Sarlavha"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!isSupabaseConfigured}
          />
          <textarea
            className="min-h-[140px] w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[rgb(var(--primary))]"
            placeholder="Xabar matni"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={!isSupabaseConfigured}
          />
          <select
            className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[rgb(var(--primary))]"
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            disabled={!isSupabaseConfigured}
          >
            {BROADCAST_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !isSupabaseConfigured}
            className="w-fit rounded-xl bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Yuborilmoqda…' : 'Yuborish'}
          </button>
          {message && (
            <div
              className={`rounded-xl px-3 py-2 text-sm ${
                message.type === 'success'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {message.text}
            </div>
          )}
          {!isSupabaseConfigured && (
            <div className="text-xs text-gray-500">
              VITE_SUPABASE_URL va VITE_SUPABASE_ANON_KEY .env da sozlash kerak.
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

