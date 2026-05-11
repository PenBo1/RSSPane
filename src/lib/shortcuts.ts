// ========== 快捷键定义 ==========

import type { ShortcutConfig } from '@/types/feed'


// 页面内快捷键定义（Vim风格单键）
export const IN_PAGE_SHORTCUTS: Array<{
  id: string
  defaultKey: string
  label: string
  description: string
  category: 'navigation' | 'article' | 'feed'
}> = [
  { id: 'nextArticle', defaultKey: 'j', label: 'shortcutNextArticle', description: 'shortcutNextArticleDesc', category: 'navigation' },
  { id: 'prevArticle', defaultKey: 'k', label: 'shortcutPrevArticle', description: 'shortcutPrevArticleDesc', category: 'navigation' },
  { id: 'openArticle', defaultKey: 'o', label: 'shortcutOpenArticle', description: 'shortcutOpenArticleDesc', category: 'navigation' },
  { id: 'focusSearch', defaultKey: '/', label: 'shortcutFocusSearch', description: 'shortcutFocusSearchDesc', category: 'navigation' },
  { id: 'goBack', defaultKey: 'Escape', label: 'shortcutGoBack', description: 'shortcutGoBackDesc', category: 'navigation' },
  { id: 'toggleStar', defaultKey: 's', label: 'shortcutToggleStar', description: 'shortcutToggleStarDesc', category: 'article' },
  { id: 'toggleRead', defaultKey: 'm', label: 'shortcutToggleRead', description: 'shortcutToggleReadDesc', category: 'article' },
  { id: 'refreshFeeds', defaultKey: 'r', label: 'shortcutRefreshFeeds', description: 'shortcutRefreshFeedsDesc', category: 'feed' },
]

// 按键显示映射
const KEY_DISPLAY_MAP: Record<string, string> = {
  'Escape': 'Esc',
  ' ': 'Space',
  'ArrowUp': '↑',
  'ArrowDown': '↓',
  'ArrowLeft': '←',
  'ArrowRight': '→',
}

export const formatKeyForDisplay = (key: string): string =>
  KEY_DISPLAY_MAP[key] || key.toUpperCase()

// 获取默认快捷键配置
export const getDefaultShortcuts = (): ShortcutConfig => {
  const config: ShortcutConfig = {}
  for (const s of IN_PAGE_SHORTCUTS) config[s.id] = s.defaultKey
  return config
}
