// ========== OPML导入导出 ==========

import type { Feed } from '@/types/feed'

// 解析OPML
export const parseOpml = (content: string): Array<{ url: string; title: string; category?: string }> => {
  const doc = new DOMParser().parseFromString(content, 'text/xml')
  const feeds: Array<{ url: string; title: string; category?: string }> = []

  // 解析带分类的outline（父outline为文件夹，子outline为订阅）
  doc.querySelectorAll('outline').forEach(outline => {
    const type = outline.getAttribute('type')
    const xmlUrl = outline.getAttribute('xmlUrl') || outline.getAttribute('url')

    if (type === 'rss' || type === 'atom' || xmlUrl) {
      // 这是一个订阅源
      const title = outline.getAttribute('title') || outline.getAttribute('text') || xmlUrl || ''
      // 检查父元素是否为文件夹
      const parent = outline.parentElement
      const parentType = parent?.getAttribute('type')
      const parentXmlUrl = parent?.getAttribute('xmlUrl')
      const category = (!parentType && !parentXmlUrl && parent?.tagName === 'outline')
        ? (parent.getAttribute('title') || parent.getAttribute('text') || undefined)
        : undefined
      if (xmlUrl) feeds.push({ url: xmlUrl, title, category })
    } else {
      // 这是一个文件夹，解析其子元素
      const folderName = outline.getAttribute('title') || outline.getAttribute('text') || ''
      outline.querySelectorAll('outline').forEach(child => {
        const childUrl = child.getAttribute('xmlUrl') || child.getAttribute('url')
        if (childUrl) {
          feeds.push({
            url: childUrl,
            title: child.getAttribute('title') || child.getAttribute('text') || childUrl,
            category: folderName || undefined,
          })
        }
      })
    }
  })

  return feeds
}

// 生成OPML
export const generateOpml = (feeds: Feed[]): string => {
  // 按分组归类
  const groups = new Map<string, Feed[]>()
  const ungrouped: Feed[] = []
  for (const feed of feeds) {
    if (feed.category) {
      const list = groups.get(feed.category) || []
      list.push(feed)
      groups.set(feed.category, list)
    } else {
      ungrouped.push(feed)
    }
  }

  const outlineFeed = (f: Feed) =>
    `<outline type="rss" text="${escapeXml(f.title)}" title="${escapeXml(f.title)}" xmlUrl="${escapeXml(f.url)}" htmlUrl="${escapeXml(f.siteUrl || '')}" />`

  const bodyParts: string[] = []

  for (const [category, categoryFeeds] of groups) {
    bodyParts.push(`    <outline text="${escapeXml(category)}" title="${escapeXml(category)}">
      ${categoryFeeds.map(outlineFeed).join('\n      ')}
    </outline>`)
  }

  for (const feed of ungrouped) {
    bodyParts.push(`    ${outlineFeed(feed)}`)
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>RSSPane Feeds</title>
  </head>
  <body>
${bodyParts.join('\n')}
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