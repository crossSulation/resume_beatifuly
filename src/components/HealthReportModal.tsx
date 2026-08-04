import { useMemo, useState } from 'react'
import { analyzeResumeWithLlm, type ResumeDeepAnalysis } from '../services/llm'
import { buildMarkdown } from '../lib/markdown'
import { analyzeResume } from '../lib/analysis'
import type { Resume } from '../types/resume'

interface HealthReportModalProps {
  resume: Resume
  onClose: () => void
}

function StatBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="text-slate-400">
          {value} / {max}（{pct}%）
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function CountRow({ label, value, tone }: { label: string; value: number | string; tone?: 'warn' }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
      <span className="text-slate-600">{label}</span>
      <span
        className={
          tone === 'warn' && (typeof value !== 'number' || value > 0)
            ? 'font-semibold text-amber-600'
            : 'font-semibold text-slate-700'
        }
      >
        {value}
      </span>
    </div>
  )
}

export default function HealthReportModal({ resume, onClose }: HealthReportModalProps) {
  const report = useMemo(() => analyzeResume(resume), [resume])
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<ResumeDeepAnalysis | null>(null)
  const [analysisError, setAnalysisError] = useState('')
  const scoreColor =
    report.score >= 80 ? 'text-emerald-600' : report.score >= 60 ? 'text-amber-600' : 'text-red-600'

  const runDeepAnalysis = async () => {
    if (analyzing) return
    setAnalyzing(true)
    setAnalysisError('')
    try {
      setAnalysis(await analyzeResumeWithLlm(buildMarkdown(resume)))
    } catch (e) {
      setAnalysisError(e instanceof Error ? e.message : '深度分析失败，请稍后重试')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-8">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">📋 简历体检报告</h3>
            <p className="mt-0.5 text-xs text-slate-500">本地规则即时扫描 + 可选的 LLM 深度分析</p>
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

        <div className="max-h-[65vh] overflow-y-auto px-6 py-5">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-slate-50 ring-4 ring-slate-100">
              <span className={`text-3xl font-bold ${scoreColor}`}>{report.score}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">简历健康度</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {report.score >= 80 ? '状态良好，可以准备投递了' : report.score >= 60 ? '基础不错，还有优化空间' : '建议先补充内容再投递'}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <StatBar label="量化条目占比" value={report.quantifiedCount} max={report.bulletCount} />
            <StatBar label="强动词开头占比" value={report.strongVerbCount} max={report.bulletCount} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <CountRow label="弱表达条目" value={report.weakPhraseCount} tone="warn" />
            <CountRow label="超长条目（>45字）" value={report.overlongCount} tone="warn" />
            <CountRow label="待补占位符" value={report.placeholderCount} tone="warn" />
            <CountRow label="个人简介" value={report.summaryOk ? '合适' : '需调整'} tone={report.summaryOk ? undefined : 'warn'} />
            <CountRow label="技能标签" value={resume.skills.length} />
            <CountRow label="经历条目总数" value={report.bulletCount} />
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold text-slate-600">改进建议</p>
            <ul className="space-y-1.5">
              {report.suggestions.map((s) => (
                <li key={s} className="flex gap-2 rounded-lg bg-amber-50/60 px-3 py-2 text-xs leading-relaxed text-slate-600">
                  <span className="text-amber-500">◆</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">✨ 深度分析（LLM）</p>
                <p className="mt-0.5 text-xs text-slate-500">从招聘官视角评估整体质量、风险与改进方向</p>
              </div>
              {!analysis && (
                <button
                  type="button"
                  onClick={() => void runDeepAnalysis()}
                  disabled={analyzing}
                  className="rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {analyzing ? '分析中…' : '开始深度分析'}
                </button>
              )}
            </div>

            {analysisError && <p className="mt-3 text-xs text-red-600">{analysisError}</p>}

            {analysis && (
              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                  <span className="text-xs font-medium text-slate-500">LLM 评分</span>
                  <span className="text-2xl font-bold text-indigo-600">{analysis.score}</span>
                  <span className="text-xs text-slate-400">/ 100</span>
                </div>
                <p className="text-sm leading-relaxed text-slate-700">{analysis.overallAssessment}</p>
                <AnalysisList title="做得好的地方" items={analysis.strengths} tone="good" />
                <AnalysisList title="主要风险" items={analysis.risks} tone="warn" />
                <AnalysisList title="改进建议" items={analysis.suggestions} tone="info" />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  )
}

function AnalysisList({
  title,
  items,
  tone,
}: {
  title: string
  items: string[]
  tone: 'good' | 'warn' | 'info'
}) {
  if (!items.length) return null
  const dot =
    tone === 'good' ? 'text-emerald-500' : tone === 'warn' ? 'text-amber-500' : 'text-indigo-500'
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-slate-600">{title}</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-xs leading-relaxed text-slate-600">
            <span className={dot}>•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
