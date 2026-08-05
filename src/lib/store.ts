import { createSampleResume, uid, type Resume } from '../types/resume'
import { idbGet, idbSet } from '../services/idb'

export interface ResumeItem {
  id: string
  name: string
  updatedAt: number
  resume: Resume
}

export interface ResumeStore {
  activeId: string
  items: ResumeItem[]
}

interface StoredPayload {
  version: number
  savedAt: number
  data: ResumeStore
}

const RESUMES_KEY = 'resume-beautify:resumes'
const LEGACY_KEY = 'resume-beautify:data'
const IDB_KEY = 'resumes'
const STORE_VERSION = 2

function createEmptyResume(): Resume {
  return {
    personal: { name: '', title: '', phone: '', email: '', location: '', summary: '' },
    experience: [],
    projects: [],
    education: [],
    skills: [],
  }
}

export function createInitialItem(): ResumeItem {
  const resume = createSampleResume()
  return { id: uid(), name: resume.personal.name || '我的简历', updatedAt: Date.now(), resume }
}

export function createBlankItem(name = '未命名简历'): ResumeItem {
  return { id: uid(), name, updatedAt: Date.now(), resume: createEmptyResume() }
}

function isValidStore(store: unknown): store is ResumeStore {
  const s = store as ResumeStore
  return Boolean(
    s &&
      typeof s.activeId === 'string' &&
      Array.isArray(s.items) &&
      s.items.length > 0 &&
      s.items.every((i) => i && typeof i.id === 'string' && i.resume && typeof i.resume === 'object'),
  )
}

function normalizeStore(store: ResumeStore): ResumeStore {
  const items = store.items
  const activeId = store.activeId && items.some((i) => i.id === store.activeId) ? store.activeId : items[0].id
  return { activeId, items }
}

function makePayload(store: ResumeStore): StoredPayload {
  return { version: STORE_VERSION, savedAt: Date.now(), data: store }
}

/**
 * 读取 localStorage（同步，供首屏即时渲染）：
 * 支持 v2 版本化结构、v1 裸结构，以及更早的单份简历结构，逐级迁移。
 */
export function loadResumeStoreMeta(): { savedAt: number; data: ResumeStore } | null {
  try {
    const raw = localStorage.getItem(RESUMES_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as StoredPayload | ResumeStore
      if (parsed && typeof parsed === 'object' && 'data' in parsed && isValidStore(parsed.data)) {
        return { savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0, data: normalizeStore(parsed.data) }
      }
      if (isValidStore(parsed)) {
        return { savedAt: 0, data: normalizeStore(parsed) }
      }
    }
  } catch {
    // 忽略损坏的缓存，继续尝试旧版迁移
  }

  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (raw) {
      const resume = JSON.parse(raw) as Resume
      if (resume?.personal) {
        const item: ResumeItem = {
          id: uid(),
          name: resume.personal.name?.trim() || '我的简历',
          updatedAt: Date.now(),
          resume,
        }
        localStorage.removeItem(LEGACY_KEY)
        return { savedAt: 0, data: { activeId: item.id, items: [item] } }
      }
    }
  } catch {
    // 忽略损坏的旧版数据
  }

  return null
}

export function loadResumeStore(): ResumeStore {
  return loadResumeStoreMeta()?.data ?? createInitialStore()
}

function createInitialStore(): ResumeStore {
  const item = createInitialItem()
  return { activeId: item.id, items: [item] }
}

/** 读取 IndexedDB（异步，作为权威持久副本），失败返回 null 由调用方兜底。 */
export async function loadResumeStoreIdb(): Promise<{ savedAt: number; data: ResumeStore } | null> {
  try {
    const payload = await idbGet<StoredPayload>(IDB_KEY)
    if (payload && payload.data && isValidStore(payload.data)) {
      return { savedAt: typeof payload.savedAt === 'number' ? payload.savedAt : 0, data: normalizeStore(payload.data) }
    }
  } catch {
    // IndexedDB 不可用或数据损坏
  }
  return null
}

export function saveResumeStoreLocal(store: ResumeStore): boolean {
  try {
    localStorage.setItem(RESUMES_KEY, JSON.stringify(makePayload(store)))
    return true
  } catch {
    return false
  }
}

export function saveResumeStoreIdb(store: ResumeStore): Promise<void> {
  return idbSet(IDB_KEY, makePayload(store))
}

let idbTimer: ReturnType<typeof setTimeout> | undefined

/**
 * 双保险保存：
 * 1. localStorage 同步即时写入（首屏缓存与兜底）
 * 2. IndexedDB 防抖 400ms 异步写入（权威持久副本）
 * 返回 localStorage 写入是否成功。
 */
export function saveResumeStore(store: ResumeStore): boolean {
  const ok = saveResumeStoreLocal(store)
  if (idbTimer) clearTimeout(idbTimer)
  idbTimer = setTimeout(() => {
    void saveResumeStoreIdb(store).catch(() => {
      // IndexedDB 写入失败时 localStorage 已兜底
    })
  }, 400)
  return ok
}
