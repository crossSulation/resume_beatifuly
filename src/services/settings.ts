export type LlmTransport = 'direct' | 'proxy'

export interface LlmSettings {
  transport: LlmTransport
  apiKey: string
  baseUrl: string
  model: string
  temperature: number
}

const SETTINGS_KEY = 'resume-beautify:llm-settings'

export const DEFAULT_SETTINGS: LlmSettings = {
  transport: import.meta.env.VITE_LLM_TRANSPORT === 'proxy' ? 'proxy' : 'direct',
  apiKey: import.meta.env.VITE_LLM_API_KEY ?? '',
  baseUrl: import.meta.env.VITE_LLM_BASE_URL ?? 'https://api.openai.com/v1',
  model: import.meta.env.VITE_LLM_MODEL ?? 'gpt-4o-mini',
  temperature: 0.6,
}

export function loadSettings(): LlmSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LlmSettings>
      return {
        transport: parsed.transport === 'proxy' ? 'proxy' : 'direct',
        apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : DEFAULT_SETTINGS.apiKey,
        baseUrl:
          typeof parsed.baseUrl === 'string' && parsed.baseUrl.trim()
            ? parsed.baseUrl.trim()
            : DEFAULT_SETTINGS.baseUrl,
        model: typeof parsed.model === 'string' && parsed.model.trim() ? parsed.model.trim() : DEFAULT_SETTINGS.model,
        temperature:
          typeof parsed.temperature === 'number' ? parsed.temperature : DEFAULT_SETTINGS.temperature,
      }
    }
  } catch {
    // 忽略损坏的设置缓存
  }
  return DEFAULT_SETTINGS
}

export function saveSettings(settings: LlmSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
