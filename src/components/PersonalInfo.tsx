import type { PersonalInfo as PersonalInfoData } from '../types/resume'
import SectionCard from './SectionCard'
import { inputClass, labelClass } from './fields'

interface PersonalInfoProps {
  value: PersonalInfoData
  onChange: (value: PersonalInfoData) => void
}

export default function PersonalInfo({ value, onChange }: PersonalInfoProps) {
  const set = (patch: Partial<PersonalInfoData>) => onChange({ ...value, ...patch })

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
        <textarea
          id="summary"
          value={value.summary}
          onChange={(e) => set({ summary: e.target.value })}
          rows={4}
          placeholder="用 2-3 句话概括你的核心能力与优势…"
          className={`${inputClass} resize-y leading-relaxed`}
        />
      </div>
    </SectionCard>
  )
}
