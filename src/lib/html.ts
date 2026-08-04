import type { EducationEntry, Resume, TimelineEntry } from '../types/resume'
import { downloadBlob, safeFileName } from './files'

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c])

function timelineHtml(entries: TimelineEntry[]): string {
  return entries
    .map((e) => {
      const dates = [e.startDate, e.endDate].filter(Boolean).join(' – ')
      const bullets = e.bullets
        .map((b) => b.trim())
        .filter(Boolean)
        .map((b) => `<li>${esc(b)}</li>`)
        .join('')
      return `
        <div class="entry">
          <div class="entry-head">
            <p class="entry-title">${esc(e.primary)}${e.secondary ? `<span class="entry-sub">${esc(e.secondary)}</span>` : ''}</p>
            ${dates ? `<p class="entry-date">${esc(dates)}</p>` : ''}
          </div>
          ${bullets ? `<ul>${bullets}</ul>` : ''}
        </div>`
    })
    .join('')
}

function educationHtml(entries: EducationEntry[]): string {
  return entries
    .map((e) => {
      const dates = [e.startDate, e.endDate].filter(Boolean).join(' – ')
      const detail = [e.degree, e.major].filter(Boolean).join(' · ')
      return `
        <div class="entry">
          <div class="entry-head">
            <p class="entry-title">${esc(e.school)}${detail ? `<span class="entry-sub">${esc(detail)}</span>` : ''}</p>
            ${dates ? `<p class="entry-date">${esc(dates)}</p>` : ''}
          </div>
        </div>`
    })
    .join('')
}

export function buildResumeHtml(resume: Resume): string {
  const { personal, experience, projects, education, skills } = resume
  const contact = [personal.phone, personal.email, personal.location].filter(Boolean).map(esc).join(' ｜ ')

  const sections: string[] = []

  if (personal.summary.trim()) {
    sections.push(`
      <section>
        <h2>个人简介</h2>
        <p>${esc(personal.summary.trim())}</p>
      </section>`)
  }

  if (experience.length) {
    sections.push(`
      <section>
        <h2>工作经历</h2>
        ${timelineHtml(experience)}
      </section>`)
  }

  if (projects.length) {
    sections.push(`
      <section>
        <h2>项目经历</h2>
        ${timelineHtml(projects)}
      </section>`)
  }

  if (education.length) {
    sections.push(`
      <section>
        <h2>教育经历</h2>
        ${educationHtml(education)}
      </section>`)
  }

  if (skills.length) {
    sections.push(`
      <section>
        <h2>专业技能</h2>
        <p>${esc(skills.join('、'))}</p>
      </section>`)
  }

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(personal.name || '未命名')}的简历</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #e2e8f0;
      color: #1e293b;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      line-height: 1.6;
    }
    .page {
      max-width: 794px;
      margin: 32px auto;
      background: #ffffff;
      padding: 48px 56px;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
    }
    .page-header { text-align: center; margin-bottom: 36px; }
    .page-header h1 { margin: 0; font-size: 28px; letter-spacing: 2px; }
    .page-header .title { margin: 6px 0 0; font-size: 16px; color: #475569; }
    .page-header .contact { margin: 10px 0 0; font-size: 13px; color: #64748b; }
    section { margin-bottom: 28px; }
    section h2 {
      margin: 0 0 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 17px;
    }
    section p { margin: 0; font-size: 14px; color: #334155; }
    .entry { margin-bottom: 14px; }
    .entry-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
    .entry-title { margin: 0; font-weight: 600; }
    .entry-sub { margin-left: 8px; font-weight: 400; color: #64748b; }
    .entry-date { margin: 0; font-size: 12px; color: #94a3b8; white-space: nowrap; }
    ul { margin: 6px 0 0; padding-left: 18px; }
    li { font-size: 14px; color: #334155; }
    @media print {
      body { background: #ffffff; }
      .page { margin: 0; max-width: none; box-shadow: none; padding: 24px 32px; }
    }
  </style>
</head>
<body>
  <div class="page">
    <header class="page-header">
      <h1>${esc(personal.name || '未命名')}</h1>
      ${personal.title ? `<p class="title">${esc(personal.title)}</p>` : ''}
      ${contact ? `<p class="contact">${contact}</p>` : ''}
    </header>
    ${sections.join('\n')}
  </div>
</body>
</html>
`
}

export function downloadHtml(resume: Resume): void {
  const blob = new Blob([buildResumeHtml(resume)], { type: 'text/html;charset=utf-8' })
  downloadBlob(blob, `${safeFileName(resume.personal.name)}-简历.html`)
}
