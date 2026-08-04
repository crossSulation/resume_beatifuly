import type { BeautifyDraftItem } from '../types/resume'

interface DraftItemsListProps {
  items: BeautifyDraftItem[]
  onToggle: (key: string) => void
}

export default function DraftItemsList({ items, onToggle }: DraftItemsListProps) {
  return (
    <div className="max-h-[55vh] space-y-3 overflow-y-auto px-6 py-4">
      {items.map((item) => (
        <label
          key={item.key}
          className={`block cursor-pointer rounded-xl border p-4 transition ${
            item.accepted ? 'border-indigo-200 bg-indigo-50/40' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={item.accepted}
              onChange={() => onToggle(item.key)}
              className="mt-1 h-4 w-4 shrink-0 accent-indigo-600"
            />
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-xs font-medium text-slate-400">{item.location}</p>
              <p className="text-sm leading-relaxed text-slate-400 line-through decoration-slate-300">{item.original}</p>
              <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-800">{item.rewritten}</p>

              {item.suggestions.length > 0 && (
                <div className="mt-2.5">
                  <p className="mb-1 text-xs font-medium text-slate-500">改进建议</p>
                  <ul className="space-y-0.5">
                    {item.suggestions.map((s) => (
                      <li key={s} className="flex gap-1.5 text-xs leading-relaxed text-slate-500">
                        <span className="text-indigo-400">•</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {item.metrics.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {item.metrics.map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700 ring-1 ring-emerald-100"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </label>
      ))}
    </div>
  )
}
