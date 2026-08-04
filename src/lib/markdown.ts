import type { Resume } from '../types/resume'

export function buildMarkdown(resume: Resume): string {
  const lines: string[] = []
  const { personal, experience, projects, education, skills } = resume

  lines.push(`# ${personal.name || '未命名'}`)
  if (personal.title) lines.push(`**${personal.title}**`)
  const contact = [personal.phone, personal.email, personal.location].filter(Boolean).join(' ｜ ')
  if (contact) lines.push(contact)

  if (personal.summary.trim()) {
    lines.push('', '## 个人简介', personal.summary.trim())
  }

  if (experience.length) {
    lines.push('', '## 工作经历')
    for (const e of experience) {
      const head = [`**${e.primary}**`, e.secondary, [e.startDate, e.endDate].filter(Boolean).join(' - ')]
        .filter(Boolean)
        .join(' · ')
      if (head.trim()) lines.push(head)
      const bullets = e.bullets.map((b) => b.trim()).filter(Boolean)
      if (bullets.length) lines.push(...bullets.map((b) => `- ${b}`))
      lines.push('')
    }
  }

  if (projects.length) {
    lines.push('## 项目经历')
    for (const p of projects) {
      const head = [`**${p.primary}**`, p.secondary, [p.startDate, p.endDate].filter(Boolean).join(' - ')]
        .filter(Boolean)
        .join(' · ')
      if (head.trim()) lines.push(head)
      const bullets = p.bullets.map((b) => b.trim()).filter(Boolean)
      if (bullets.length) lines.push(...bullets.map((b) => `- ${b}`))
      lines.push('')
    }
  }

  if (education.length) {
    lines.push('## 教育经历')
    for (const e of education) {
      const row = [`**${e.school}**`, e.degree, e.major, [e.startDate, e.endDate].filter(Boolean).join(' - ')]
        .filter(Boolean)
        .join(' · ')
      if (row.trim()) lines.push(row)
    }
    lines.push('')
  }

  if (skills.length) {
    lines.push('## 专业技能', skills.join('、'))
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}
