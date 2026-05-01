import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Card, CardSubtitle, CardTitle } from '../components/ui/Card'
import { supabase } from '../lib/supabase'
import type { ProfileRow } from '../types/database.types'

export default function MijozlarPage() {
  const [rows, setRows] = useState<ProfileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        <CardSubtitle>Supabase `profiles` (admin policy)</CardSubtitle>
        <div className="mt-4 overflow-x-auto">
          {loading ? (
            <div className="rounded-2xl bg-gray-50 p-6 text-sm text-gray-600">Yuklanmoqda…</div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl bg-gray-50 p-6 text-sm text-gray-600">
              Profil yo‘q.
            </div>
          ) : (
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium text-gray-500">
                  <th className="py-2 pr-2">Ism</th>
                  <th className="py-2 pr-2">Telefon</th>
                  <th className="py-2 pr-2">Rol</th>
                  <th className="py-2 pr-2">Yangilangan</th>
                  <th className="py-2 pr-2">User ID</th>
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
                    <td className="py-3 pr-2 font-mono text-xs text-gray-500">{p.id}</td>
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
