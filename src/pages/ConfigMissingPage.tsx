export default function ConfigMissingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5">
        <h1 className="text-lg font-bold text-gray-900">Supabase sozlanmagan</h1>
        <p className="mt-2 text-sm text-gray-600">
          Loyiha ildizida <code className="rounded bg-gray-100 px-1">.env</code> fayl yarating va
          quyidagilarni qo‘ying (Supabase loyiha → Settings → API):
        </p>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-gray-900 p-4 text-xs text-gray-100">
          {`VITE_SUPABASE_URL=...\nVITE_SUPABASE_ANON_KEY=...`}
        </pre>
        <p className="mt-4 text-xs text-gray-500">
          Namuna: <code className="rounded bg-gray-100 px-1">.env.example</code>
        </p>
      </div>
    </div>
  )
}
