// ========== 导出服务 ==========

import type { Article, Feed, ExportFormat } from '@/types/feed'

// Markdown导出
const toMarkdown = (articles: Article[], feeds: Feed[]): string => {
  const lines: string[] = [
    '# RSSPane 导出文章',
    '',
    `导出时间: ${new Date().toLocaleString('zh-CN')}`,
    `文章数量: ${articles.length}`,
    '',
    '---',
    '',
  ]

  articles.forEach(article => {
    const feed = feeds.find(f => f.id === article.feedId)
    lines.push(`## ${article.title}`)
    lines.push('')
    lines.push(`- 来源: ${feed?.title || '未知'}`)
    lines.push(`- 链接: ${article.link}`)
    lines.push(`- 日期: ${new Date(article.pubDate).toLocaleString('zh-CN')}`)
    lines.push('')
    lines.push(article.summary || '无摘要')
    lines.push('')
    lines.push('---')
    lines.push('')
  })

  return lines.join('\n')
}

// HTML导出
const toHtml = (articles: Article[], feeds: Feed[]): string => {
  const items = articles.map(article => {
    const feed = feeds.find(f => f.id === article.feedId)
    return `
    <article style="margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 8px;">
      <h2 style="margin: 0;"><a href="${article.link}" target="_blank">${escapeHtml(article.title)}</a></h2>
      <p style="color: #666; font-size: 14px;">
        <strong>${escapeHtml(feed?.title || '未知')}</strong> |
        ${new Date(article.pubDate).toLocaleString('zh-CN')}
      </p>
      <p>${escapeHtml(article.summary || '无摘要')}</p>
    </article>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>RSSPane 导出</title>
</head>
<body style="max-width: 800px; margin: auto; padding: 20px;">
  <h1>RSSPane 导出文章</h1>
  <p>导出时间: ${new Date().toLocaleString('zh-CN')} | 共 ${articles.length} 篇</p>
  ${items}
</body>
</html>`
}

// HTML转义
const escapeHtml = (str: string): string =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// 导出函数
export const exportArticles = (articles: Article[], feeds: Feed[], format: ExportFormat): void => {
  const content = format === 'markdown' ? toMarkdown(articles, feeds) : toHtml(articles, feeds)
  const filename = `rsspane-export-${new Date().toISOString().slice(0, 10)}.${format === 'markdown' ? 'md' : 'html'}`

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}