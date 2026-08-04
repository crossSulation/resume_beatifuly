import { uid, type EducationEntry } from '../types/resume'
import SectionCard from './SectionCard'
import { ghostIconButton, inputClass, labelClass } from './fields'

interface EducationEditorProps {
  value: EducationEntry[]
  onChange: (value: EducationEntry[]) => void
}

export default function EducationEditor({ value, onChange }: EducationEditorProps) {
  const patch = (id: string, data: Partial<EducationEntry>) =>
    onChange(value.map((e) => (e.id === id ? { ...e, ...data } : e)))

  const add = () =>
    onChange([...value, { id: uid(), school: '', degree: '', major: '', startDate: '', endDate: '' }])

  const remove = (id: string) => onChange(value.filter((e) => e.id !== id))

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= value.length) return
    const next = [...value]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <SectionCard title="教育经历" count={value.length}>
      <div className="space-y-4">
        {value.map((entry, index) => (
          <div key={entry.id} className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="grid gap-2.5 md:grid-cols-2">
              <div>
                <label className={labelClass}>学校</label>
                <input value={entry.school} onChange={(e) => patch(entry.id, { school: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>学历</label>
                <input
                  value={entry.degree}
                  onChange={(e) => patch(entry.id, { degree: e.target.value })}
                  placeholder="本科 / 硕士"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>专业</label>
                <input value={entry.major} onChange={(e) => patch(entry.id, { major: e.target.value })} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>开始</label>
                  <input value={entry.startDate} onChange={(e) => patch(entry.id, { startDate: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>结束</label>
                  <input value={entry.endDate} onChange={(e) => patch(entry.id, { endDate: e.target.value })} className={inputClass} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-1">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className={ghostIconButton}>
                ↑
              </button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === value.length - 1} className={ghostIconButton}>
                ↓
              </button>
              <button type="button" onClick={() => remove(entry.id)} className={ghostIconButton}>
                ✕
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={add}
          className="w-full rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-500 transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600"
        >
          + 添加教育经历
        </button>
      </div>
    </SectionCard>
  )
}
