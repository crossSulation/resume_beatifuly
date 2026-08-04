import { useEffect, useRef, useState } from 'react'
import { createSampleResume, type Resume, type TimelineEntry } from './types/resume'
import { buildMarkdown } from './lib/markdown'
import { downloadHtml } from './lib/html'
import { exportPdf } from './lib/pdf'
import { safeFileName } from './lib/files'
import { improveBullets, improveSummary } from './services/llm'
import PersonalInfo from './components/PersonalInfo'
import TimelineEditor from './components/TimelineEditor'
import EducationEditor from './components/EducationEditor'
import SkillsEditor from './components/SkillsEditor'
import Preview from './components/Preview'
import BeautifyReview, { type BeautifyDraftItem } from './components/BeautifyReview'

const STORAGE_KEY = 'resume-beautify:data'

type PdfQuality = 'high' | 'balanced' | 'compact'

const PDF_OPTIONS: { value: PdfQuality; label: string; desc: string; scale: number; quality: number }[] = [
  { value: 'high', label: '清晰', desc: '2 倍渲染，文件较大', scale: 2, quality: 0.95 },
  { value: 'balanced', label: '均衡', desc: '推荐，兼顾清晰与体积', scale: 1.5, quality: 0.92 },
  { value: 'compact', label: '小体积', desc: '适合快速预览与发送', scale: 1, quality: 0.85 },
]

function loadInitial(): Resume {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Resume
      if (parsed?.personal && Array.isArray(parsed.experience)) return parsed
    }
  } catch {
    // 忽略损坏的本地缓存
  }
  return createSampleResume()
}

