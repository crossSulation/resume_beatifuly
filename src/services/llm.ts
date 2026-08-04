import { loadSettings, type LlmSettings } from './settings'

/**
 * LLM 服务层
 *
 * 默认调用 OpenAI 兼容的 Chat Completions 接口。
 * 配置来源优先级：设置弹窗（localStorage）> 环境变量（.env.local）> 内置默认值。
 */

export interface BulletResult {
  original: string
  rewritten: string
  strengths: string[]
  suggestions: string[]
  metrics: string[]
}

async function callChat(
  messages: Array<{ role: 'system' | 'user'; content: string }>,
  temperature: number,
): Promise<string> {
  const { apiKey, baseUrl, model } = loadSettings()
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      temperature,
      response_format: { type: 'json_object' },
      messages,
    }),
  })

  if (!res.ok) {
    throw new Error(`LLM 请求失败：${res.status} ${(await res.text()).slice(0, 300)}`)
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('LLM 返回内容为空')
  }
  return content
}

export async function testLlmConnection(settings: LlmSettings): Promise<void> {
  if (!settings.apiKey) {
    throw new Error('请先填写 API Key')
  }
  const res = await fetch(`${settings.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      max_tokens: 1,
      messages: [{ role: 'user', content: 'ping' }],
    }),
  })
  if (!res.ok) {
    throw new Error(`连接失败（${res.status}）：${(await res.text()).slice(0, 200)}`)
  }
}

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

export interface JdKeywordAnalysis {
  matched: string[]
  missing: string[]
}

export interface JdOptimizeResult {
  results: BulletResult[]
  keywords: JdKeywordAnalysis
}

const JD_SYSTEM_PROMPT = `你是一位资深简历顾问。下面提供目标岗位的职位描述（JD）与若干简历条目，请针对该岗位优化简历。

规则：
1. 改写时突出与 JD 匹配的技能、职责与成果，自然命中 JD 中的关键词。
2. 保留事实，不编造经历；缺少量化数据时用 [X%]、[N 人] 等占位符。
3. 强动词开头，成果导向，保持简洁。
4. 最后从 JD 中提取核心关键词，判断当前条目与 JD 的匹配情况。

输出 JSON，格式为：
{
  "results": [
    {
      "original": "原文条目",
      "rewritten": "针对 JD 改写后的条目",
      "strengths": ["保留的优点"],
      "suggestions": ["具体改进建议"],
      "metrics": ["建议补充的量化指标"]
    }
  ],
  "keywordAnalysis": {
    "matched": ["简历条目中已体现的 JD 关键词"],
    "missing": ["JD 要求但简历未体现的关键词"]
  }
}

每条输入对应一个 results 元素，字段必须全部给出。`

export interface ResumeDeepAnalysis {
  overallAssessment: string
  strengths: string[]
  risks: string[]
  suggestions: string[]
  score: number
}

const DEEP_ANALYSIS_PROMPT = `你是一位资深招聘专家和简历顾问。请对下面的简历进行深度分析：

要求：
1. 总体评价：3-5 句话，说明简历的整体质量与定位。
2. 优点：列出 2-4 条做得好的地方。
3. 风险/问题：列出 2-5 条最影响面试通过率的问题（如表达空洞、缺少量化、与目标岗位不匹配、结构或篇幅问题）。
4. 改进建议：给出可执行的具体建议。
5. 评分：给出 0-100 的简历质量评分。

输出 JSON，格式为：
{
  "overallAssessment": "...",
  "strengths": ["..."],
  "risks": ["..."],
  "suggestions": ["..."],
  "score": 85
}`

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

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
  if (!loadSettings().apiKey) {
    await delay(600)
    return mockImprove(bullets)
  }

  const content = await callChat(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `请优化以下简历条目：\n${bullets.map((b, i) => `${i + 1}. ${b}`).join('\n')}` },
    ],
    loadSettings().temperature,
  )

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
  if (!loadSettings().apiKey) {
    await delay(600)
    return mockImproveSummary(text)
  }

  const content = await callChat(
    [
      { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
      { role: 'user', content: text },
    ],
    loadSettings().temperature,
  )

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

function mockJdOptimize(bullets: string[], _jd: string): JdOptimizeResult {
  return {
    results: mockImprove(bullets),
    keywords: {
      matched: ['React', '前端性能优化'],
      missing: ['微前端', '工程化体系建设', '团队管理'],
    },
  }
}

export async function optimizeBulletsWithJd(bullets: string[], jd: string): Promise<JdOptimizeResult> {
  if (!loadSettings().apiKey) {
    await delay(700)
    return mockJdOptimize(bullets, jd)
  }

  const content = await callChat(
    [
      { role: 'system', content: JD_SYSTEM_PROMPT },
      { role: 'user', content: `目标岗位 JD：\n${jd}\n\n请优化以下简历条目：\n${bullets.map((b, i) => `${i + 1}. ${b}`).join('\n')}` },
    ],
    loadSettings().temperature,
  )

  const parsed = JSON.parse(content) as { results?: BulletResult[]; keywordAnalysis?: JdKeywordAnalysis }
  if (!Array.isArray(parsed.results)) {
    throw new Error('LLM 返回格式不符合预期')
  }

  return {
    results: parsed.results,
    keywords: parsed.keywordAnalysis ?? { matched: [], missing: [] },
  }
}

function mockResumeAnalysis(_markdown: string): ResumeDeepAnalysis {
  return {
    overallAssessment:
      '简历整体结构完整，包含基本信息、经历、教育与技能，已有基础量化意识；但部分条目仍偏"做了什么"而非"做成了什么"，与目标岗位的匹配度可以进一步强化。',
    strengths: [
      '结构完整，信息组织清晰',
      '部分条目已包含量化数据，具备继续优化的基础',
      '技能标签覆盖主流技术栈',
    ],
    risks: [
      '多条条目以「负责 / 参与」等弱动词开头，个人贡献不突出',
      '量化覆盖不均衡，缺少对业务影响的描述',
      '技能标签与经历描述中的关键词呼应不足',
    ],
    suggestions: [
      '把「负责 / 参与」改写为强动词 + 成果结构（主导、搭建、推动）',
      '为每条经历补充至少一个可验证的数字',
      '结合目标 JD 校准技能标签与经历关键词',
    ],
    score: 76,
  }
}

export async function analyzeResumeWithLlm(markdown: string): Promise<ResumeDeepAnalysis> {
  if (!loadSettings().apiKey) {
    await delay(800)
    return mockResumeAnalysis(markdown)
  }

  const content = await callChat(
    [
      { role: 'system', content: DEEP_ANALYSIS_PROMPT },
      { role: 'user', content: markdown },
    ],
    0.4,
  )

  const parsed = JSON.parse(content) as {
    overallAssessment?: string
    strengths?: string[]
    risks?: string[]
    suggestions?: string[]
    score?: number
  }
  if (!parsed.overallAssessment) {
    throw new Error('LLM 返回格式不符合预期')
  }

  return {
    overallAssessment: parsed.overallAssessment,
    strengths: parsed.strengths ?? [],
    risks: parsed.risks ?? [],
    suggestions: parsed.suggestions ?? [],
    score: Math.max(0, Math.min(100, Math.round(parsed.score ?? 0))),
  }
}
