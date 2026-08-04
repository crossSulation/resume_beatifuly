import type { Ref } from 'react'
import type { Resume, TimelineEntry } from '../types/resume'

interface PreviewProps {
  resume: Resume
  ref?: Ref<HTMLDivElement>
}

function TimelineBlock({ entries, sectionTitle }: { entries: TimelineEntry[]; sectionTitle: string }) {
  if (!entries.length) return null
  return (
    <section className="mb-7">
      <h2 className="mb-3 border-b border-slate-200 pb-1.5 text-base font-bold text-slate-900">{sectionTitle}</h2>
      <div className="space-y-4">
        {entries.map((entry) => (
          <div key={entry.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
              <p className="font-semibold text-slate-800">
                {entry.primary}
                {entry.secondary && <span className="ml-2 font-normal text-slate-500">{entry.secondary}</span>}
              </p>
              {[entry.startDate, entry.endDate].some(Boolean) && (
                <p className="text-xs text-slate-400">
                  {[entry.startDate, entry.endDate].filter(Boolean).join(' – ')}
                </p>
              )}
            </div>
            <ul className="mt-1.5 space-y-1">
              {entry.bullets
                .map((b) => b.trim())
                .filter(Boolean)
                .map((b, i) => (
                  <li key={i} className="text-sm leading-relaxed text-slate-600">
                    {b}
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function Preview({ resume, ref }: PreviewProps) {
  const { personal, experience, projects, education, skills } = resume

  return (
    <div ref={ref} className="print-paper mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-wide text-slate-900">{personal.name || '未命名'}</h1>
        {personal.title && <p className="mt-1.5 text-base font-medium text-slate-600">{personal.title}</p>}
        {(personal.phone || personal.email || personal.location) && (
          <p className="mt-3 text-sm text-slate-500">
            {[personal.phone, personal.email, personal.location].filter(Boolean).join(' ｜ ')}
          </p>
        )}
      </header>

      {personal.summary.trim() && (
        <section className="mb-7">
          <h2 className="mb-3 border-b border-slate-200 pb-1.5 text-base font-bold text-slate-900">个人简介</h2>
          <p className="text-sm leading-relaxed text-slate-600">{personal.summary.trim()}</p>
        </section>
      )}

      <TimelineBlock entries={experience} sectionTitle="工作经历" />
      <TimelineBlock entries={projects} sectionTitle="项目经历" />

      {education.length > 0 && (
        <section className="mb-7">
          <h2 className="mb-3 border-b border-slate-200 pb-1.5 text-base font-bold text-slate-900">教育经历</h2>
          <div className="space-y-2">
            {education.map((e) => (
              <div key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-4">
                <p className="text-sm font-semibold text-slate-800">
                  {e.school}
                  <span className="ml-2 font-normal text-slate-500">
                    {[e.degree, e.major].filter(Boolean).join(' · ')}
                  </span>
                </p>
                {[e.startDate, e.endDate].some(Boolean) && (
                  <p className="text-xs text-slate-400">{[e.startDate, e.endDate].filter(Boolean).join(' – ')}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {skills.length > 0 && (
        <section>
          <h2 className="mb-3 border-b border-slate-200 pb-1.5 text-base font-bold text-slate-900">专业技能</h2>
          <p className="text-sm leading-relaxed text-slate-600">{skills.join('、')}</p>
        </section>
      )}
    </div>
  )
}
