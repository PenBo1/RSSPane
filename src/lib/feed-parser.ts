// ========== Feed解析 ==========

import type { Feed, Article } from '@/types/feed'
import { generateId } from '@/lib/storage'

// 提取纯文本
const stripHtml = (html: string): string => {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return (doc.body.textContent || '').trim()
}

// 截断文本
const truncate = (text: string, max = 200): string => {
  if (text.length <= max) return text
  return text.slice(0, max).trim() + '...'
}

// 从HTML中提取第一张图片
const extractImageFromHtml = (html: string): string | undefined => {
  if (!html) return undefined
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  return imgMatch?.[1]
}

// 解析日期
const parseDate = (dateStr: string | undefined): number => {
  if (!dateStr) return Date.now()
  const parsed = new Date(dateStr)
  return isNaN(parsed.getTime()) ? Date.now() : parsed.getTime()
}

// 解析RSS 2.0
const parseRss20 = (doc: Document, url: string): {
  feed: Partial<Feed>
  articles: Partial<Article>[]
} => {
  const channel = doc.querySelector('channel')
  if (!channel) throw new Error('Invalid RSS format')

  // 提取 feed 图片
  const feedImage = channel.querySelector('image url')?.textContent ||
    channel.querySelector('image')?.getAttribute('url') ||
    channel.querySelector('logo')?.textContent

  const feed: Partial<Feed> = {
    url,
    title: channel.querySelector('title')?.textContent || url,
    description: channel.querySelector('description')?.textContent || '',
    siteUrl: channel.querySelector('link')?.textContent || '',
    imageUrl: feedImage,
  }

  const articles: Partial<Article>[] = []
  channel.querySelectorAll('item').forEach(item => {
    const link = item.querySelector('link')?.textContent
    if (!link) return

    // 获取完整内容: content:encoded 或 description
    const contentEncoded = item.querySelector('encoded')?.textContent ||
      item.querySelector('content')?.textContent ||
      item.querySelector('description')?.textContent || ''

    // summary使用截断的纯文本
    const summaryText = truncate(stripHtml(
      item.querySelector('description')?.textContent || contentEncoded
    ))

    // 提取文章图片: enclosure 或 content 中的第一张图
    const enclosure = item.querySelector('enclosure[type^="image"]')
    const articleImage = enclosure?.getAttribute('url') ||
      extractImageFromHtml(contentEncoded) ||
      item.querySelector('image')?.textContent

    articles.push({
      title: item.querySelector('title')?.textContent || 'Untitled',
      link,
      summary: summaryText,
      content: contentEncoded,
      image: articleImage,
      pubDate: parseDate(item.querySelector('pubDate')?.textContent),
      guid: item.querySelector('guid')?.textContent || link,
    })
  })

  return { feed, articles }
}

// 解析Atom
const parseAtom = (doc: Document, url: string): {
  feed: Partial<Feed>
  articles: Partial<Article>[]
} => {
  const feedEl = doc.querySelector('feed')
  if (!feedEl) throw new Error('Invalid Atom format')

  // 提取 feed 图标
  const feedIcon = feedEl.querySelector('icon')?.textContent ||
    feedEl.querySelector('logo')?.textContent

  const feed: Partial<Feed> = {
    url,
    title: feedEl.querySelector('title')?.textContent || url,
    description: feedEl.querySelector('subtitle')?.textContent || '',
    siteUrl: feedEl.querySelector('link:not([rel])')?.getAttribute('href') ||
      feedEl.querySelector('link[rel="alternate"]')?.getAttribute('href') || '',
    imageUrl: feedIcon,
  }

  const articles: Partial<Article>[] = []
  feedEl.querySelectorAll('entry').forEach(entry => {
    const link = entry.querySelector('link[rel="alternate"]')?.getAttribute('href') ||
      entry.querySelector('link:not([rel])')?.getAttribute('href')
    if (!link) return

    // 获取完整内容: content 或 summary
    const contentEl = entry.querySelector('content')
    const summaryEl = entry.querySelector('summary')
    const fullContent = contentEl?.textContent || summaryEl?.textContent || ''

    // summary使用截断的纯文本
    const summaryText = truncate(stripHtml(fullContent))

    // 提取文章图片
    const articleImage = entry.querySelector('link[rel="enclosure"][type^="image"]')?.getAttribute('href') ||
      extractImageFromHtml(fullContent)

    articles.push({
      title: entry.querySelector('title')?.textContent || 'Untitled',
      link,
      summary: summaryText,
      content: fullContent,
      image: articleImage,
      pubDate: parseDate(
        entry.querySelector('published')?.textContent ||
        entry.querySelector('updated')?.textContent
      ),
      guid: entry.querySelector('id')?.textContent || link,
    })
  })

  return { feed, articles }
}

