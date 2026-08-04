import { uid, type TimelineEntry } from '../types/resume'
import BulletEditor from './BulletEditor'
import SectionCard from './SectionCard'
import { ghostIconButton, inputClass, labelClass } from './fields'

interface TimelineEditorProps {
  title: string
  primaryLabel: string
  secondaryLabel: string
  addLabel: string
  entries: TimelineEntry[]
  onChange: (entries: TimelineEntry[]) => void
}

export default function TimelineEditor({
  title,
  primaryLabel,
  secondaryLabel,
  addLabel,
  entries,
  onChange,
}: TimelineEditorProps) {
  const patchEntry = (id: string, patch: Partial<TimelineEntry>) =>
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)))

  const patchBullet = (id: string, index: number, value: string) => {
    const entry = entries.find((e) => e.id === id)
    if (!entry) return
    patchEntry(id, { bullets: entry.bullets.map((b, i) => (i === index ? value : b)) })
  }

  const addBullet = (id: string) => {
    const entry = entries.find((e) => e.id === id)
    if (!entry) return
    patchEntry(id, { bullets: [...entry.bullets, ''] })
  }

  const removeBullet = (id: string, index: number) => {
    const entry = entries.find((e) => e.id === id)
    if (!entry) return
    patchEntry(id, { bullets: entry.bullets.filter((_, i) => i !== index) })
  }

  const addEntry = () => {
    onChange([
      ...entries,
      { id: uid(), primary: '', secondary: '', startDate: '', endDate: '', bullets: [''] },
    ])
  }

  const removeEntry = (id: string) => onChange(entries.filter((e) => e.id !== id))

  const moveEntry = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= entries.length) return
    const next = [...entries]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <SectionCard title={title} count={entries.length}>
      <div className="space-y-4">
        {entries.map((entry, index) => (
          <div key={entry.id} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="grid gap-2.5 md:grid-cols-2">
              <div>
                <label className={labelClass}>{primaryLabel}</label>
                <input
                  value={entry.primary}
                  onChange={(e) => patchEntry(entry.id, { primary: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{secondaryLabel}</label>
                <input
                  value={entry.secondary}
                  onChange={(e) => patchEntry(entry.id, { secondary: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>开始时间</label>
                <input
                  value={entry.startDate}
                  onChange={(e) => patchEntry(entry.id, { startDate: e.target.value })}
                  placeholder="2023.06"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>结束时间</label>
                <input
                  value={entry.endDate}
                  onChange={(e) => patchEntry(entry.id, { endDate: e.target.value })}
                  placeholder="至今"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500">职责与成果（支持 LLM 优化）</p>
              <div className="flex gap-1">
                <button type="button" onClick={() => moveEntry(index, -1)} disabled={index === 0} className={ghostIconButton}>
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveEntry(index, 1)}
                  disabled={index === entries.length - 1}
                  className={ghostIconButton}
                >
                  ↓
                </button>
                <button type="button" onClick={() => removeEntry(entry.id)} className={ghostIconButton}>
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {entry.bullets.map((bullet, bi) => (
                <BulletEditor
                  key={bi}
                  value={bullet}
                  onChange={(v) => patchBullet(entry.id, bi, v)}
                  onRemove={() => removeBullet(entry.id, bi)}
                />
              ))}
              <button
                type="button"
                onClick={() => addBullet(entry.id)}
                className="ml-3.5 text-xs font-medium text-indigo-600 transition hover:text-indigo-700"
              >
                + 添加职责/成果
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addEntry}
          className="w-full rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-500 transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600"
        >
          + {addLabel}
        </button>
      </div>
    </SectionCard>
  )
}
