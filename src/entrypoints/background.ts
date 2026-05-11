// ========== Background Service Worker ==========

export default defineBackground(() => {
  const ALARM_NAME = 'rsspane-fetch'

  // 初始化
  browser.runtime.onInstalled.addListener(async () => {
    const { configRepo } = await import('@/lib/storage')
    const config = await configRepo.get()
    await browser.alarms.create(ALARM_NAME, { periodInMinutes: config.fetchInterval || 30 })
  })

  // 监听闹钟
  browser.alarms.onAlarm.addListener(async alarm => {
    if (alarm.name === ALARM_NAME) await fetchAllFeeds()
  })

  // 抓取所有订阅
  const fetchAllFeeds = async () => {
    const { feedRepo, articleRepo, configRepo } = await import('@/lib/storage')
    const { fetchFeed, createArticle } = await import('@/lib/feed-parser')

    const feeds = await feedRepo.getAll()
    const config = await configRepo.get()
    const maxArticles = config.maxArticlesPerFeed || 500
    const articles = await articleRepo.getAll()

    for (const feed of feeds) {
      try {
        const result = await fetchFeed(feed.url, feed.etag, feed.lastModified)
        if (result.status === 304) continue

        const newArticles: typeof result.articles = []
        for (const p of result.articles) {
          if (p.guid && !await articleRepo.getByGuid(p.guid)) {
            newArticles.push(p)
          }
        }

        // 限制每个订阅源的文章数量
        const currentCount = articles.filter(a => a.feedId === feed.id).length
        const canAdd = maxArticles - currentCount
        const limitedNewArticles = newArticles.slice(0, Math.max(0, canAdd))

        if (limitedNewArticles.length) {
          const toAdd = limitedNewArticles.map(p => createArticle(p, feed.id))
          await articleRepo.addBatch(toAdd)
        }
        await feedRepo.update({
          ...feed,
          lastFetched: Date.now(),
          etag: result.etag,
          lastModified: result.lastModified,
          errorCount: 0,
        })
      } catch (e) {
        await feedRepo.update({
          ...feed,
          errorCount: feed.errorCount + 1,
          lastError: e instanceof Error ? e.message : 'Unknown',
        })
      }
    }

    // 通知UI（忽略无监听器错误）
    browser.runtime.sendMessage({ type: 'feeds-refreshed' }).catch(() => {})
  }

  // 消息处理
  browser.runtime.onMessage.addListener((msg, _, respond) => {
    if (msg.type === 'refresh-feeds') {
      fetchAllFeeds().then(() => respond({ success: true })).catch(e => respond({ success: false, error: e.message }))
      return true
    }

    if (msg.type === 'update-fetch-interval') {
      browser.alarms.clear(ALARM_NAME).then(() => {
        browser.alarms.create(ALARM_NAME, { periodInMinutes: msg.payload as number })
        respond({ success: true })
      })
      return true
    }
  })

  // 点击图标打开侧边栏
  browser.action.onClicked.addListener(tab => {
    if (tab.id !== undefined) browser.sidePanel.open({ tabId: tab.id })
  })

  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {})
})