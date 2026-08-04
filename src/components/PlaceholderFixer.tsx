import { useState, type ReactNode } from 'react'
import { PLACEHOLDER_RE, collectPlaceholderItems, type PlaceholderItem } from '../lib/analysis'
import type { PlaceholderUpdate } from '../lib/resumeUtils'
import type { Resume } from '../types/resume'
import { inputClass } from './fields'

interface PlaceholderFixerProps {
  resume: Resume
  onApply: (updates: PlaceholderUpdate[]) => void
  onClose: () => void
}

export default function PlaceholderFixer({ resume, onApply, onClose }: PlaceholderFixerProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const items = collectPlaceholderItems(resume)

  const setValue = (key: string, value: string) => {
    setValues((v) => ({ ...v, [key]: value }))
  }

  const renderPreview = (item: PlaceholderItem): ReactNode[] => {
    const parts = item.text.split(PLACEHOLDER_RE)
    const matches = item.text.match(PLACEHOLDER_RE) ?? []
    const nodes: ReactNode[] = []
    parts.forEach((part, i) => {
      if (part) nodes.push(<span key={`p${i}`}>{part}</span>)
      if (i < matches.length) {
        const placeholder = matches[i]
        const value = (values[`${item.key}|${placeholder}`] ?? '').trim()
        nodes.push(
          <mark key={`m${i}`} className="rounded bg-amber-100 px-1 text-amber-800">
            {value || placeholder}
          </mark>,
        )
      }
    })
    return nodes
  }

  const filledCount = items.filter((item) =>
    [...new Set(item.placeholders)].some((ph) => (values[`${item.key}|${ph}`] ?? '').trim()),
  ).length

  const apply = () => {
    const updates: PlaceholderUpdate[] = []
    for (const item of items) {
      let next = item.text
      for (const placeholder of [...new Set(item.placeholders)]) {
        const value = (values[`${item.key}|${placeholder}`] ?? '').trim()
        if (!value) continue
        next = next.split(placeholder).join(value)
      }
      if (next !== item.text) {
        updates.push({
          key: item.key,
          kind: item.kind,
          entryId: item.entryId,
          bulletIndex: item.bulletIndex,
          text: next,
        })
      }
    }
    if (updates.length) onApply(updates)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-8">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">🔢 补全占位数据</h3>
            <p className="mt-0.5 text-xs text-slate-500">把 [X%]、[N 人] 等占位符替换为真实数据，实时预览效果</p>
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
            <div key={item.key} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-xs font-medium text-slate-400">{item.location}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{renderPreview(item)}</p>
              <div className="mt-3 space-y-2">
                {[...new Set(item.placeholders)].map((placeholder) => (
                  <div key={placeholder} className="flex items-center gap-2">
                    <span className="shrink-0 rounded-md bg-amber-100 px-2 py-1 font-mono text-xs text-amber-800">
                      {placeholder}
                    </span>
                    <input
                      value={values[`${item.key}|${placeholder}`] ?? ''}
                      onChange={(e) => setValue(`${item.key}|${placeholder}`, e.target.value)}
                      placeholder="填写真实数值，如 35%"
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <p className="text-xs text-slate-500">
            已填写 <span className="font-semibold text-indigo-600">{filledCount}</span> / {items.length} 条
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
              onClick={apply}
              disabled={filledCount === 0}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              应用已填写 ({filledCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
