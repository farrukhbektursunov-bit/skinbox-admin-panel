import { Card, CardSubtitle, CardTitle } from '../components/ui/Card'

export default function SotuvlarPage() {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xl font-bold">Sotuvlar</div>
        <div className="mt-1 text-sm text-gray-500">
          Sotuvlar bo‘yicha hisobotlar hozircha 0 ta.
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Kunlik sotuv</CardTitle>
          <CardSubtitle>Demo</CardSubtitle>
          <div className="mt-4 h-[240px] rounded-2xl bg-gray-50 ring-1 ring-black/5 flex items-center justify-center text-sm text-gray-500">
            0 so‘m
          </div>
        </Card>
        <Card>
          <CardTitle>Oylik sotuv</CardTitle>
          <CardSubtitle>Demo</CardSubtitle>
          <div className="mt-4 h-[240px] rounded-2xl bg-gray-50 ring-1 ring-black/5 flex items-center justify-center text-sm text-gray-500">
            0 so‘m
          </div>
        </Card>
      </div>
    </div>
  )
}

