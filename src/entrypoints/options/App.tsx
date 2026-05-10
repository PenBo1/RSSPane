// ========== Options页面入口 ==========

import { useState, useEffect, useCallback, useMemo } from 'react'
import { ThreeColumnLayout } from '@/components/layouts/ThreeColumnLayout'
import { SettingsPanel } from '@/components/SettingsPanel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  PlusIcon,
  LoaderIcon,
  SunIcon,
  MonitorIcon,
  RefreshCwIcon,
  DownloadIcon,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { feedRepo, articleRepo, configRepo, getStats } from '@/lib/storage'
import { fetchFeed, createFeed, createArticle } from '@/lib/feed-parser'
import { parseOpml, generateOpml, downloadFile, readLocalFile } from '@/lib/opml'
import { exportArticles } from '@/lib/export'
import type { Feed, Article, AppConfig, ArticleFilter, SettingsMenu, ExportFormat } from '@/types/feed'

const App = () => {
  const { t } = useI18n()

  // 数据
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [stats, setStats] = useState({ feedsCount: 0, articlesCount: 0, unreadCount: 0, starredCount: 0 })

  // 视图状态
  const [view, setView] = useState<'reader' | 'settings'>('reader')
  const [settingsMenu, setSettingsMenu] = useState<SettingsMenu>('appearance')
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [feedSearchQuery, setFeedSearchQuery] = useState('')
  const [articleFilter, setArticleFilter] = useState<ArticleFilter>('all')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [clearDialogOpen, setClearDialogOpen] = useState(false)

  // 表单
  const [feedUrl, setFeedUrl] = useState('')
  const [feedUrlError, setFeedUrlError] = useState('')
  const [adding, setAdding] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // 加载
  const load = useCallback(async () => {
    const allFeeds = await feedRepo.getAll()
    setFeeds(allFeeds)
    setArticles(await articleRepo.getAll())
    setStats(await getStats())
    const cfg = await configRepo.get()
    setConfig(cfg)

    // 同步主题和字体大小到 DOM
    if (cfg) {
      const root = document.documentElement
      const isDark = cfg.theme === 'system' ? window.matchMedia('(prefers-color-scheme: dark)').matches : cfg.theme === 'dark'
      root.classList.toggle('dark', isDark)
      root.classList.remove('text-size-small', 'text-size-medium', 'text-size-large')
      root.classList.add(`text-size-${cfg.fontSize}`)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // 未读计数
  const feedUnreadCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    articles.forEach(a => { if (!a.isRead) counts[a.feedId] = (counts[a.feedId] || 0) + 1 })
    return counts
  }, [articles])

  // 排序文章
  const sortedArticles = useMemo(() => {
    const sorted = [...articles]
    if (config?.articleSort === 'oldest') {
      sorted.sort((a, b) => a.pubDate - b.pubDate)
    } else {
      sorted.sort((a, b) => b.pubDate - a.pubDate)
    }
    return sorted
  }, [articles, config?.articleSort])

  // 刷新订阅
  const refresh = useCallback(async () => {
    setRefreshing(true)
    const maxArticles = config?.maxArticlesPerFeed || 500

    for (const feed of feeds) {
      try {
        const result = await fetchFeed(feed.url, feed.etag, feed.lastModified)
        if (result.status === 304) continue

        const existing = new Set(articles.filter(a => a.feedId === feed.id).map(a => a.guid))
        const newArticles = result.articles.map(p => createArticle(p, feed.id)).filter(a => !existing.has(a.guid))

        // 限制每个订阅源的文章数量
        const currentCount = articles.filter(a => a.feedId === feed.id).length
        const canAdd = maxArticles - currentCount
        const limitedNewArticles = newArticles.slice(0, Math.max(0, canAdd))

        if (limitedNewArticles.length) await articleRepo.addBatch(limitedNewArticles)
        await feedRepo.update({ ...feed, lastFetched: Date.now(), etag: result.etag, lastModified: result.lastModified, errorCount: 0 })
      } catch (e) {
        await feedRepo.update({ ...feed, errorCount: feed.errorCount + 1, lastError: e instanceof Error ? e.message : 'Unknown' })
      }
    }
    await load()
    setRefreshing(false)
  }, [feeds, articles, load, config?.maxArticlesPerFeed])

  // 添加Feed
  const addFeed = useCallback(async () => {
    if (!feedUrl.trim()) return
    setAdding(true)
    setFeedUrlError('')

    try {
      const result = await fetchFeed(feedUrl.trim())
      const feed = createFeed(result.feed, feedUrl.trim())
      await feedRepo.add(feed)

      const newArticles = result.articles.map(p => createArticle(p, feed.id))
      if (newArticles.length) await articleRepo.addBatch(newArticles)

      setFeedUrl('')
      setAddDialogOpen(false)
      await load()
      toast.success(t('addFeedSuccess'))
    } catch (e) {
      setFeedUrlError(e instanceof Error ? e.message : t('addFailed'))
      toast.error(t('addFailed'))
    }
    setAdding(false)
  }, [feedUrl, load, t])

  // 导入OPML
  const importOpml = useCallback(async () => {
    try {
      const content = await readLocalFile('.opml,.xml')
      const parsedFeeds = parseOpml(content)

      for (const { url, title } of parsedFeeds) {
        try {
          const result = await fetchFeed(url)
          const feed = createFeed({ ...result.feed, title }, url)
          await feedRepo.add(feed)
          const newArticles = result.articles.map(p => createArticle(p, feed.id))
          if (newArticles.length) await articleRepo.addBatch(newArticles)
        } catch { /* skip */ }
      }
      await load()
    } catch { /* ignore */ }
  }, [load])

  // 导出OPML
  const exportOpml = useCallback(() => {
    downloadFile(generateOpml(feeds), `rsspane-${new Date().toISOString().slice(0, 10)}.opml`)
  }, [feeds])

  // 清空文章
  const clearArticles = useCallback(async () => {
    await articleRepo.clearAll()
    setClearDialogOpen(false)
    await load()
  }, [load])

  // 设置主题
  const setTheme = useCallback(async (theme: 'light' | 'dark' | 'system') => {
    await configRepo.update({ theme })
    setConfig(c => c ? { ...c, theme } : null)
    const root = document.documentElement
    const isDark = theme === 'system' ? window.matchMedia('(prefers-color-scheme: dark)').matches : theme === 'dark'
    root.classList.toggle('dark', isDark)
  }, [])

  // 更新配置
  const updateConfig = useCallback(async (updates: Partial<AppConfig>) => {
    const newConfig = await configRepo.update(updates)
    setConfig(newConfig)

    // 同步字体大小到 DOM
    if (updates.fontSize) {
      const root = document.documentElement
      root.classList.remove('text-size-small', 'text-size-medium', 'text-size-large')
      root.classList.add(`text-size-${updates.fontSize}`)
    }

    // 同步更新间隔到 background
    if (updates.fetchInterval) {
      browser.runtime.sendMessage({ type: 'update-fetch-interval', payload: updates.fetchInterval })
    }
  }, [])

  // 收藏/已读
  const toggleStar = useCallback(async (id: string) => {
    const updated = await articleRepo.toggleStar(id)
    if (updated) {
      setArticles(prev => prev.map(a => a.id === id ? updated : a))
      if (selectedArticle?.id === id) setSelectedArticle(updated)
    }
  }, [selectedArticle])

  const markRead = useCallback(async (id: string) => {
    await articleRepo.markRead(id)
    setArticles(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a))
    if (selectedArticle?.id === id) setSelectedArticle(prev => prev ? { ...prev, isRead: true } : null)
  }, [selectedArticle])

  const openExternal = useCallback((article: Article) => window.open(article.link, '_blank'), [])

  const markAllRead = useCallback(async () => {
    await articleRepo.markAllRead(selectedFeedId)
    setArticles(prev => prev.map(a => (selectedFeedId === null || a.feedId === selectedFeedId) ? { ...a, isRead: true } : a))
  }, [selectedFeedId])

  // 设置菜单项
  const settingsMenuItems: Array<{ id: SettingsMenu; icon: typeof SunIcon; label: string }> = [
    { id: 'appearance', icon: SunIcon, label: t('settingsAppearance') },
    { id: 'reading', icon: MonitorIcon, label: t('settingsReading') },
    { id: 'update', icon: RefreshCwIcon, label: t('settingsUpdate') },
    { id: 'data', icon: DownloadIcon, label: t('settingsData') },
    { id: 'about', icon: MonitorIcon, label: t('settingsAbout') },
  ]

  // 导出文章
  const doExportArticles = useCallback((format: ExportFormat) => {
    exportArticles(articles, feeds, format)
  }, [articles, feeds])

  // 渲染
  return (
    <>
      <ThreeColumnLayout
        feeds={feeds}
        articles={sortedArticles}
        selectedFeedId={selectedFeedId}
        selectedArticle={selectedArticle}
        feedSearchQuery={feedSearchQuery}
        articleFilter={articleFilter}
        config={config || { theme: 'system', fontSize: 'medium', language: 'zh', articleSort: 'newest', showImages: true, autoMarkRead: true, fetchInterval: 30, maxArticlesPerFeed: 500, autoUpdate: true, keepDays: 30 }}
        stats={stats}
        feedUnreadCounts={feedUnreadCounts}
        sidebarCollapsed={sidebarCollapsed}
        viewMode={view}
        onSelectFeed={setSelectedFeedId}
        onSelectArticle={setSelectedArticle}
        onSearchFeeds={setFeedSearchQuery}
        onChangeFilter={setArticleFilter}
        onAddFeed={() => setAddDialogOpen(true)}
        onOpenSettings={menu => { setSettingsMenu(menu); setView('settings') }}
        onSwitchView={setView}
        onToggleStar={toggleStar}
        onMarkRead={markRead}
        onOpenExternal={openExternal}
        onMarkAllRead={markAllRead}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
      >
        {view === 'settings' && (
          <>
            {/* 设置页面：中间菜单 + 右侧内容 */}
            <div className="w-[320px] border-r h-full flex flex-col">
              <div className="shrink-0 p-4 border-b">
                <h2 className="font-semibold text-sm">{t('openSettings')}</h2>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-2 flex flex-col gap-1">
                    {settingsMenuItems.map(item => (
                      <Button
                        key={item.id}
                        variant={settingsMenu === item.id ? 'secondary' : 'ghost'}
                        className="justify-start"
                        onClick={() => setSettingsMenu(item.id)}
                      >
                        <item.icon data-icon="inline-start" />
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <div className="flex-1 h-full">
              {config && (
                <SettingsPanel
                  menu={settingsMenu}
                  config={config}
                  feedsCount={feeds.length}
                  articlesCount={articles.length}
                  stats={stats}
                  onThemeChange={setTheme}
                  onConfigUpdate={updateConfig}
                  onImportOpml={importOpml}
                  onExportOpml={exportOpml}
                  onExportArticles={doExportArticles}
                  onClearArticles={() => setClearDialogOpen(true)}
                />
              )}
            </div>
          </>
        )}
      </ThreeColumnLayout>

      {/* Dialogs */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addFeed')}</DialogTitle>
            <DialogDescription>{t('addFeedDesc')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Input
              placeholder={t('feedUrlPlaceholder')}
              value={feedUrl}
              onChange={e => { setFeedUrl(e.target.value); setFeedUrlError('') }}
            />
            {feedUrlError && <p className="text-sm text-destructive">{feedUrlError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddDialogOpen(false); setFeedUrl(''); setFeedUrlError('') }}>{t('cancel')}</Button>
            <Button onClick={addFeed} disabled={!feedUrl.trim() || adding}>
              {adding ? <LoaderIcon className="animate-spin" /> : <PlusIcon />}
              {t('add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clearArticles')}</AlertDialogTitle>
            <AlertDialogDescription>{t('clearArticlesDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={clearArticles}>{t('delete')}</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </>
  )
}

export default App