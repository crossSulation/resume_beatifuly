export type ProxyHealth = 'checking' | 'ok' | 'no-key' | 'down'

export async function checkProxyHealth(): Promise<Exclude<ProxyHealth, 'checking'>> {
  try {
    const res = await fetch('/api/health', { method: 'GET' })
    if (res.ok) {
      const data = (await res.json()) as { configured?: boolean }
      return data.configured ? 'ok' : 'no-key'
    }
    return 'down'
  } catch {
    return 'down'
  }
}
