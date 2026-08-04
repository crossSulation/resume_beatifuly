import { useState } from 'react'
import SectionCard from './SectionCard'
import { inputClass } from './fields'

interface SkillsEditorProps {
  skills: string[]
  onChange: (skills: string[]) => void
}

export default function SkillsEditor({ skills, onChange }: SkillsEditorProps) {
  const [draft, setDraft] = useState('')

  const addSkills = () => {
    const next = draft
      .split(/[,，、\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (!next.length) return
    onChange([...new Set([...skills, ...next])])
    setDraft('')
  }

  const remove = (skill: string) => onChange(skills.filter((s) => s !== skill))

  return (
    <SectionCard title="专业技能" count={skills.length}>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <span
            key={skill}
            className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-700 ring-1 ring-indigo-100"
          >
            {skill}
            <button
              type="button"
              onClick={() => remove(skill)}
              aria-label={`删除 ${skill}`}
              className="text-indigo-400 transition hover:text-indigo-700"
            >
              ×
            </button>
          </span>
        ))}
        {skills.length === 0 && <span className="text-xs text-slate-400">暂无技能，添加一些吧</span>}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addSkills()
            }
          }}
          placeholder="输入技能，用逗号分隔"
          className={inputClass}
        />
        <button
          type="button"
          onClick={addSkills}
          className="shrink-0 rounded-lg bg-indigo-600 px-3.5 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          添加
        </button>
      </div>
    </SectionCard>
  )
}