// 解析JSON Feed
const parseJsonFeed = (json: unknown, url: string): {
  feed: Partial<Feed>
  articles: Partial<Article>[]
} => {
  const data = json as {
    title?: string
    description?: string
    home_page_url?: string
    icon?: string
    image?: string
    items?: Array<{
      title?: string
      url?: string
      content_text?: string
      content_html?: string
      summary?: string
      image?: string
      date_published?: string
      id?: string
    }>
  }

  const feed: Partial<Feed> = {
    url,
    title: data.title || url,
    description: data.description || '',
    siteUrl: data.home_page_url || '',
    imageUrl: data.icon || data.image,
  }

  const articles: Partial<Article>[] = []
  (data.items || []).forEach(item => {
    if (!item.url) return

    // 获取完整内容
    const fullContent = item.content_html || item.content_text || item.summary || ''
    const summaryText = truncate(item.summary || item.content_text || stripHtml(item.content_html || ''))

    // 提取文章图片
    const articleImage = item.image || extractImageFromHtml(item.content_html || '')

    articles.push({
      title: item.title || 'Untitled',
      link: item.url,
      summary: summaryText,
      content: fullContent,
      image: articleImage,
      pubDate: parseDate(item.date_published),
      guid: item.id || item.url,
    })
  })

  return { feed, articles }
}

// 解析Feed内容
export const parseFeed = (content: string, url: string): {
  feed: Partial<Feed>
  articles: Partial<Article>[]
} => {
  // 尝试JSON格式
  if (content.trim().startsWith('{')) {
    try {
      return parseJsonFeed(JSON.parse(content), url)
    } catch {
      // 不是JSON，继续尝试XML
    }
  }

  // 解析XML
  const doc = new DOMParser().parseFromString(content, 'application/xml')

  // 检查解析错误
  if (doc.querySelector('parsererror')) {
    throw new Error('Invalid XML format')
  }

  // 检测格式
  return doc.querySelector('feed')
    ? parseAtom(doc, url)
    : parseRss20(doc, url)
}

// 抓取Feed
export const fetchFeed = async (
  url: string,
  etag?: string,
  lastModified?: string
): {
  feed: Partial<Feed>
  articles: Partial<Article>[]
  etag?: string
  lastModified?: string
  status: number
} => {
  const headers: Record<string, string> = {
    Accept: 'application/rss+xml, application/atom+xml, application/json, text/xml, */*',
  }

  if (etag) headers['If-None-Match'] = etag
  if (lastModified) headers['If-Modified-Since'] = lastModified

  const res = await fetch(url, { headers })

  if (res.status === 304) {
    return { feed: {}, articles: [], status: 304 }
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }

  const content = await res.text()
  const parsed = parseFeed(content, url)

  return {
    ...parsed,
    etag: res.headers.get('ETag') || undefined,
    lastModified: res.headers.get('Last-Modified') || undefined,
    status: res.status,
  }
}

// 创建Feed对象
export const createFeed = (parsed: Partial<Feed>, url: string): Feed => ({
  id: generateId(),
  url,
  title: parsed.title || url,
  description: parsed.description || '',
  siteUrl: parsed.siteUrl || '',
  imageUrl: parsed.imageUrl || undefined,
  lastFetched: Date.now(),
  updateInterval: 30,
  errorCount: 0,
  createdAt: Date.now(),
})

// 创建Article对象
export const createArticle = (parsed: Partial<Article>, feedId: string): Article => ({
  id: generateId(),
  feedId,
  title: parsed.title || 'Untitled',
  summary: parsed.summary || '',
  content: parsed.content || '',
  image: parsed.image || undefined,
  link: parsed.link || '',
  pubDate: parsed.pubDate || Date.now(),
  guid: parsed.guid || generateId(),
  isRead: false,
  isStarred: false,
  fetchTimestamp: Date.now(),
})

// 验证Feed URL
export const validateFeedUrl = async (url: string): {
  valid: boolean
  title?: string
  articlesCount?: number
  error?: string
} => {
  try {
    const result = await fetchFeed(url)
    return {
      valid: true,
      title: result.feed.title,
      articlesCount: result.articles.length,
    }
  } catch (e) {
    return {
      valid: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    }
  }
}