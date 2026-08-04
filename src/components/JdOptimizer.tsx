import { useState } from 'react'
import { optimizeBulletsWithJd, type JdKeywordAnalysis } from '../services/llm'
import { collectBulletTargets } from '../lib/resumeUtils'
import type { BeautifyDraftItem, Resume } from '../types/resume'
import DraftItemsList from './DraftItemsList'
import { inputClass, labelClass } from './fields'

interface JdOptimizerProps {
  resume: Resume
  onApply: (items: BeautifyDraftItem[]) => void
  onClose: () => void
}

export default function JdOptimizer({ resume, onApply, onClose }: JdOptimizerProps) {
  const [jd, setJd] = useState('')
  const [position, setPosition] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState<BeautifyDraftItem[] | null>(null)
  const [keywords, setKeywords] = useState<JdKeywordAnalysis>({ matched: [], missing: [] })

  const submit = async () => {
    if (!jd.trim()) {
      setError('请先粘贴职位描述（JD）')
      return
    }
    const targets = collectBulletTargets(resume)
    if (!targets.length) {
      setError('没有可优化的条目，请先填写工作/项目经历')
      return
    }

    setLoading(true)
    setError('')
    try {
      const jdPrompt = [position.trim() && `目标岗位：${position.trim()}`, jd.trim()].filter(Boolean).join('\n\n')
      const { results, keywords: kw } = await optimizeBulletsWithJd(
        targets.map((t) => t.text),
        jdPrompt,
      )
      setItems(
        results.map((result, i) => ({
          key: targets[i].key,
          kind: 'bullet' as const,
          entryId: targets[i].entryId,
          bulletIndex: targets[i].bulletIndex,
          location: targets[i].location,
          original: result.original,
          rewritten: result.rewritten,
          suggestions: result.suggestions,
          metrics: result.metrics,
          accepted: true,
        })),
      )
      setKeywords(kw)
    } catch (e) {
      setError(e instanceof Error ? e.message : '分析失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const toggle = (key: string) => {
    setItems((current) => (current ? current.map((item) => (item.key === key ? { ...item, accepted: !item.accepted } : item)) : current))
  }

  const apply = () => {
    if (!items) return
    const accepted = items.filter((item) => item.accepted)
    if (!accepted.length) return
    onApply(accepted)
  }

  const acceptedCount = items?.filter((item) => item.accepted).length ?? 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-8">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">🎯 JD 定向优化</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {items ? '按职位描述改写完成，勾选要应用的条目' : '粘贴目标岗位的职位描述，按岗位关键词优化全部经历条目'}
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

        {!items ? (
          <div className="space-y-4 px-6 py-5">
            <div>
              <label className={labelClass}>目标岗位（可选）</label>
              <input
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="例如：高级前端工程师"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>职位描述（JD）</label>
              <textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                rows={8}
                placeholder="粘贴目标岗位的职位描述…"
                className={`${inputClass} resize-y leading-relaxed`}
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={loading}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {loading ? '分析中…' : '分析并优化'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-3">
              <p className="mb-1.5 text-xs font-semibold text-slate-500">关键词匹配分析</p>
              <div className="flex flex-wrap gap-1.5">
                {keywords.matched.map((k) => (
                  <span key={k} className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] text-emerald-700 ring-1 ring-emerald-100">
                    ✓ {k}
                  </span>
                ))}
                {keywords.missing.map((k) => (
                  <span key={k} className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] text-amber-700 ring-1 ring-amber-100">
                    ✗ {k}
                  </span>
                ))}
                {keywords.matched.length === 0 && keywords.missing.length === 0 && (
                  <span className="text-[11px] text-slate-400">未提取到关键词</span>
                )}
              </div>
            </div>
            <DraftItemsList items={items} onToggle={toggle} />
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
                  onClick={apply}
                  disabled={acceptedCount === 0}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  应用所选 ({acceptedCount})
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
