import { useEffect, useState } from 'react'
import { TrendingDown, TrendingUp, Users, Package, ShoppingCart, Truck } from 'lucide-react'
import { Card, CardSubtitle, CardTitle } from '../components/ui/Card'
import { supabase } from '../lib/supabase'
import type { ProductRow } from '../types/database.types'

function StatCard({
  title,
  subtitle,
  value,
  changeText,
  trend,
  icon,
}: {
  title: string
  subtitle: string
  value: string
  changeText: string
  trend: 'up' | 'down'
  icon: React.ReactNode
}) {
  return (
    <Card className="flex items-start justify-between gap-4">
      <div>
        <CardSubtitle>{subtitle}</CardSubtitle>
        <CardTitle>{title}</CardTitle>
        <div className="mt-3 text-2xl font-bold">{value}</div>
        <div className="mt-2 flex items-center gap-1 text-xs text-gray-600">
          {trend === 'up' ? (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
          )}
          <span>{changeText}</span>
        </div>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-50 ring-1 ring-black/5">
        {icon}
      </div>
    </Card>
  )
}

function formatMoney(n: number) {
  return new Intl.NumberFormat('uz-UZ').format(Math.round(n)) + ' so‘m'
}

export default function DashboardPage() {
  const [productCount, setProductCount] = useState<number | null>(null)
  const [orderCount, setOrderCount] = useState<number | null>(null)
  const [customerCount, setCustomerCount] = useState<number | null>(null)
  const [pendingDelivery, setPendingDelivery] = useState<number | null>(null)
  const [revenue, setRevenue] = useState<number | null>(null)
  const [topProducts, setTopProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const [pc, oc, cc, orders, products] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('status, total'),
        supabase.from('products').select('*').order('sold_count', { ascending: false }).limit(4),
      ])
      if (cancelled) return
      setProductCount(pc.count ?? 0)
      setOrderCount(oc.count ?? 0)
      setCustomerCount(cc.count ?? 0)

      const ordRows = (orders.data ?? []) as { status: string; total: number }[]
      const pend = ordRows.filter((r) =>
        ['pending', 'confirmed', 'delivering'].includes(r.status)
      ).length
      setPendingDelivery(pend)
      const rev = ordRows
        .filter((r) => r.status === 'delivered')
        .reduce((s, r) => s + Number(r.total ?? 0), 0)
      setRevenue(rev)
      setTopProducts((products.data as ProductRow[]) ?? [])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const dashLoading = loading || productCount === null

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <div className="text-xl font-bold">Umumiy ko‘rinish</div>
          <div className="mt-1 text-sm text-gray-500">
            Supabase jadvalaridan jonli statistikalar
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Yetkazilgan buyurtma summasi"
          subtitle="Barcha vaqt (delivered)"
          value={dashLoading ? '…' : formatMoney(revenue ?? 0)}
          changeText="Status bo‘yicha"
          trend="up"
          icon={<Package className="h-5 w-5 text-gray-600" />}
        />
        <StatCard
          title="Jami buyurtma"
          subtitle="Barcha statuslar"
          value={dashLoading ? '…' : String(orderCount ?? 0)}
          changeText="orders jadvali"
          trend="up"
          icon={<ShoppingCart className="h-5 w-5 text-gray-600" />}
        />
        <StatCard
          title="Jami mijoz"
          subtitle="profiles"
          value={dashLoading ? '…' : String(customerCount ?? 0)}
          changeText="ro‘yxat"
          trend="down"
          icon={<Users className="h-5 w-5 text-gray-600" />}
        />
        <StatCard
          title="Faol yetkazish"
          subtitle="pending + confirmed + delivering"
          value={dashLoading ? '…' : String(pendingDelivery ?? 0)}
          changeText="buyurtmalar"
          trend="up"
          icon={<Truck className="h-5 w-5 text-gray-600" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Mahsulotlar</CardTitle>
              <CardSubtitle>Jami sondan</CardSubtitle>
            </div>
            <div className="text-sm font-semibold text-gray-800">
              {dashLoading ? '…' : `${productCount ?? 0} ta`}
            </div>
          </div>
          <div className="mt-5 h-[220px] rounded-2xl bg-gray-50 ring-1 ring-black/5 flex items-center justify-center text-sm text-gray-500">
            Batafsil grafik keyinroq qo‘shiladi — hozir jamlanma kartochkalarda
          </div>
        </Card>

        <Card>
          <CardTitle>Ombor eslatmasi</CardTitle>
          <CardSubtitle>in_stock = false</CardSubtitle>
          <div className="mt-5 h-[220px] rounded-2xl bg-gray-50 ring-1 ring-black/5 flex items-center justify-center text-sm text-gray-500 px-4 text-center">
            «Ombor» sahifasida zaxirani boshqaring
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Eng ko‘p sotilgan (sold_count)</CardTitle>
              <CardSubtitle>Top 4</CardSubtitle>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {dashLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-gray-50 ring-1 ring-black/5 p-3 animate-pulse"
                  >
                    <div className="aspect-square rounded-xl bg-white ring-1 ring-black/5" />
                    <div className="mt-3 h-4 w-3/4 rounded bg-gray-200" />
                  </div>
                ))
              : topProducts.length === 0
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-2xl bg-gray-50 ring-1 ring-black/5 p-3"
                    >
                      <div className="aspect-square rounded-xl bg-white ring-1 ring-black/5" />
                      <div className="mt-3 text-sm font-semibold text-gray-800">
                        Mahsulot yo‘q
                      </div>
                      <div className="mt-1 text-xs text-gray-500">0 dona</div>
                    </div>
                  ))
                : topProducts.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-2xl bg-gray-50 ring-1 ring-black/5 p-3"
                    >
                      <div className="aspect-square overflow-hidden rounded-xl bg-white ring-1 ring-black/5">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="mt-3 text-sm font-semibold text-gray-800 line-clamp-2">
                        {p.name}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {p.sold_count ?? 0} sotilgan
                      </div>
                    </div>
                  ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Tezkor havola</CardTitle>
          <CardSubtitle>Admin vazifalar</CardSubtitle>
          <div className="mt-5 space-y-3 text-sm text-gray-600">
            <p>Mahsulot qo‘shish / tahrirlash — «Mahsulotlar».</p>
            <p>Buyurtma statusi — «Buyurtmalar».</p>
            <p>Profillar — «Mijozlar».</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
