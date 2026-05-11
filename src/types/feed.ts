// ========== 类型定义 ==========

// Feed订阅源
export type Feed = {
  id: string
  url: string
  title: string
  description?: string
  siteUrl?: string
  imageUrl?: string
  lastFetched?: number
  updateInterval: number
  etag?: string
  lastModified?: string
  errorCount: number
  lastError?: string
  createdAt: number
  category?: string
}

// Article文章
export type Article = {
  id: string
  feedId: string
  title: string
  summary: string
  content?: string
  image?: string
  link: string
  pubDate: number
  guid: string
  isRead: boolean
  isStarred: boolean
  fetchTimestamp: number
}

// App配置
export type AppConfig = {
  // 外观
  theme: 'light' | 'dark' | 'system'
  fontSize: 'small' | 'medium' | 'large'
  language: 'zh' | 'en'
  // 阅读
  articleSort: 'newest' | 'oldest'
  showImages: boolean
  autoMarkRead: boolean
  // 更新
  fetchInterval: number
  maxArticlesPerFeed: number
  autoUpdate: boolean
  // 数据
  keepDays: number
  // 快捷键
  shortcuts: ShortcutConfig
}

// 文章筛选
export type ArticleFilter = 'all' | 'unread' | 'starred'

// 快捷键配置: action ID -> key combo string
export type ShortcutConfig = Record<string, string>

// 设置菜单项
export type SettingsMenu = 'appearance' | 'reading' | 'update' | 'data' | 'shortcuts' | 'about'

// 导出格式
export type ExportFormat = 'markdown' | 'html'