export default function App() {
  const [resume, setResume] = useState<Resume>(loadInitial)
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false)
  const [beautifyItems, setBeautifyItems] = useState<BeautifyDraftItem[] | null>(null)
  const [beautifying, setBeautifying] = useState(false)
  const [beautifyError, setBeautifyError] = useState('')
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resume))
  }, [resume])

  const copyMarkdown = async () => {
    await navigator.clipboard.writeText(buildMarkdown(resume))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleExportPdf = async (quality: PdfQuality) => {
    if (!previewRef.current || exporting) return
    const option = PDF_OPTIONS.find((o) => o.value === quality) ?? PDF_OPTIONS[1]
    setExporting(true)
    setExportError('')
    try {
      await exportPdf(previewRef.current, `${safeFileName(resume.personal.name)}-简历`, {
        scale: option.scale,
        quality: option.quality,
      })
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'PDF 导出失败，请重试')
    } finally {
      setExporting(false)
    }
  }

  const handleExportHtml = () => {
    setExportError('')
    downloadHtml(resume)
  }

  const startBeautify = async () => {
    if (beautifying) return
    const targets: { key: string; kind: 'bullet'; location: string; entryId: string; bulletIndex: number; text: string }[] =
      []
    for (const kind of ['experience', 'projects'] as const) {
      for (const entry of resume[kind]) {
        entry.bullets.forEach((bullet, bulletIndex) => {
          const text = bullet.trim()
          if (!text) return
          targets.push({
            key: `${kind}:${entry.id}:${bulletIndex}`,
            kind: 'bullet',
            location: `${kind === 'experience' ? '工作经历' : '项目经历'} · ${entry.primary || '未命名'}`,
            entryId: entry.id,
            bulletIndex,
            text,
          })
        })
      }
    }

    const summaryText = resume.personal.summary.trim()

    if (!targets.length && !summaryText) {
      setBeautifyError('没有可美化的内容，请先填写个人简介或工作/项目经历')
      return
    }

    setBeautifying(true)
    setBeautifyError('')
    try {
      const [bulletResults, summaryResult] = await Promise.all([
        targets.length ? improveBullets(targets.map((t) => t.text)) : Promise.resolve([]),
        summaryText ? improveSummary(summaryText) : Promise.resolve(null),
      ])

      const items: BeautifyDraftItem[] = []
      if (summaryResult) {
        items.push({
          key: 'personal:summary',
          kind: 'summary',
          location: '个人简介',
          original: summaryResult.original,
          rewritten: summaryResult.rewritten,
          suggestions: summaryResult.suggestions,
          metrics: summaryResult.metrics,
          accepted: true,
        })
      }
      bulletResults.forEach((result, i) => {
        items.push({
          key: targets[i].key,
          kind: 'bullet',
          entryId: targets[i].entryId,
          bulletIndex: targets[i].bulletIndex,
          location: targets[i].location,
          original: result.original,
          rewritten: result.rewritten,
          suggestions: result.suggestions,
          metrics: result.metrics,
          accepted: true,
        })
      })
      setBeautifyItems(items)
    } catch (e) {
      setBeautifyError(e instanceof Error ? e.message : '美化失败，请稍后重试')
    } finally {
      setBeautifying(false)
    }
  }

  const toggleBeautifyItem = (key: string) => {
    setBeautifyItems((items) =>
      items ? items.map((item) => (item.key === key ? { ...item, accepted: !item.accepted } : item)) : items,
    )
  }

  const applyBeautify = () => {
    if (!beautifyItems) return
    const accepted = beautifyItems.filter((item) => item.accepted)
    if (!accepted.length) return

    setResume((r) => {
      const summaryChange = accepted.find((item) => item.kind === 'summary')
      const applyToEntries = (entries: TimelineEntry[]) =>
        entries.map((entry) => {
          const changes = accepted.filter((item) => item.kind === 'bullet' && item.entryId === entry.id)
          if (!changes.length) return entry
          const bullets = [...entry.bullets]
          for (const change of changes) {
            if (change.bulletIndex === undefined) continue
            bullets[change.bulletIndex] = change.rewritten
          }
          return { ...entry, bullets }
        })

      return {
        ...r,
        personal: summaryChange ? { ...r.personal, summary: summaryChange.rewritten } : r.personal,
        experience: applyToEntries(r.experience),
        projects: applyToEntries(r.projects),
      }
    })
    setBeautifyItems(null)
  }

  const configured = Boolean(import.meta.env.VITE_LLM_API_KEY)

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">简历编辑助手</h1>
            <p className="mt-0.5 text-sm text-slate-500">编辑、预览简历，并用 LLM 逐条优化经历描述</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
                configured
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : 'bg-amber-50 text-amber-700 ring-amber-200'
              }`}
            >
              {configured ? 'LLM 已连接' : '演示模式（未配置 API）'}
            </span>
            {mode === 'edit' && (
              <button
                type="button"
                onClick={() => void startBeautify()}
                disabled={beautifying}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {beautifying ? '美化中…' : '✨ 一键美化'}
              </button>
            )}
            <div className="flex rounded-xl bg-slate-100 p-1">
              {(['edit', 'preview'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition ${
                    mode === m ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {m === 'edit' ? '编辑' : '预览'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        {mode === 'edit' && beautifyError && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {beautifyError}
          </div>
        )}
        {mode === 'edit' ? (
          <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <PersonalInfo value={resume.personal} onChange={(personal) => setResume({ ...resume, personal })} />
              <TimelineEditor
                title="工作经历"
                primaryLabel="公司名称"
                secondaryLabel="职位"
                addLabel="添加工作经历"
                entries={resume.experience}
                onChange={(experience) => setResume({ ...resume, experience })}
              />
              <TimelineEditor
                title="项目经历"
                primaryLabel="项目名称"
                secondaryLabel="担任角色"
                addLabel="添加项目经历"
                entries={resume.projects}
                onChange={(projects) => setResume({ ...resume, projects })}
              />
            </div>
            <div className="space-y-6">
              <EducationEditor value={resume.education} onChange={(education) => setResume({ ...resume, education })} />
              <SkillsEditor skills={resume.skills} onChange={(skills) => setResume({ ...resume, skills })} />
              {!configured && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-700">
                  当前为演示模式。复制 <code className="font-mono">.env.example</code> 为{' '}
                  <code className="font-mono">.env.local</code> 并填入 <code className="font-mono">VITE_LLM_API_KEY</code>{' '}
                  后重启即可让「✨ 优化」调用真实模型。
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500">预览排版效果，可复制、导出或直接打印</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copyMarkdown}
                  className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600"
                >
                  {copied ? '已复制 Markdown' : '复制 Markdown'}
                </button>
                <button
                  type="button"
                  onClick={handleExportHtml}
                  className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600"
                >
                  导出 HTML
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setPdfMenuOpen((v) => !v)}
                    disabled={exporting}
                    className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed"
                  >
                    导出选项 ▾
                  </button>
                  {pdfMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setPdfMenuOpen(false)} />
                      <div className="absolute right-0 z-30 mt-1.5 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                        {PDF_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            disabled={exporting}
                            onClick={() => {
                              setPdfMenuOpen(false)
                              void handleExportPdf(option.value)
                            }}
                            className="block w-full px-3.5 py-2.5 text-left transition hover:bg-indigo-50/60 disabled:cursor-not-allowed"
                          >
                            <span className="flex items-center justify-between text-xs font-medium text-slate-700">
                              {option.label}
                              {option.value === 'balanced' && (
                                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] text-indigo-600 ring-1 ring-indigo-100">
                                  推荐
                                </span>
                              )}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-slate-400">{option.desc}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void handleExportPdf('balanced')}
                  disabled={exporting}
                  className="rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {exporting ? '生成中…' : '导出 PDF'}
                </button>
              </div>
            </div>
            {exportError && (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {exportError}
              </div>
            )}
            <Preview resume={resume} ref={previewRef} />
          </div>
        )}
      </main>

      {beautifyItems && (
        <BeautifyReview
          items={beautifyItems}
          onToggle={toggleBeautifyItem}
          onApply={applyBeautify}
          onClose={() => setBeautifyItems(null)}
        />
      )}
    </div>
  )
}
