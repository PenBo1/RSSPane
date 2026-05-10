// ========== OPML导入导出 ==========

import type { Feed } from '@/types/feed'

// 解析OPML
export const parseOpml = (content: string): Array<{ url: string; title: string }> => {
  const doc = new DOMParser().parseFromString(content, 'text/xml')
  const feeds: Array<{ url: string; title: string }> = []

  doc.querySelectorAll('outline[type="rss"], outline[type="atom"]').forEach(outline => {
    const url = outline.getAttribute('xmlUrl') || outline.getAttribute('url')
    const title = outline.getAttribute('title') || outline.getAttribute('text') || url || ''
    if (url) feeds.push({ url, title })
  })

  // 兼容没有type属性的outline
  doc.querySelectorAll('outline:not([type])').forEach(outline => {
    const url = outline.getAttribute('xmlUrl') || outline.getAttribute('url')
    if (url) {
      feeds.push({
        url,
        title: outline.getAttribute('title') || outline.getAttribute('text') || url,
      })
    }
  })

  return feeds
}

// 生成OPML
export const generateOpml = (feeds: Feed[]): string => {
  const outlines = feeds.map(f =>
    `<outline type="rss" text="${escapeXml(f.title)}" title="${escapeXml(f.title)}" xmlUrl="${escapeXml(f.url)}" htmlUrl="${escapeXml(f.siteUrl || '')}" />`
  ).join('\n    ')

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>RSSPane Feeds</title>
  </head>
  <body>
    ${outlines}
  </body>
</opml>`
}

// XML转义
const escapeXml = (str: string): string =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// 下载文件
export const downloadFile = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// 读取本地文件
export const readLocalFile = (accept: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return reject(new Error('No file selected'))
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file)
    }
    input.click()
  })
}