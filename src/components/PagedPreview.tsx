import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { packBlocks } from '../lib/paging'
import type { HeaderAlign, ResumeTheme } from '../lib/themes'
import type { EducationEntry, Resume, TimelineEntry } from '../types/resume'

const PAGE_WIDTH = 794
const PAGE_HEIGHT = 1123
const PAGE_PADDING = 48
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_PADDING * 2
const CONTENT_HEIGHT = PAGE_HEIGHT - PAGE_PADDING * 2

interface Block {
  key: string
  kind: 'header' | 'section' | 'entry' | 'content'
  node: ReactNode
}

function HeaderBlock({
  resume,
  theme,
  headerAlign,
}: {
  resume: Resume
  theme: ResumeTheme
  headerAlign: HeaderAlign
}) {
  const { personal } = resume
  const contact = [personal.phone, personal.email, personal.location].filter(Boolean).join(' ｜ ')
  return (
    <div style={{ textAlign: headerAlign }}>
      <h1 className="text-3xl font-bold tracking-wide" style={{ color: '#0f172a' }}>
        {personal.name || '未命名'}
      </h1>
      {personal.title && (
        <p className="mt-1.5 text-base font-medium" style={{ color: theme.accent }}>
          {personal.title}
        </p>
      )}
      {contact && (
        <p className="mt-3 text-sm" style={{ color: '#64748b' }}>
          {contact}
        </p>
      )}
    </div>
  )
}

function SectionTitle({ title, theme }: { title: string; theme: ResumeTheme }) {
  return (
    <h2
      className="pb-1.5 text-base font-bold"
      style={{ borderBottom: `2px solid ${theme.accent}`, color: '#0f172a' }}
    >
      {title}
    </h2>
  )
}

function EntryBlock({ entry, theme }: { entry: TimelineEntry; theme: ResumeTheme }) {
  const dates = [entry.startDate, entry.endDate].filter(Boolean).join(' – ')
  const bullets = entry.bullets
    .map((b) => b.trim())
    .filter(Boolean)
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>
          {entry.primary}
          {entry.secondary && (
            <span className="ml-2 font-normal" style={{ color: '#64748b' }}>
              {entry.secondary}
            </span>
          )}
        </p>
        {dates && (
          <p className="text-xs" style={{ color: '#94a3b8' }}>
            {dates}
          </p>
        )}
      </div>
      {bullets.length > 0 && (
        <ul className="mt-1.5 space-y-1">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed" style={{ color: '#334155' }}>
              <span style={{ color: theme.accent }}>•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function EducationBlock({ entry }: { entry: EducationEntry }) {
  const dates = [entry.startDate, entry.endDate].filter(Boolean).join(' – ')
  const detail = [entry.degree, entry.major].filter(Boolean).join(' · ')
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
      <p className="text-sm font-semibold" style={{ color: '#1e293b' }}>
        {entry.school}
        {detail && (
          <span className="ml-2 font-normal" style={{ color: '#64748b' }}>
            {detail}
          </span>
        )}
      </p>
      {dates && (
        <p className="text-xs" style={{ color: '#94a3b8' }}>
          {dates}
        </p>
      )}
    </div>
  )
}

interface PagedPreviewProps {
  resume: Resume
  theme: ResumeTheme
  headerAlign: HeaderAlign
}

export default function PagedPreview({ resume, theme, headerAlign }: PagedPreviewProps) {
  const measureRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<Block[][]>([])

  const blocks = useMemo<Block[]>(() => {
    const { personal, experience, projects, education, skills } = resume
    const list: Block[] = []

    list.push({
      key: 'header',
      kind: 'header',
      node: <HeaderBlock resume={resume} theme={theme} headerAlign={headerAlign} />,
    })

    if (personal.summary.trim()) {
      list.push({
        key: 'summary',
        kind: 'content',
        node: (
          <div>
            <SectionTitle title="个人简介" theme={theme} />
            <p className="mt-2 text-sm leading-relaxed" style={{ color: '#334155' }}>
              {personal.summary.trim()}
            </p>
          </div>
        ),
      })
    }

    if (experience.length) {
      list.push({
        key: 'exp-title',
        kind: 'section',
        node: <SectionTitle title="工作经历" theme={theme} />,
      })
      experience.forEach((entry) =>
        list.push({ key: `exp-${entry.id}`, kind: 'entry', node: <EntryBlock entry={entry} theme={theme} /> }),
      )
    }

    if (projects.length) {
      list.push({
        key: 'proj-title',
        kind: 'section',
        node: <SectionTitle title="项目经历" theme={theme} />,
      })
      projects.forEach((entry) =>
        list.push({ key: `proj-${entry.id}`, kind: 'entry', node: <EntryBlock entry={entry} theme={theme} /> }),
      )
    }

    if (education.length) {
      list.push({
        key: 'edu-title',
        kind: 'section',
        node: <SectionTitle title="教育经历" theme={theme} />,
      })
      education.forEach((entry) =>
        list.push({ key: `edu-${entry.id}`, kind: 'entry', node: <EducationBlock entry={entry} /> }),
      )
    }

    if (skills.length) {
      list.push({
        key: 'skills-title',
        kind: 'section',
        node: <SectionTitle title="专业技能" theme={theme} />,
      })
      list.push({
        key: 'skills',
        kind: 'content',
        node: (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full px-3 py-1 text-xs font-medium"
                style={{ backgroundColor: theme.accentSoft, color: theme.accent }}
              >
                {skill}
              </span>
            ))}
          </div>
        ),
      })
    }

    return list
  }, [resume, theme, headerAlign])

  useLayoutEffect(() => {
    const container = measureRef.current
    if (!container) return
    const heights = Array.from(container.children).map((child) => {
      const el = child as HTMLElement
      const style = window.getComputedStyle(el)
      return el.offsetHeight + parseFloat(style.marginTop) + parseFloat(style.marginBottom)
    })
    const packed = packBlocks(blocks, heights, CONTENT_HEIGHT)
    setPages(
      packed.map((pageBlocks) =>
        pageBlocks.map((b) => blocks.find((x) => x.key === b.key) as Block).filter(Boolean),
      ),
    )
  }, [blocks])

  return (
    <>
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none absolute left-[-9999px] top-0"
        style={{ width: CONTENT_WIDTH }}
      >
        {blocks.map((block) => (
          <div key={block.key} className="mb-4">
            {block.node}
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {pages.map((pageBlocks, index) => (
          <div
            key={index}
            data-page
            className="page overflow-hidden bg-white shadow-sm"
            style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT, padding: PAGE_PADDING }}
          >
            {pageBlocks.map((block) => (
              <div key={block.key} className="mb-4">
                {block.node}
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}
