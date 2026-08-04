import type { Resume } from '../types/resume'

export const PLACEHOLDER_RE = /\[[^\]\[]{1,20}\]/g
const PLACEHOLDER_TEST = /\[[^\]\[]{1,20}\]/

const STRONG_VERB_RE =
  /^(主导|搭建|构建|设计|开发|优化|推动|落地|重构|带领|发起|建立|提升|降低|实现|完成|攻克|孵化|制定|撰写)/
const WEAK_PHRASE_RE = /负责|参与|协助|帮忙|跟进|处理日常/
const QUANTIFIED_RE = /[\d%]|万|百万|亿|倍/
const OVERLONG_LENGTH = 45

export interface PlaceholderItem {
  key: string
  kind: 'bullet' | 'summary'
  entryId?: string
  bulletIndex?: number
  location: string
  text: string
  placeholders: string[]
}

export function collectPlaceholderItems(resume: Resume): PlaceholderItem[] {
  const items: PlaceholderItem[] = []

  const push = (item: Omit<PlaceholderItem, 'placeholders'>) => {
    const placeholders = [...item.text.matchAll(PLACEHOLDER_RE)].map((m) => m[0])
    if (placeholders.length) items.push({ ...item, placeholders })
  }

  const summary = resume.personal.summary.trim()
  if (summary) {
    push({ key: 'personal:summary', kind: 'summary', location: '个人简介', text: summary })
  }

  for (const kind of ['experience', 'projects'] as const) {
    for (const entry of resume[kind]) {
      entry.bullets.forEach((bullet, bulletIndex) => {
        const text = bullet.trim()
        if (!text) return
        push({
          key: `${kind}:${entry.id}:${bulletIndex}`,
          kind: 'bullet',
          entryId: entry.id,
          bulletIndex,
          location: `${kind === 'experience' ? '工作经历' : '项目经历'} · ${entry.primary || '未命名'}`,
          text,
        })
      })
    }
  }

  return items
}

export interface HealthReport {
  score: number
  bulletCount: number
  quantifiedCount: number
  quantifiedRatio: number
  strongVerbCount: number
  strongVerbRatio: number
  weakPhraseCount: number
  overlongCount: number
  placeholderCount: number
  summaryOk: boolean
  skillsOk: boolean
  suggestions: string[]
}

export function analyzeResume(resume: Resume): HealthReport {
  const bullets = [...resume.experience.flatMap((e) => e.bullets), ...resume.projects.flatMap((p) => p.bullets)]
    .map((b) => b.trim())
    .filter(Boolean)

  const bulletCount = bullets.length
  const quantifiedCount = bullets.filter((b) => QUANTIFIED_RE.test(b)).length
  const strongVerbCount = bullets.filter((b) => STRONG_VERB_RE.test(b)).length
  const weakPhraseCount = bullets.filter((b) => WEAK_PHRASE_RE.test(b)).length
  const overlongCount = bullets.filter((b) => [...b].length > OVERLONG_LENGTH).length
  const placeholderCount =
    bullets.filter((b) => PLACEHOLDER_TEST.test(b)).length + (PLACEHOLDER_TEST.test(resume.personal.summary) ? 1 : 0)

  const summaryLength = [...resume.personal.summary.trim()].length
  const summaryOk = summaryLength >= 20 && summaryLength <= 120
  const skillsOk = resume.skills.length >= 3

  const quantifiedRatio = bulletCount ? quantifiedCount / bulletCount : 0
  const strongVerbRatio = bulletCount ? strongVerbCount / bulletCount : 0

  const score = Math.min(
    100,
    Math.round(
      40 +
        quantifiedRatio * 25 +
        strongVerbRatio * 15 +
        (weakPhraseCount === 0 ? 7 : Math.max(0, 7 - weakPhraseCount * 2)) +
        (overlongCount === 0 ? 5 : Math.max(0, 5 - overlongCount * 2)) +
        (placeholderCount === 0 ? 5 : 0) +
        (summaryOk ? 5 : 0) +
        (skillsOk ? 5 : 0) +
        (bulletCount >= 3 ? 3 : 0),
    ),
  )

  const suggestions: string[] = []
  if (bulletCount === 0) {
    suggestions.push('工作/项目经历为空，先补充至少 3 条职责描述')
  } else {
    if (quantifiedRatio < 0.5) {
      suggestions.push(`量化条目占比 ${Math.round(quantifiedRatio * 100)}%，建议至少一半条目包含数字、百分比或规模`)
    }
    if (strongVerbRatio < 0.5) {
      suggestions.push(`强动词开头占比 ${Math.round(strongVerbRatio * 100)}%，建议多用「主导、搭建、优化、推动」等动词`)
    }
    if (weakPhraseCount > 0) {
      suggestions.push(`检测到 ${weakPhraseCount} 条使用「负责 / 参与 / 协助」等弱表达，建议改为成果导向描述`)
    }
    if (overlongCount > 0) {
      suggestions.push(`${overlongCount} 条超过 45 字，建议拆分或精简`)
    }
  }
  if (placeholderCount > 0) {
    suggestions.push(`存在 ${placeholderCount} 处 [X%] 等占位符，点「补全数据」填写真实数值`)
  }
  if (!summaryOk) {
    suggestions.push(summaryLength === 0 ? '个人简介为空，建议补充 2-3 句核心优势' : '个人简介建议控制在 20-120 字之间')
  }
  if (!skillsOk) {
    suggestions.push('技能标签少于 3 个，建议补充与岗位相关的技能')
  }
  if (!suggestions.length) {
    suggestions.push('整体表现不错，保持量化与成果导向，继续打磨细节即可')
  }

  return {
    score,
    bulletCount,
    quantifiedCount,
    quantifiedRatio,
    strongVerbCount,
    strongVerbRatio,
    weakPhraseCount,
    overlongCount,
    placeholderCount,
    summaryOk,
    skillsOk,
    suggestions,
  }
}
