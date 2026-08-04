import { useState } from 'react'
import { improveBullet, type BulletResult } from '../services/llm'

interface BulletEditorProps {
  value: string
  onChange: (value: string) => void
  onRemove: () => void
}

export default function BulletEditor({ value, onChange, onRemove }: BulletEditorProps) {
  const [optimizing, setOptimizing] = useState(false)
  const [result, setResult] = useState<BulletResult | null>(null)
  const [error, setError] = useState('')

  const handleOptimize = async () => {
    if (!value.trim() || optimizing) return
    setOptimizing(true)
    setError('')
    try {
      setResult(await improveBullet(value.trim()))
    } catch (e) {
      setError(e instanceof Error ? e.message : '优化失败，请稍后重试')
    } finally {
      setOptimizing(false)
    }
  }

  const apply = () => {
    if (!result) return
    onChange(result.rewritten)
    setResult(null)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          placeholder="填写职责或成果，例如：负责 XX 模块开发，性能提升 50%…"
          className="min-h-[52px] flex-1 resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
        />
        <div className="flex shrink-0 flex-col gap-1.5">
          <button
            type="button"
            onClick={handleOptimize}
            disabled={optimizing || !value.trim()}
            className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {optimizing ? '优化中…' : '✨ 优化'}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-400 transition hover:border-red-200 hover:text-red-500"
          >
            删除
          </button>
        </div>
      </div>

      {error && <p className="ml-3.5 text-xs text-red-600">{error}</p>}

      {result && (
        <div className="ml-3.5 space-y-2.5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5">
          <p className="text-xs font-semibold text-indigo-900">改写建议</p>
          <p className="text-sm leading-relaxed text-slate-800">{result.rewritten}</p>

          {result.suggestions.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">改进建议</p>
              <ul className="space-y-0.5">
                {result.suggestions.map((s) => (
                  <li key={s} className="flex gap-1.5 text-xs leading-relaxed text-slate-600">
                    <span className="text-indigo-400">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.metrics.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">建议补充的量化指标</p>
              <div className="flex flex-wrap gap-1.5">
                {result.metrics.map((m) => (
                  <span key={m} className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs text-emerald-700 ring-1 ring-emerald-100">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={apply}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700"
            >
              应用改写
            </button>
            <button
              type="button"
              onClick={() => setResult(null)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 transition hover:text-slate-700"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
