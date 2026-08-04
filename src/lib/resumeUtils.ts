import type { BeautifyDraftItem, BulletTarget, Resume, TimelineEntry } from '../types/resume'

export function collectBulletTargets(resume: Resume): BulletTarget[] {
  const targets: BulletTarget[] = []
  for (const kind of ['experience', 'projects'] as const) {
    for (const entry of resume[kind]) {
      entry.bullets.forEach((bullet, bulletIndex) => {
        const text = bullet.trim()
        if (!text) return
        targets.push({
          key: `${kind}:${entry.id}:${bulletIndex}`,
          kind: 'bullet',
          location: `${kind === 'experience' ? '工作经历' : '项目经历'} · ${entry.primary || '未命名'}`,
          entryId: entry.id,
          bulletIndex,
          text,
        })
      })
    }
  }
  return targets
}

export function applyAcceptedItems(resume: Resume, accepted: BeautifyDraftItem[]): Resume {
  const summaryChange = accepted.find((item) => item.kind === 'summary')

  const applyToEntries = (entries: TimelineEntry[]) =>
    entries.map((entry) => {
      const changes = accepted.filter((item) => item.kind === 'bullet' && item.entryId === entry.id)
      if (!changes.length) return entry
      const bullets = [...entry.bullets]
      for (const change of changes) {
        if (change.bulletIndex === undefined) continue
        bullets[change.bulletIndex] = change.rewritten
      }
      return { ...entry, bullets }
    })

  return {
    ...resume,
    personal: summaryChange ? { ...resume.personal, summary: summaryChange.rewritten } : resume.personal,
    experience: applyToEntries(resume.experience),
    projects: applyToEntries(resume.projects),
  }
}

export interface PlaceholderUpdate {
  key: string
  kind: 'bullet' | 'summary'
  entryId?: string
  bulletIndex?: number
  text: string
}

export function applyPlaceholderUpdates(resume: Resume, updates: PlaceholderUpdate[]): Resume {
  const summaryUpdate = updates.find((u) => u.kind === 'summary')

  const applyToEntries = (entries: TimelineEntry[]) =>
    entries.map((entry) => {
      const changes = updates.filter((u) => u.kind === 'bullet' && u.entryId === entry.id)
      if (!changes.length) return entry
      const bullets = [...entry.bullets]
      for (const change of changes) {
        if (change.bulletIndex === undefined) continue
        bullets[change.bulletIndex] = change.text
      }
      return { ...entry, bullets }
    })

  return {
    ...resume,
    personal: summaryUpdate ? { ...resume.personal, summary: summaryUpdate.text } : resume.personal,
    experience: applyToEntries(resume.experience),
    projects: applyToEntries(resume.projects),
  }
}
