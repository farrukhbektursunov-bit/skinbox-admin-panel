import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  Banknote,
  ChevronDown,
  ChevronUp,
  CreditCard,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  ShoppingBag,
  StickyNote,
  Tag,
  User,
} from 'lucide-react'
import { Card, CardSubtitle, CardTitle } from '../components/ui/Card'
import { supabase } from '../lib/supabase'
import type { OrderPaymentMethod, OrderRow, OrderStatus } from '../types/database.types'

interface OrderItem {
  product_id?: string | null
  product_name?: string | null
  name?: string | null
  image?: string | null
  quantity?: number | string | null
  price?: number | string | null
}

const STATUSES: { value: OrderStatus; label: string; emoji: string; className: string }[] = [
  {
    value: 'pending',
    label: 'Kutilmoqda',
    emoji: '⏳',
    className: 'bg-amber-50 text-amber-800 ring-amber-200',
  },
  {
    value: 'awaiting_payment',
    label: 'To‘lov kutilmoqda',
    emoji: '💳',
    className: 'bg-sky-50 text-sky-800 ring-sky-200',
  },
  {
    value: 'confirmed',
    label: 'Tasdiqlangan',
    emoji: '✅',
    className: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  },
  {
    value: 'delivering',
    label: 'Yetkazilmoqda',
    emoji: '🚚',
    className: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  },
  {
    value: 'delivered',
    label: 'Yetkazilgan',
    emoji: '📦',
    className: 'bg-violet-50 text-violet-800 ring-violet-200',
  },
  {
    value: 'cancelled',
    label: 'Bekor',
    emoji: '❌',
    className: 'bg-rose-50 text-rose-800 ring-rose-200',
  },
]

const STATUS_MAP = new Map(STATUSES.map((s) => [s.value, s]))

const FILTERS: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Barchasi' },
  ...STATUSES.map((s) => ({ value: s.value, label: s.label })),
]

const PAYMENT_LABELS: Record<OrderPaymentMethod, { label: string; emoji: string }> = {
  cod: { label: 'Naqd — yetkazib berishda', emoji: '💵' },
  click: { label: 'Click (online)', emoji: '💳' },
}

function formatMoney(n: number) {
  return new Intl.NumberFormat('uz-UZ').format(Math.round(n)) + ' so‘m'
}

function shortOrderId(id: string) {
  return id.slice(0, 8).toUpperCase()
}

