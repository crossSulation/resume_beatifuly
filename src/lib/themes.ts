export interface ResumeTheme {
  id: string
  name: string
  accent: string
  accentSoft: string
  divider: string
}

export const RESUME_THEMES: ResumeTheme[] = [
  { id: 'indigo', name: '经典蓝', accent: '#4f46e5', accentSoft: '#eef2ff', divider: '#e2e8f0' },
  { id: 'emerald', name: '清新绿', accent: '#059669', accentSoft: '#ecfdf5', divider: '#e2e8f0' },
  { id: 'rose', name: '玫瑰红', accent: '#e11d48', accentSoft: '#fff1f2', divider: '#e2e8f0' },
  { id: 'slate', name: '极简灰', accent: '#334155', accentSoft: '#f1f5f9', divider: '#e2e8f0' },
  { id: 'amber', name: '暖阳橙', accent: '#d97706', accentSoft: '#fffbeb', divider: '#e2e8f0' },
]

export type HeaderAlign = 'center' | 'left'
