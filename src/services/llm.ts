/**
 * LLM 服务层
 *
 * 默认调用 OpenAI 兼容的 Chat Completions 接口，配置通过环境变量注入：
 *   VITE_LLM_API_KEY   - API Key
 *   VITE_LLM_BASE_URL  - 接口地址，默认 https://api.openai.com/v1
 *   VITE_LLM_MODEL     - 模型名，默认 gpt-4o-mini
 *
 * 未配置 API Key 时自动回退到本地模拟结果，方便先跑通界面。
 */

export interface BulletResult {
  original: string
  rewritten: string
  strengths: string[]
  suggestions: string[]
  metrics: string[]
}

const API_KEY = import.meta.env.VITE_LLM_API_KEY
const BASE_URL = import.meta.env.VITE_LLM_BASE_URL || 'https://api.openai.com/v1'
const MODEL = import.meta.env.VITE_LLM_MODEL || 'gpt-4o-mini'

const SYSTEM_PROMPT = `你是一位资深简历顾问，擅长把平淡的经历改写成有影响力、可量化的简历条目。

规则：
1. 用强动词开头（如：主导、搭建、优化、推动、设计）。
2. 尽量补充量化结果（数字、百分比、时长、规模）；原文没有数据时，用合理占位如 [X%]、[N 人] 并说明这是待补充的占位符。
3. 描述成果导向，突出对业务/团队的影响。
4. 保持简洁，每条不超过 40 个中文字符（或 25 个英文单词）。
5. 保留原文的事实与专业术语，不编造不存在的技能。

输出 JSON，格式为：
{
  "results": [
    {
      "original": "原文条目",
      "rewritten": "改写后的条目",
      "strengths": ["保留的优点"],
      "suggestions": ["具体改进建议"],
      "metrics": ["建议补充的量化指标"]
    }
  ]
}

每条输入对应一个 results 元素，字段必须全部给出。`

const SUMMARY_SYSTEM_PROMPT = `你是一位资深简历顾问。请优化下面的个人简介：

规则：
1. 控制在 2-3 句话，突出核心能力、经验年限与代表性成果。
2. 成果导向，原文已有量化信息务必保留；缺少数据时用 [X%]、[N 个] 等占位符。
3. 保留事实与专业方向，不编造不存在的技能。

输出 JSON，格式为：
{
  "rewritten": "改写后的个人简介",
  "suggestions": ["具体改进建议"],
  "metrics": ["建议补充的量化指标"]
}`

function mockImprove(bullets: string[]): BulletResult[] {
  const verbs = ['主导', '搭建', '优化', '推动', '设计']
  return bullets.map((bullet, i) => {
    const verb = verbs[i % verbs.length]
    return {
      original: bullet,
      rewritten: `${verb}${bullet.replace(/^[。，,.、\s]+/, '')}，使关键指标提升 [X%]`,
      strengths: ['保留原始经历与职责范围'],
      suggestions: [
        '补充具体数字，将 [X%] 替换为真实数据，增强说服力',
        '将模糊动词替换为强动词，突出个人贡献而非团队职责',
      ],
      metrics: ['完成周期', '用户/业务规模', '效率提升比例'],
    }
  })
}

function mockImproveSummary(text: string): BulletResult {
  return {
    original: text,
    rewritten: `${text.replace(/[。；;]+$/, '')}，主导过 [N] 个核心项目并持续推动关键指标提升 [X%]。`,
    strengths: ['保留核心信息'],
    suggestions: [
      '补充具体量化成果，将 [X%]、[N 个] 替换为真实数据',
      '按目标岗位调整关键词，突出与岗位最相关的能力',
    ],
    metrics: ['项目数量', '指标提升比例', '团队规模'],
  }
}

export async function improveBullets(bullets: string[]): Promise<BulletResult[]> {
  if (!API_KEY) {
    await new Promise((r) => setTimeout(r, 600))
    return mockImprove(bullets)
  }

  const res = await fetch(`${BASE_URL.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.6,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `请优化以下简历条目：\n${bullets.map((b, i) => `${i + 1}. ${b}`).join('\n')}` },
      ],
    }),
  })

  if (!res.ok) {
    throw new Error(`LLM 请求失败：${res.status} ${await res.text()}`)
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('LLM 返回内容为空')
  }

  const parsed = JSON.parse(content) as { results?: BulletResult[] }
  if (!Array.isArray(parsed.results)) {
    throw new Error('LLM 返回格式不符合预期')
  }
  return parsed.results
}

export async function improveBullet(bullet: string): Promise<BulletResult> {
  const [result] = await improveBullets([bullet])
  return result
}

export async function improveSummary(text: string): Promise<BulletResult> {
  if (!API_KEY) {
    await new Promise((r) => setTimeout(r, 600))
    return mockImproveSummary(text)
  }

  const res = await fetch(`${BASE_URL.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.6,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
    }),
  })

  if (!res.ok) {
    throw new Error(`LLM 请求失败：${res.status} ${await res.text()}`)
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('LLM 返回内容为空')
  }

  const parsed = JSON.parse(content) as { rewritten?: string; suggestions?: string[]; metrics?: string[] }
  if (!parsed.rewritten) {
    throw new Error('LLM 返回格式不符合预期')
  }

  return {
    original: text,
    rewritten: parsed.rewritten,
    strengths: [],
    suggestions: parsed.suggestions ?? [],
    metrics: parsed.metrics ?? [],
  }
}
