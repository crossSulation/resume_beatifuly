import { useState } from 'react'
import { testLlmConnection } from '../services/llm'
import { DEFAULT_SETTINGS, type LlmSettings } from '../services/settings'
import { inputClass, labelClass } from './fields'

interface SettingsModalProps {
  settings: LlmSettings
  onSave: (settings: LlmSettings) => void
  onClose: () => void
}

export default function SettingsModal({ settings, onSave, onClose }: SettingsModalProps) {
  const [draft, setDraft] = useState<LlmSettings>({ ...settings })
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [error, setError] = useState('')

  const set = (patch: Partial<LlmSettings>) => setDraft((d) => ({ ...d, ...patch }))

  const save = () => {
    const baseUrl = draft.baseUrl.trim()
    const model = draft.model.trim()
    if (!baseUrl) {
      setError('请填写接口地址')
      return
    }
    if (!model) {
      setError('请填写模型名称')
      return
    }
    onSave({ ...draft, baseUrl, model, temperature: Math.min(1, Math.max(0, draft.temperature)) })
  }

  const test = async () => {
    setTesting(true)
    setTestResult(null)
    setError('')
    try {
      await testLlmConnection({ ...draft, baseUrl: draft.baseUrl.trim(), model: draft.model.trim() })
      setTestResult({ ok: true, text: '连接成功，模型可用' })
    } catch (e) {
      setTestResult({ ok: false, text: e instanceof Error ? e.message : '连接失败' })
    } finally {
      setTesting(false)
    }
  }

  const reset = () => {
    setDraft({ ...DEFAULT_SETTINGS })
    setTestResult(null)
    setError('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-8">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">⚙️ LLM 设置</h3>
            <p className="mt-0.5 text-xs text-slate-500">配置模型接口，保存后立即生效，无需重启</p>
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

        <div className="space-y-4 px-6 py-5">
          <div>
            <label htmlFor="api-key" className={labelClass}>API Key</label>
            <div className="flex gap-2">
              <input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                value={draft.apiKey}
                onChange={(e) => set({ apiKey: e.target.value })}
                placeholder="sk-..."
                autoComplete="off"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="shrink-0 rounded-lg border border-slate-200 px-3 text-xs text-slate-500 transition hover:bg-slate-50"
              >
                {showKey ? '隐藏' : '显示'}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="base-url" className={labelClass}>接口地址（OpenAI 兼容）</label>
            <input
              id="base-url"
              value={draft.baseUrl}
              onChange={(e) => set({ baseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="model" className={labelClass}>模型名称</label>
            <input
              id="model"
              value={draft.model}
              onChange={(e) => set({ model: e.target.value })}
              placeholder="gpt-4o-mini"
              className={inputClass}
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="temperature" className={labelClass}>温度（随机性）</label>
              <span className="text-xs font-medium text-indigo-600">{draft.temperature.toFixed(2)}</span>
            </div>
            <input
              id="temperature"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={draft.temperature}
              onChange={(e) => set({ temperature: Number(e.target.value) })}
              className="w-full accent-indigo-600"
            />
            <div className="mt-0.5 flex justify-between text-[10px] text-slate-400">
              <span>稳定</span>
              <span>创意</span>
            </div>
          </div>

          <div className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-700">
            API Key 仅保存在本机浏览器（localStorage），用于前端直连模型接口。正式部署时建议增加后端代理，避免 Key
            暴露在浏览器中。
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
          {testResult && (
            <p className={`text-xs ${testResult.ok ? 'text-emerald-600' : 'text-red-600'}`}>{testResult.text}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50"
          >
            恢复默认
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void test()}
              disabled={testing}
              className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:text-slate-300"
            >
              {testing ? '测试中…' : '测试连接'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={save}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
