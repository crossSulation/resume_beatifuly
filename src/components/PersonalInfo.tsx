import { useState } from 'react'
import type { PersonalInfo as PersonalInfoData } from '../types/resume'
import { improveSummary, type BulletResult } from '../services/llm'
import SectionCard from './SectionCard'
import { inputClass, labelClass } from './fields'

interface PersonalInfoProps {
  value: PersonalInfoData
  onChange: (value: PersonalInfoData) => void
}

export default function PersonalInfo({ value, onChange }: PersonalInfoProps) {
  const [optimizing, setOptimizing] = useState(false)
  const [result, setResult] = useState<BulletResult | null>(null)
  const [error, setError] = useState('')
  const set = (patch: Partial<PersonalInfoData>) => onChange({ ...value, ...patch })

  const handleOptimize = async () => {
    const summary = value.summary.trim()
    if (!summary || optimizing) return
    setOptimizing(true)
    setError('')
    try {
      setResult(await improveSummary(summary))
    } catch (e) {
      setError(e instanceof Error ? e.message : '优化失败，请稍后重试')
    } finally {
      setOptimizing(false)
    }
  }

  const apply = () => {
    if (!result) return
    onChange({ ...value, summary: result.rewritten })
    setResult(null)
  }

  return (
    <SectionCard title="基本信息">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="name" className={labelClass}>姓名</label>
          <input id="name" value={value.name} onChange={(e) => set({ name: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label htmlFor="title" className={labelClass}>求职意向</label>
          <input id="title" value={value.title} onChange={(e) => set({ title: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label htmlFor="phone" className={labelClass}>电话</label>
          <input id="phone" value={value.phone} onChange={(e) => set({ phone: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label htmlFor="email" className={labelClass}>邮箱</label>
          <input id="email" value={value.email} onChange={(e) => set({ email: e.target.value })} className={inputClass} />
        </div>
        <div className="col-span-2">
          <label htmlFor="location" className={labelClass}>所在城市</label>
          <input id="location" value={value.location} onChange={(e) => set({ location: e.target.value })} className={inputClass} />
        </div>
      </div>
      <div className="mt-3">
        <label htmlFor="summary" className={labelClass}>个人简介</label>
        <div className="relative">
          <textarea
            id="summary"
            value={value.summary}
            onChange={(e) => set({ summary: e.target.value })}
            rows={4}
            placeholder="用 2-3 句话概括你的核心能力与优势…"
            className={`${inputClass} resize-y pr-16 leading-relaxed`}
          />
          <button
            type="button"
            onClick={() => void handleOptimize()}
            disabled={optimizing || !value.summary.trim()}
            className="absolute right-2 top-2 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {optimizing ? '优化中…' : '✨ 优化'}
          </button>
        </div>
        {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
        {result && (
          <div className="mt-2 space-y-2.5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5">
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
                    <span
                      key={m}
                      className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs text-emerald-700 ring-1 ring-emerald-100"
                    >
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
    </SectionCard>
  )
}
