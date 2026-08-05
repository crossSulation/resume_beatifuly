import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { uid, type BeautifyDraftItem, type Resume } from './types/resume'
import {
  createBlankItem,
  loadResumeStore,
  loadResumeStoreIdb,
  loadResumeStoreMeta,
  saveResumeStore,
  type ResumeItem,
  type ResumeStore,
} from './lib/store'
import { buildMarkdown } from './lib/markdown'
import { downloadHtml } from './lib/html'
import { exportPdf } from './lib/pdf'
import { downloadBlob, safeFileName } from './lib/files'
import { improveBullets, improveSummary } from './services/llm'
import { loadSettings, saveSettings, type LlmSettings } from './services/settings'
import { checkProxyHealth, type ProxyHealth } from './services/proxy'
import {
  applyAcceptedItems,
  applyPlaceholderUpdates,
  collectBulletTargets,
  type PlaceholderUpdate,
} from './lib/resumeUtils'
import { collectPlaceholderItems } from './lib/analysis'
import { useResumeHistory } from './hooks/useResumeHistory'
import { RESUME_THEMES, type HeaderAlign } from './lib/themes'
import PersonalInfo from './components/PersonalInfo'
import TimelineEditor from './components/TimelineEditor'
import EducationEditor from './components/EducationEditor'
import SkillsEditor from './components/SkillsEditor'
import PagedPreview from './components/PagedPreview'
import BeautifyReview from './components/BeautifyReview'
import JdOptimizer from './components/JdOptimizer'
import HealthReportModal from './components/HealthReportModal'
import PlaceholderFixer from './components/PlaceholderFixer'
import SettingsModal from './components/SettingsModal'

type PdfQuality = 'high' | 'balanced' | 'compact'

const PDF_OPTIONS: { value: PdfQuality; label: string; desc: string; scale: number; quality: number }[] = [
  { value: 'high', label: '清晰', desc: '2 倍渲染，文件较大', scale: 2, quality: 0.95 },
  { value: 'balanced', label: '均衡', desc: '推荐，兼顾清晰与体积', scale: 1.5, quality: 0.92 },
  { value: 'compact', label: '小体积', desc: '适合快速预览与发送', scale: 1, quality: 0.85 },
]

interface UiSettings {
  themeId: string
  headerAlign: HeaderAlign
}

const UI_KEY = 'resume-beautify:ui'

function loadUi(): UiSettings {
  try {
    const raw = localStorage.getItem(UI_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UiSettings>
      return {
        themeId: typeof parsed.themeId === 'string' ? parsed.themeId : 'indigo',
        headerAlign: parsed.headerAlign === 'left' ? 'left' : 'center',
      }
    }
  } catch {
    // 忽略损坏的 UI 设置
  }
  return { themeId: 'indigo', headerAlign: 'center' }
}

const toolBtn =
  'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-300'
const primaryBtn =
  'rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300'

