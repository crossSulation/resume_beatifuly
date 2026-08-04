import type { BeautifyDraftItem } from '../types/resume'
import DraftItemsList from './DraftItemsList'

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

        <DraftItemsList items={items} onToggle={onToggle} />

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
