import type { ReactNode } from 'react'

interface SectionCardProps {
  title: string
  count?: number
  children: ReactNode
}

export default function SectionCard({ title, count, children }: SectionCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        {typeof count === 'number' && (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">{count}</span>
        )}
      </div>
      {children}
    </section>
  )
}
