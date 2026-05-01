import type { ReactNode } from 'react'
import { clsx } from 'clsx'

export function Card({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={clsx(
        'rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5',
        className
      )}
    >
      {children}
    </section>
  )
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <div className="text-sm font-semibold text-gray-900">{children}</div>
}

export function CardSubtitle({ children }: { children: ReactNode }) {
  return <div className="text-xs text-gray-500">{children}</div>
}

