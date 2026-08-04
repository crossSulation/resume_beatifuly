export interface BeautifyDraftItem {
  key: string
  kind: 'bullet' | 'summary'
  entryId?: string
  bulletIndex?: number
  location: string
  original: string
  rewritten: string
  suggestions: string[]
  metrics: string[]
  accepted: boolean
}

interface BeautifyReviewProps {
  items: BeautifyDraftItem[]
  onToggle: (key: string) => void
  onApply: () => void
  onClose: () => void
}

export default function BeautifyReview({ items, onToggle, onApply, onClose }: BeautifyReviewProps) {
  const acceptedCount = items.filter((item) => item.accepted).length

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-8">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">一键美化结果</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              共 {items.length} 条建议，勾选要应用的改写，未勾选的一律保留原文
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="rounded-lg px-2 py-1 text-lg leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

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
                  <p className="text-sm leading-relaxed text-slate-400 line-through decoration-slate-300">
                    {item.original}
                  </p>
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

        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <p className="text-xs text-slate-500">
            已选 <span className="font-semibold text-indigo-600">{acceptedCount}</span> / {items.length} 条
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={onApply}
              disabled={acceptedCount === 0}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              应用所选 ({acceptedCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
