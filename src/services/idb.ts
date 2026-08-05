/**
 * IndexedDB 最小封装：单库单对象存储（kv），Promise 风格。
 * 仅在需要时打开数据库，未开启 IndexedDB 的环境会抛出异常，由调用方兜底。
 */

const DB_NAME = 'resume-beautify'
const DB_VERSION = 1
const STORE_NAME = 'kv'

let dbPromise: Promise<IDBDatabase> | null = null

function getIndexedDb(): IDBFactory | undefined {
  return typeof indexedDB !== 'undefined' ? indexedDB : undefined
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  const factory = getIndexedDb()
  if (!factory) {
    dbPromise = Promise.reject(new Error('IndexedDB 不可用'))
    return dbPromise
  }

  dbPromise = new Promise((resolve, reject) => {
    const req = factory.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('打开 IndexedDB 失败'))
    req.onblocked = () => reject(new Error('IndexedDB 被其他标签页占用'))
  })

  return dbPromise
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb()
  return new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB 读取失败'))
  })
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB 写入失败'))
  })
}