function paymentInfo(o: OrderRow) {
  if (o.payment_method && PAYMENT_LABELS[o.payment_method]) {
    return PAYMENT_LABELS[o.payment_method]
  }
  if (o.status === 'awaiting_payment') return PAYMENT_LABELS.click
  return PAYMENT_LABELS.cod
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

export default function BuyurtmalarPage() {
  const [rows, setRows] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [statusHint, setStatusHint] = useState<string | null>(null)
  const [messageOrder, setMessageOrder] = useState<OrderRow | null>(null)
  const [msgTitle, setMsgTitle] = useState('')
  const [msgBody, setMsgBody] = useState('')
  const [msgSending, setMsgSending] = useState(false)
  const [msgFeedback, setMsgFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!supabase) return
    if (opts?.silent) setRefreshing(true)
    else setLoading(true)
    setError(null)
    const { data, error: e } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    if (opts?.silent) setRefreshing(false)
    else setLoading(false)
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
    setStatusHint('Holat yangilandi — mijozga bildirishnoma yuborildi.')
    window.setTimeout(() => setStatusHint(null), 4000)
    void load({ silent: true })
  }

  async function saveTracking(
    id: string,
    fields: { tracking_number: string; tracking_url: string; carrier: string },
  ) {
    if (!supabase) return
    const { error: e } = await supabase
      .from('orders')
      .update({
        tracking_number: fields.tracking_number.trim() || null,
        tracking_url: fields.tracking_url.trim() || null,
        carrier: fields.carrier.trim() || null,
      })
      .eq('id', id)
    if (e) {
      setError(e.message)
      return
    }
    setStatusHint('Tracking saqlandi.')
    window.setTimeout(() => setStatusHint(null), 4000)
    void load({ silent: true })
  }

  function openOrderMessage(order: OrderRow) {
    setMessageOrder(order)
    setMsgTitle(`Buyurtma #${shortOrderId(order.id)}`)
    setMsgBody('')
    setMsgFeedback(null)
  }

  function closeOrderMessage() {
    setMessageOrder(null)
    setMsgTitle('')
    setMsgBody('')
    setMsgFeedback(null)
  }

  async function sendOrderMessage() {
    if (!supabase || !messageOrder) return
    if (!msgTitle.trim() || !msgBody.trim()) {
      setMsgFeedback({ type: 'error', text: "Sarlavha va matnni to'ldiring" })
      return
    }
    setMsgSending(true)
    setMsgFeedback(null)
    const { error: e } = await supabase.from('user_notifications').insert({
      user_id: messageOrder.user_id,
      title: msgTitle.trim(),
      body: msgBody.trim(),
      type: 'message',
      order_id: messageOrder.id,
    })
    setMsgSending(false)
    if (e) {
      setMsgFeedback({ type: 'error', text: e.message })
      return
    }
    setMsgFeedback({ type: 'success', text: 'Xabar mijozga yuborildi!' })
    window.setTimeout(() => closeOrderMessage(), 1200)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false
      if (!q) return true
      const hay = [
        shortOrderId(o.id),
        o.full_name,
        o.phone,
        o.address,
        o.delivery_region ?? '',
        o.note ?? '',
        o.coupon_code ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [rows, statusFilter, search])

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xl font-bold">Buyurtmalar</div>
          <div className="mt-1 text-sm text-gray-500">
            Jami:{' '}
            <span className="font-semibold text-gray-700">
              {loading ? '…' : `${rows.length} ta`}
            </span>
            {statusFilter !== 'all' && !loading ? (
              <>
                {' '}
                · Filtr bo‘yicha:{' '}
                <span className="font-semibold text-gray-700">{filtered.length} ta</span>
              </>
            ) : null}
            <span className="mt-1 block text-xs text-gray-400">
              Status o‘zgarganda mijoz ilovasiga avtomatik bildirishnoma yuboriladi.
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load({ silent: true })}
          disabled={loading || refreshing}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-black/10 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Yangilash
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
          {error}
        </div>
      )}

      {statusHint && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
          {statusHint}
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={
                  statusFilter === f.value
                    ? 'rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white'
                    : 'rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200'
                }
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Qidirish: #ID, ism, telefon, manzil…"
            className="h-9 w-full max-w-[280px] rounded-lg border border-gray-200 bg-white px-3 text-sm placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
          />
        </div>
      </Card>

      {loading ? (
        <Card>
          <div className="rounded-2xl bg-gray-50 p-6 text-sm text-gray-600">
            Yuklanmoqda…
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardTitle>Buyurtma yo‘q</CardTitle>
          <CardSubtitle>
            {rows.length === 0
              ? 'Hozircha hech qanday buyurtma yo‘q.'
              : 'Filtr bo‘yicha mos buyurtma topilmadi.'}
          </CardSubtitle>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              expanded={expanded.has(o.id)}
              onToggle={() => toggleExpanded(o.id)}
              onStatusChange={(s) => void setStatus(o.id, s)}
              onSaveTracking={(fields) => void saveTracking(o.id, fields)}
              onMessage={() => openOrderMessage(o)}
            />
          ))}
        </div>
      )}

      {messageOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">Mijozga xabar</h2>
            <p className="mt-1 text-sm text-gray-500">
              Buyurtma #{shortOrderId(messageOrder.id)} · {messageOrder.full_name || '—'}
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
                onClick={closeOrderMessage}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={msgSending}
                onClick={() => void sendOrderMessage()}
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

function OrderCard({
  order,
  expanded,
  onToggle,
  onStatusChange,
  onSaveTracking,
  onMessage,
}: {
  order: OrderRow
  expanded: boolean
  onToggle: () => void
  onStatusChange: (s: OrderStatus) => void
  onSaveTracking: (fields: {
    tracking_number: string
    tracking_url: string
    carrier: string
  }) => void
  onMessage: () => void
}) {
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number ?? '')
  const [trackingUrl, setTrackingUrl] = useState(order.tracking_url ?? '')
  const [carrier, setCarrier] = useState(order.carrier ?? '')

  const items = useMemo(() => parseItems(order.items), [order.items])
  const status = STATUS_MAP.get(order.status) ?? STATUSES[0]
  const pay = paymentInfo(order)
  const dt = order.created_at ? new Date(order.created_at) : null

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3">
        <div className="flex items-center gap-2 text-sm">
          <ShoppingBag className="h-4 w-4 text-gray-500" />
          <span className="font-bold text-gray-900">
            BUYURTMA #{shortOrderId(order.id)}
          </span>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${status.className}`}
        >
          <span>{status.emoji}</span>
          <span>{status.label}</span>
        </span>
      </div>

      <div className="space-y-2.5 px-5 py-4 text-sm">
        <Line icon={<User className="h-4 w-4" />} label="Mijoz">
          <span className="font-medium text-gray-900">{order.full_name || '—'}</span>
        </Line>
        <Line icon={<Phone className="h-4 w-4" />} label="Telefon">
          <a href={`tel:${order.phone}`} className="text-gray-800 hover:underline">
            {order.phone || '—'}
          </a>
        </Line>
        <Line icon={<MapPin className="h-4 w-4" />} label="Manzil">
          <span className="text-gray-800">
            {order.delivery_region ? (
              <span className="mr-1 inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-700">
                {order.delivery_region}
              </span>
            ) : null}
            {order.address || '—'}
          </span>
        </Line>
        {order.note ? (
          <Line icon={<StickyNote className="h-4 w-4" />} label="Izoh">
            <span className="text-gray-700">{order.note}</span>
          </Line>
        ) : null}
      </div>

      <div className="border-t border-gray-100 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            🧾 Mahsulotlar
          </div>
          {items.length > 2 ? (
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900"
            >
              {expanded ? (
                <>
                  Kamroq <ChevronUp className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  Hammasi ({items.length}) <ChevronDown className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          ) : null}
        </div>
        <ul className="mt-2 space-y-1.5 text-sm">
          {(expanded ? items : items.slice(0, 2)).map((it, idx) => {
            const qty = Number(it.quantity ?? 1) || 1
            const price = Number(it.price ?? 0) || 0
            const name = it.product_name || it.name || 'Mahsulot'
            return (
              <li
                key={`${order.id}-${idx}`}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-gray-800">
                  • {name} <span className="text-gray-500">x{qty}</span>
                </span>
                <span className="font-medium text-gray-900">
                  {formatMoney(price * qty)}
                </span>
              </li>
            )
          })}
          {items.length === 0 ? (
            <li className="text-xs text-gray-500">— Mahsulot ma’lumoti yo‘q</li>
          ) : null}
        </ul>
      </div>

      <div className="space-y-2.5 border-t border-gray-100 bg-gray-50/60 px-5 py-4 text-sm">
        <Line
          icon={
            order.payment_method === 'click' ? (
              <CreditCard className="h-4 w-4" />
            ) : (
              <Banknote className="h-4 w-4" />
            )
          }
          label="To‘lov usuli"
        >
          <span className="text-gray-800">
            {pay.emoji} {pay.label}
          </span>
        </Line>
        {order.coupon_code ? (
          <Line icon={<Tag className="h-4 w-4" />} label="Kupon">
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
              {order.coupon_code}
            </span>
          </Line>
        ) : null}
        {typeof order.subtotal === 'number' && order.subtotal > 0 ? (
          <SmallRow label="Mahsulotlar">{formatMoney(Number(order.subtotal))}</SmallRow>
        ) : null}
        {typeof order.shipping_cost === 'number' && order.shipping_cost > 0 ? (
          <SmallRow label="Yetkazib berish">
            {formatMoney(Number(order.shipping_cost))}
          </SmallRow>
        ) : null}
        {typeof order.discount_total === 'number' && order.discount_total > 0 ? (
          <SmallRow label="Chegirma">
            <span className="text-rose-600">
              −{formatMoney(Number(order.discount_total))}
            </span>
          </SmallRow>
        ) : null}
        <div className="flex items-center justify-between border-t border-gray-200 pt-2 text-base">
          <span className="font-semibold text-gray-900">💰 Jami</span>
          <span className="text-lg font-bold text-gray-900">
            {formatMoney(Number(order.total ?? 0))}
          </span>
        </div>
      </div>

      {(order.status === 'delivering' || order.status === 'delivered' || order.tracking_number) && (
        <div className="space-y-2 border-t border-gray-100 px-5 py-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            📦 Tracking
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="Kuryer / pochta"
              className="h-9 rounded-lg border border-gray-200 px-2 text-xs"
            />
            <input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Tracking raqam"
              className="h-9 rounded-lg border border-gray-200 px-2 text-xs"
            />
            <input
              value={trackingUrl}
              onChange={(e) => setTrackingUrl(e.target.value)}
              placeholder="Tracking havola (ixtiyoriy)"
              className="h-9 rounded-lg border border-gray-200 px-2 text-xs"
            />
          </div>
          <button
            type="button"
            onClick={() =>
              onSaveTracking({
                tracking_number: trackingNumber,
                tracking_url: trackingUrl,
                carrier,
              })
            }
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800"
          >
            Trackingni saqlash
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-5 py-3">
        <div className="text-xs text-gray-500">
          🕐 {dt ? format(dt, 'dd.MM.yyyy HH:mm') : '—'}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onMessage}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Xabar
          </button>
          <label className="text-xs text-gray-500">Status:</label>
          <select
            value={order.status}
            onChange={(e) => onStatusChange(e.target.value as OrderStatus)}
            className="h-8 max-w-[180px] rounded-lg border border-gray-200 bg-white px-2 text-xs"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.emoji} {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Card>
  )
}

function Line({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center text-gray-500">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
          {label}
        </div>
        <div className="mt-0.5 break-words">{children}</div>
      </div>
    </div>
  )
}

function SmallRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-xs text-gray-600">
      <span>{label}</span>
      <span className="font-medium text-gray-800">{children}</span>
    </div>
  )
}
