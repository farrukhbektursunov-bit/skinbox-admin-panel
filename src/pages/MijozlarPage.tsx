import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { MessageSquare } from 'lucide-react'
import { Card, CardSubtitle, CardTitle } from '../components/ui/Card'
import { supabase } from '../lib/supabase'
import type { ProfileRow } from '../types/database.types'

export default function MijozlarPage() {
  const [rows, setRows] = useState<ProfileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [messageTarget, setMessageTarget] = useState<ProfileRow | null>(null)
  const [msgTitle, setMsgTitle] = useState('')
  const [msgBody, setMsgBody] = useState('')
  const [msgSending, setMsgSending] = useState(false)
  const [msgFeedback, setMsgFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError(null)
    const { data, error: e } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, updated_at, phone, birth_date, gender, role')
      .order('updated_at', { ascending: false })
    setLoading(false)
    if (e) {
      setError(e.message)
      return
    }
    setRows((data as ProfileRow[]) ?? [])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function openMessageModal(profile: ProfileRow) {
    setMessageTarget(profile)
    setMsgTitle('')
    setMsgBody('')
    setMsgFeedback(null)
  }

  function closeMessageModal() {
    setMessageTarget(null)
    setMsgTitle('')
    setMsgBody('')
    setMsgFeedback(null)
  }

  async function sendMessage() {
    if (!supabase || !messageTarget) return
    if (!msgTitle.trim() || !msgBody.trim()) {
      setMsgFeedback({ type: 'error', text: "Sarlavha va matnni to'ldiring" })
      return
    }
    setMsgSending(true)
    setMsgFeedback(null)
    const { error: e } = await supabase.from('user_notifications').insert({
      user_id: messageTarget.id,
      title: msgTitle.trim(),
      body: msgBody.trim(),
      type: 'message',
    })
    setMsgSending(false)
    if (e) {
      setMsgFeedback({ type: 'error', text: e.message })
      return
    }
    setMsgFeedback({ type: 'success', text: 'Xabar mijozga yuborildi!' })
    setTimeout(() => closeMessageModal(), 1200)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xl font-bold">Mijozlar</div>
          <div className="mt-1 text-sm text-gray-500">
            Profillar:{' '}
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
        <CardSubtitle>Har bir mijozga alohida xabar yuborish mumkin</CardSubtitle>
        <div className="mt-4 overflow-x-auto">
          {loading ? (
            <div className="rounded-2xl bg-gray-50 p-6 text-sm text-gray-600">Yuklanmoqda…</div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl bg-gray-50 p-6 text-sm text-gray-600">
              Profil yo‘q.
            </div>
          ) : (
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium text-gray-500">
                  <th className="py-2 pr-2">Ism</th>
                  <th className="py-2 pr-2">Telefon</th>
                  <th className="py-2 pr-2">Rol</th>
                  <th className="py-2 pr-2">Yangilangan</th>
                  <th className="py-2 pr-2 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="py-3 pr-2 font-medium text-gray-900">
                      {p.full_name || '—'}
                    </td>
                    <td className="py-3 pr-2 text-gray-700">{p.phone ?? '—'}</td>
                    <td className="py-3 pr-2">
                      <span
                        className={
                          p.role === 'admin'
                            ? 'rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-800'
                            : 'rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600'
                        }
                      >
                        {p.role ?? 'user'}
                      </span>
                    </td>
                    <td className="py-3 pr-2 whitespace-nowrap text-gray-600">
                      {p.updated_at
                        ? format(new Date(p.updated_at), 'dd.MM.yyyy')
                        : '—'}
                    </td>
                    <td className="py-3 pr-2 text-right">
                      <button
                        type="button"
                        onClick={() => openMessageModal(p)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[rgb(var(--primary))]/10 px-3 py-1.5 text-xs font-semibold text-[rgb(var(--primary))] hover:bg-[rgb(var(--primary))]/20"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Xabar yuborish
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {messageTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            role="dialog"
            aria-labelledby="msg-modal-title"
          >
            <h2 id="msg-modal-title" className="text-lg font-bold text-gray-900">
              Xabar yuborish
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Qabul qiluvchi:{' '}
              <span className="font-medium text-gray-800">
                {messageTarget.full_name || messageTarget.phone || messageTarget.id}
              </span>
            </p>
            <div className="mt-4 grid gap-3">
              <input
                className="h-10 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-[rgb(var(--primary))]"
                placeholder="Sarlavha"
                value={msgTitle}
                onChange={(e) => setMsgTitle(e.target.value)}
              />
              <textarea
                className="min-h-[120px] w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[rgb(var(--primary))]"
                placeholder="Xabar matni"
                value={msgBody}
                onChange={(e) => setMsgBody(e.target.value)}
              />
              {msgFeedback && (
                <div
                  className={`rounded-xl px-3 py-2 text-sm ${
                    msgFeedback.type === 'success'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {msgFeedback.text}
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeMessageModal}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={msgSending}
                onClick={() => void sendMessage()}
                className="rounded-xl bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60"
              >
                {msgSending ? 'Yuborilmoqda…' : 'Yuborish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
