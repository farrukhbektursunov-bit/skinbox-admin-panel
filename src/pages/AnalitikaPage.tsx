import { Card, CardSubtitle, CardTitle } from '../components/ui/Card'

export default function AnalitikaPage() {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xl font-bold">Analitika</div>
        <div className="mt-1 text-sm text-gray-500">
          Hozircha ma’lumotlar 0 ta. DB ulanganidan keyin grafiklar to‘ldiriladi.
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Sotuv trendi</CardTitle>
          <CardSubtitle>Kunlik/haftalik (demo)</CardSubtitle>
          <div className="mt-4 h-[260px] rounded-2xl bg-gray-50 ring-1 ring-black/5 flex items-center justify-center text-sm text-gray-500">
            Grafik yo‘q (0 ta)
          </div>
        </Card>
        <Card>
          <CardTitle>Mijozlar oqimi</CardTitle>
          <CardSubtitle>Yangi va qaytgan (demo)</CardSubtitle>
          <div className="mt-4 h-[260px] rounded-2xl bg-gray-50 ring-1 ring-black/5 flex items-center justify-center text-sm text-gray-500">
            Grafik yo‘q (0 ta)
          </div>
        </Card>
      </div>
    </div>
  )
}

