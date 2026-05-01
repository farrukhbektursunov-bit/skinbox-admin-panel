import type { ReactNode } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-[1400px] gap-6 px-4 py-6">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <Topbar />
          <main className="mt-6">{children}</main>
        </div>
      </div>
    </div>
  )
}