export default function App() {
  const [store, setStore] = useState<ResumeStore>(loadResumeStore)
  const activeItem = store.items.find((i) => i.id === store.activeId) ?? store.items[0]
  const resume = activeItem.resume

  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false)
  const [beautifyItems, setBeautifyItems] = useState<BeautifyDraftItem[] | null>(null)
  const [beautifying, setBeautifying] = useState(false)
  const [banner, setBanner] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)
  const [jdOpen, setJdOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [placeholderOpen, setPlaceholderOpen] = useState(false)
  const [backupOpen, setBackupOpen] = useState(false)
  const [resumeMenuOpen, setResumeMenuOpen] = useState(false)
  const [settings, setSettings] = useState<LlmSettings>(loadSettings)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [ui, setUi] = useState<UiSettings>(loadUi)
  const [proxyHealth, setProxyHealth] = useState<ProxyHealth>('checking')
  const previewRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const theme = RESUME_THEMES.find((t) => t.id === ui.themeId) ?? RESUME_THEMES[0]

  const updateResume = (updater: (r: Resume) => Resume) => {
    setStore((s) => {
      if (!s.items.some((i) => i.id === s.activeId)) return s
      return {
        ...s,
        items: s.items.map((i) =>
          i.id === s.activeId ? { ...i, resume: updater(i.resume), updatedAt: Date.now() } : i,
        ),
      }
    })
  }

  const setResumeForHistory: Dispatch<SetStateAction<Resume>> = (next) => {
    setStore((s) => {
      const current = s.items.find((i) => i.id === s.activeId)
      if (!current) return s
      const updated = typeof next === 'function' ? next(current.resume) : next
      return {
        ...s,
        items: s.items.map((i) => (i.id === s.activeId ? { ...i, resume: updated, updatedAt: Date.now() } : i)),
      }
    })
  }

  const { canUndo, canRedo, undo, redo, resetHistoryTo } = useResumeHistory(resume, setResumeForHistory)
  const placeholderCount = useMemo(() => collectPlaceholderItems(resume).length, [resume])

  useEffect(() => {
    const ok = saveResumeStore(store)
    if (!ok) {
      setBanner({ kind: 'error', text: '本地存储写入失败（可能空间不足），请尽快在「备份」中导出 JSON' })
    }
  }, [store])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const idb = await loadResumeStoreIdb()
      if (cancelled || !idb) return
      const local = loadResumeStoreMeta()
      if (!local || idb.savedAt > local.savedAt) {
        const target = idb.data.items.find((i) => i.id === idb.data.activeId) ?? idb.data.items[0]
        resetHistoryTo(target.resume)
        setStore(idb.data)
      }
    })()
    return () => {
      cancelled = true
    }
    // 仅在挂载时执行一次：从 IndexedDB 恢复比 localStorage 更新的数据
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false
    void checkProxyHealth().then((status) => {
      if (!cancelled) setProxyHealth(status)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(UI_KEY, JSON.stringify(ui))
  }, [ui])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
      const key = e.key.toLowerCase()
      if (key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      } else if (key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])

  const copyMarkdown = async () => {
    await navigator.clipboard.writeText(buildMarkdown(resume))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleExportPdf = async (quality: PdfQuality) => {
    if (exporting) return
    const pages = previewRef.current
      ? Array.from(previewRef.current.querySelectorAll<HTMLElement>('[data-page]'))
      : []
    if (!pages.length) {
      setExportError('预览尚未生成，请稍后重试')
      return
    }
    const option = PDF_OPTIONS.find((o) => o.value === quality) ?? PDF_OPTIONS[1]
    setExporting(true)
    setExportError('')
    try {
      await exportPdf(pages, `${safeFileName(resume.personal.name)}-简历`, {
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
    const targets = collectBulletTargets(resume)
    const summaryText = resume.personal.summary.trim()
    if (!targets.length && !summaryText) {
      setBanner({ kind: 'error', text: '没有可美化的内容，请先填写个人简介或工作/项目经历' })
      return
    }

    setBeautifying(true)
    setBanner(null)
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
      setBanner({ kind: 'error', text: e instanceof Error ? e.message : '美化失败，请稍后重试' })
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
    updateResume((r) => applyAcceptedItems(r, accepted))
    setBeautifyItems(null)
    setBanner({ kind: 'success', text: `已应用 ${accepted.length} 处优化` })
  }

  const handleJdApply = (items: BeautifyDraftItem[]) => {
    if (!items.length) return
    updateResume((r) => applyAcceptedItems(r, items))
    setJdOpen(false)
    setBanner({ kind: 'success', text: `已应用 ${items.length} 处 JD 定向优化` })
  }

  const handlePlaceholderApply = (updates: PlaceholderUpdate[]) => {
    if (!updates.length) return
    updateResume((r) => applyPlaceholderUpdates(r, updates))
    setPlaceholderOpen(false)
    setBanner({ kind: 'success', text: `已更新 ${updates.length} 处占位符` })
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(resume, null, 2)], { type: 'application/json;charset=utf-8' })
    downloadBlob(blob, `${safeFileName(resume.personal.name)}-简历.json`)
    setBanner({ kind: 'success', text: '已导出当前简历的 JSON 备份' })
  }

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as Resume
      if (
        !parsed?.personal ||
        !Array.isArray(parsed.experience) ||
        !Array.isArray(parsed.projects) ||
        !Array.isArray(parsed.education) ||
        !Array.isArray(parsed.skills)
      ) {
        throw new Error('文件格式不正确，请选择本工具导出的 JSON 备份')
      }
      const item: ResumeItem = {
        id: uid(),
        name: parsed.personal.name?.trim() || '导入的简历',
        updatedAt: Date.now(),
        resume: parsed,
      }
      resetHistoryTo(parsed)
      setStore((s) => ({ activeId: item.id, items: [...s.items, item] }))
      setBanner({ kind: 'success', text: '导入成功，已添加到简历列表' })
    } catch (e) {
      setBanner({ kind: 'error', text: e instanceof Error ? e.message : '导入失败，请重试' })
    }
  }

  const handleSwitchResume = (id: string) => {
    const target = store.items.find((i) => i.id === id)
    if (!target || id === store.activeId) return
    resetHistoryTo(target.resume)
    setStore((s) => ({ ...s, activeId: id }))
  }

  const handleNewResume = () => {
    const item = createBlankItem()
    resetHistoryTo(item.resume)
    setStore((s) => ({ activeId: item.id, items: [...s.items, item] }))
    setBanner({ kind: 'success', text: '已新建简历' })
  }

  const handleCopyResume = () => {
    const copy: ResumeItem = {
      id: uid(),
      name: `${activeItem.name} 副本`,
      updatedAt: Date.now(),
      resume: JSON.parse(JSON.stringify(resume)) as Resume,
    }
    resetHistoryTo(copy.resume)
    setStore((s) => ({ activeId: copy.id, items: [...s.items, copy] }))
    setBanner({ kind: 'success', text: '已复制当前简历' })
  }

  const handleRenameResume = () => {
    const name = window.prompt('输入新的简历名称', activeItem.name)
    if (name === null) return
    const trimmed = name.trim()
    if (!trimmed) {
      setBanner({ kind: 'error', text: '名称不能为空' })
      return
    }
    setStore((s) => ({
      ...s,
      items: s.items.map((i) => (i.id === s.activeId ? { ...i, name: trimmed } : i)),
    }))
  }

  const handleDeleteResume = () => {
    if (store.items.length <= 1) {
      setBanner({ kind: 'error', text: '至少保留一份简历' })
      return
    }
    if (!window.confirm(`确定删除「${activeItem.name}」吗？此操作不可撤销。`)) return
    const remaining = store.items.filter((i) => i.id !== store.activeId)
    const nextActive = remaining[0]
    resetHistoryTo(nextActive.resume)
    setStore((s) => ({ activeId: nextActive.id, items: s.items.filter((i) => i.id !== s.activeId) }))
    setBanner({ kind: 'success', text: '已删除简历' })
  }

  const handleSaveSettings = (next: LlmSettings) => {
    saveSettings(next)
    setSettings(next)
    setSettingsOpen(false)
    if (next.transport === 'proxy') {
      setProxyHealth('checking')
      void checkProxyHealth().then(setProxyHealth)
    }
    setBanner({
      kind: 'success',
      text:
        next.transport === 'proxy'
          ? '已切换为内置代理模式（API Key 由服务器端提供）'
          : next.apiKey
            ? 'LLM 设置已保存'
            : '设置已保存（未配置 API Key，仍为演示模式）',
    })
  }

  const configured = settings.transport === 'proxy' ? true : Boolean(settings.apiKey)

  const badgeInfo = (() => {
    if (settings.transport === 'proxy') {
      if (proxyHealth === 'ok') return { text: '代理模式', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' }
      if (proxyHealth === 'no-key') {
        return { text: '代理未配置 Key', tone: 'bg-amber-50 text-amber-700 ring-amber-200' }
      }
      if (proxyHealth === 'down') return { text: '代理未启动', tone: 'bg-red-50 text-red-700 ring-red-200' }
      return { text: '检查中…', tone: 'bg-amber-50 text-amber-700 ring-amber-200' }
    }
    return configured
      ? { text: 'LLM 已连接', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' }
      : { text: '演示模式', tone: 'bg-amber-50 text-amber-700 ring-amber-200' }
  })()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="shrink-0 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">简历编辑助手</h1>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setResumeMenuOpen((v) => !v)}
                  className="flex max-w-44 items-center gap-1 truncate rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600 sm:max-w-56"
                  title={activeItem.name}
                >
                  <span className="truncate">📄 {activeItem.name}</span>
                  <span className="shrink-0">▾</span>
                </button>
                {resumeMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setResumeMenuOpen(false)} />
                    <div className="absolute left-0 z-30 mt-1.5 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                      <div className="max-h-52 overflow-y-auto">
                        {store.items.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setResumeMenuOpen(false)
                              handleSwitchResume(item.id)
                            }}
                            className={`flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-xs transition hover:bg-indigo-50/60 ${
                              item.id === store.activeId ? 'font-semibold text-indigo-600' : 'text-slate-600'
                            }`}
                          >
                            <span className="truncate">{item.name}</span>
                            {item.id === store.activeId && <span className="shrink-0">✓</span>}
                          </button>
                        ))}
                      </div>
                      <div className="border-t border-slate-100 py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setResumeMenuOpen(false)
                            handleNewResume()
                          }}
                          className="block w-full px-3.5 py-2 text-left text-xs text-slate-600 transition hover:bg-indigo-50/60"
                        >
                          + 新建简历
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setResumeMenuOpen(false)
                            handleCopyResume()
                          }}
                          className="block w-full px-3.5 py-2 text-left text-xs text-slate-600 transition hover:bg-indigo-50/60"
                        >
                          ⧉ 复制当前
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setResumeMenuOpen(false)
                            handleRenameResume()
                          }}
                          className="block w-full px-3.5 py-2 text-left text-xs text-slate-600 transition hover:bg-indigo-50/60"
                        >
                          ✏️ 重命名
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setResumeMenuOpen(false)
                            handleDeleteResume()
                          }}
                          className="block w-full px-3.5 py-2 text-left text-xs text-red-500 transition hover:bg-red-50"
                        >
                          🗑 删除当前
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            <p className="mt-0.5 hidden text-sm text-slate-500 sm:block">编辑、预览简历，并用 LLM 逐条优化经历描述</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              title="LLM 设置"
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-500 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600"
            >
              ⚙️
            </button>
            <span
              className={`hidden rounded-full px-3 py-1 text-xs font-medium ring-1 sm:inline-block ${badgeInfo.tone}`}
            >
              {badgeInfo.text}
            </span>
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

        {mode === 'edit' && (
          <div className="border-t border-slate-100 bg-slate-50/70">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-2.5 sm:px-6">
              <button type="button" onClick={undo} disabled={!canUndo} className={toolBtn}>
                ↩ 撤销
              </button>
              <button type="button" onClick={redo} disabled={!canRedo} className={toolBtn}>
                ↪ 重做
              </button>
              <span className="mx-1 hidden h-4 w-px bg-slate-200 sm:block" />
              <button type="button" onClick={() => void startBeautify()} disabled={beautifying} className={primaryBtn}>
                {beautifying ? '美化中…' : '✨ 一键美化'}
              </button>
              <button type="button" onClick={() => setReportOpen(true)} className={toolBtn}>
                📋 体检报告
              </button>
              <button
                type="button"
                onClick={() => setPlaceholderOpen(true)}
                disabled={placeholderCount === 0}
                className={`${toolBtn} ${placeholderCount > 0 ? 'border-amber-300 text-amber-700 hover:border-amber-400' : ''}`}
              >
                🔢 补全数据{placeholderCount > 0 ? ` (${placeholderCount})` : ''}
              </button>
              <button type="button" onClick={() => setJdOpen(true)} className={toolBtn}>
                🎯 JD 定制
              </button>
              <div className="relative">
                <button type="button" onClick={() => setBackupOpen((v) => !v)} className={toolBtn}>
                  💾 备份 ▾
                </button>
                {backupOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setBackupOpen(false)} />
                    <div className="absolute left-0 z-30 mt-1.5 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setBackupOpen(false)
                          exportJson()
                        }}
                        className="block w-full px-3.5 py-2.5 text-left text-xs text-slate-600 transition hover:bg-indigo-50/60"
                      >
                        导出 JSON 备份
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBackupOpen(false)
                          fileInputRef.current?.click()
                        }}
                        className="block w-full px-3.5 py-2.5 text-left text-xs text-slate-600 transition hover:bg-indigo-50/60"
                      >
                        导入 JSON 备份
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {mode === 'edit' && banner && (
          <div
            className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
              banner.kind === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {banner.text}
          </div>
        )}

        {mode === 'edit' ? (
          <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <PersonalInfo
                value={resume.personal}
                onChange={(personal) => updateResume((r) => ({ ...r, personal }))}
              />
              <TimelineEditor
                title="工作经历"
                primaryLabel="公司名称"
                secondaryLabel="职位"
                addLabel="添加工作经历"
                entries={resume.experience}
                onChange={(experience) => updateResume((r) => ({ ...r, experience }))}
              />
              <TimelineEditor
                title="项目经历"
                primaryLabel="项目名称"
                secondaryLabel="担任角色"
                addLabel="添加项目经历"
                entries={resume.projects}
                onChange={(projects) => updateResume((r) => ({ ...r, projects }))}
              />
            </div>
            <div className="space-y-6">
              <EducationEditor
                value={resume.education}
                onChange={(education) => updateResume((r) => ({ ...r, education }))}
              />
              <SkillsEditor skills={resume.skills} onChange={(skills) => updateResume((r) => ({ ...r, skills }))} />
              {!configured && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-700">
                  当前为演示模式。点击右上角 ⚙️：直连模式填写 API Key，或切换「内置代理」并在服务器端配置
                  LLM_API_KEY，即可调用真实模型。
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5" role="group" aria-label="简历主题">
                  {RESUME_THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      title={t.name}
                      onClick={() => setUi((u) => ({ ...u, themeId: t.id }))}
                      className={`h-6 w-6 rounded-full ring-2 transition ${
                        ui.themeId === t.id ? 'ring-slate-400' : 'ring-transparent hover:ring-slate-300'
                      }`}
                      style={{ backgroundColor: t.accent }}
                    />
                  ))}
                </div>
                <div className="flex rounded-xl bg-slate-100 p-1">
                  {(['center', 'left'] as const).map((align) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() => setUi((u) => ({ ...u, headerAlign: align }))}
                      className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                        ui.headerAlign === align ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {align === 'center' ? '居中' : '居左'}
                    </button>
                  ))}
                </div>
                <p className="hidden text-sm text-slate-500 md:block">预览排版效果，可复制、导出或直接打印</p>
              </div>
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
            <div ref={previewRef} className="overflow-x-auto">
              <PagedPreview resume={resume} theme={theme} headerAlign={ui.headerAlign} />
            </div>
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
      {jdOpen && <JdOptimizer resume={resume} onApply={handleJdApply} onClose={() => setJdOpen(false)} />}
      {reportOpen && (
        <HealthReportModal
          resume={resume}
          onClose={() => setReportOpen(false)}
          onBeautify={() => {
            setReportOpen(false)
            void startBeautify()
          }}
        />
      )}
      {placeholderOpen && (
        <PlaceholderFixer resume={resume} onApply={handlePlaceholderApply} onClose={() => setPlaceholderOpen(false)} />
      )}
      {settingsOpen && (
        <SettingsModal settings={settings} onSave={handleSaveSettings} onClose={() => setSettingsOpen(false)} />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleImportFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
