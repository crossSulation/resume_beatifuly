export interface PersonalInfo {
  name: string
  title: string
  phone: string
  email: string
  location: string
  summary: string
}

export interface TimelineEntry {
  id: string
  primary: string
  secondary: string
  startDate: string
  endDate: string
  bullets: string[]
}

export interface EducationEntry {
  id: string
  school: string
  degree: string
  major: string
  startDate: string
  endDate: string
}

export interface Resume {
  personal: PersonalInfo
  experience: TimelineEntry[]
  projects: TimelineEntry[]
  education: EducationEntry[]
  skills: string[]
}

export interface BeautifyDraftItem {
  key: string
  kind: 'bullet' | 'summary'
  entryId?: string
  bulletIndex?: number
  location: string
  original: string
  rewritten: string
  suggestions: string[]
  metrics: string[]
  accepted: boolean
}

export interface BulletTarget {
  key: string
  kind: 'bullet'
  location: string
  entryId: string
  bulletIndex: number
  text: string
}

export const uid = () => Math.random().toString(36).slice(2, 10)

export function createSampleResume(): Resume {
  return {
    personal: {
      name: '张三',
      title: '前端开发工程师',
      phone: '138-0000-0000',
      email: 'zhangsan@example.com',
      location: '上海',
      summary:
        '5 年前端开发经验，专注 React 生态与前端性能优化，有从 0 到 1 搭建产品、带团队落地工程化体系的经验。',
    },
    experience: [
      {
        id: uid(),
        primary: '某某科技有限公司',
        secondary: '高级前端工程师',
        startDate: '2022.06',
        endDate: '至今',
        bullets: [
          '负责公司官网改版，通过重构首屏渲染链路将 LCP 从 4.2s 优化至 1.8s',
          '搭建前端组件库，沉淀 40+ 业务组件，覆盖 12 个业务线的复用场景',
          '主导前端工程化建设，引入 Vite 与自动化测试，构建时间缩短 60%',
        ],
      },
      {
        id: uid(),
        primary: '某某网络股份有限公司',
        secondary: '前端工程师',
        startDate: '2019.07',
        endDate: '2022.05',
        bullets: ['参与电商平台订单模块开发，负责核心下单流程的交互实现', '维护后台管理系统，修复日常 Bug 并优化页面加载速度'],
      },
    ],
    projects: [
      {
        id: uid(),
        primary: '简历美化助手',
        secondary: '全栈开发',
        startDate: '2026.08',
        endDate: '至今',
        bullets: ['基于 Vite + React + TailwindCSS 构建，接入 LLM 逐条优化简历条目并提供改进建议'],
      },
    ],
    education: [
      {
        id: uid(),
        school: '某某大学',
        degree: '本科',
        major: '计算机科学与技术',
        startDate: '2015.09',
        endDate: '2019.06',
      },
    ],
    skills: ['React', 'TypeScript', 'Vite', 'TailwindCSS', 'Node.js', '性能优化', '自动化测试'],
  }
}
