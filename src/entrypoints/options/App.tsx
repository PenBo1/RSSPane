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
  RefreshCwIcon,
  KeyboardIcon,
  BookOpenIcon,
  InfoIcon,
  DatabaseIcon,
} from 'lucide-react'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { getDefaultShortcuts } from '@/lib/shortcuts'
import { useI18n } from '@/lib/i18n'
import { feedRepo, articleRepo, configRepo } from '@/lib/storage'
import { fetchFeed, createFeed, createArticle } from '@/lib/feed-parser'
import type { Feed, Article, AppConfig, ArticleFilter, SettingsMenu } from '@/types/feed'

const App = () => {
  const { t } = useI18n()

  // 数据
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [config, setConfig] = useState<AppConfig | null>(null)

  // 统计数据（从 articles 派生，保证一致性）
  const stats = useMemo(() => ({
    feedsCount: feeds.length,
    articlesCount: articles.length,
    unreadCount: articles.filter(a => !a.isRead).length,
    starredCount: articles.filter(a => a.isStarred).length,
  }), [feeds, articles])

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
  const [deleteFeedTarget, setDeleteFeedTarget] = useState<Feed | null>(null)
  const [editFeedTarget, setEditFeedTarget] = useState<Feed | null>(null)
  const [editFeedTitle, setEditFeedTitle] = useState('')
  const [editFeedUrl, setEditFeedUrl] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [newCategoryDialogOpen, setNewCategoryDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryFeedId, setNewCategoryFeedId] = useState<string | null>(null)

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
    setCategories(await feedRepo.getCategories())
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

  // 清空文章
  const clearArticles = useCallback(async () => {
    await articleRepo.clearAll()
    setClearDialogOpen(false)
    await load()
  }, [load])

  // 删除订阅源
  const deleteFeed = useCallback(async () => {
    if (!deleteFeedTarget) return
    await feedRepo.delete(deleteFeedTarget.id)
    setDeleteFeedTarget(null)
    if (selectedFeedId === deleteFeedTarget.id) {
      setSelectedFeedId(null)
      setSelectedArticle(null)
    }
    await load()
  }, [deleteFeedTarget, selectedFeedId, load])

  // 编辑订阅源
  const openEditFeed = useCallback((feed: Feed) => {
    setEditFeedTarget(feed)
    setEditFeedTitle(feed.title)
    setEditFeedUrl(feed.url)
  }, [])

  const saveEditFeed = useCallback(async () => {
    if (!editFeedTarget || !editFeedTitle.trim()) return
    await feedRepo.update({ ...editFeedTarget, title: editFeedTitle.trim(), url: editFeedUrl.trim() })
    setEditFeedTarget(null)
    await load()
  }, [editFeedTarget, editFeedTitle, editFeedUrl, load])

  // 移动到分组
  const moveToCategory = useCallback(async (feedId: string, category: string | undefined) => {
    await feedRepo.setCategory(feedId, category)
    await load()
  }, [load])

  // 新建分组并移动
  const createCategoryAndMove = useCallback(async () => {
    if (!newCategoryName.trim() || !newCategoryFeedId) return
    await feedRepo.setCategory(newCategoryFeedId, newCategoryName.trim())
    setNewCategoryDialogOpen(false)
    setNewCategoryName('')
    setNewCategoryFeedId(null)
    await load()
  }, [newCategoryName, newCategoryFeedId, load])

  const openNewCategoryDialog = useCallback((feedId: string) => {
    setNewCategoryFeedId(feedId)
    setNewCategoryName('')
    setNewCategoryDialogOpen(true)
  }, [])

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

  // 键盘快捷键
  useKeyboardShortcuts(
    config?.shortcuts || getDefaultShortcuts(),
    {
      onNextArticle: () => {
        if (view !== 'reader') return
        const currentIndex = sortedArticles.findIndex(a => a.id === selectedArticle?.id)
        const nextIndex = currentIndex < sortedArticles.length - 1 ? currentIndex + 1 : 0
        if (sortedArticles[nextIndex]) setSelectedArticle(sortedArticles[nextIndex])
      },
      onPrevArticle: () => {
        if (view !== 'reader') return
        const currentIndex = sortedArticles.findIndex(a => a.id === selectedArticle?.id)
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : sortedArticles.length - 1
        if (sortedArticles[prevIndex]) setSelectedArticle(sortedArticles[prevIndex])
      },
      onOpenArticle: () => {
        if (selectedArticle) openExternal(selectedArticle)
      },
      onToggleStar: () => {
        if (selectedArticle) toggleStar(selectedArticle.id)
      },
      onToggleRead: () => {
        if (selectedArticle) markRead(selectedArticle.id)
      },
      onRefreshFeeds: refresh,
      onFocusSearch: () => {
        const input = document.querySelector<HTMLInputElement>('input[placeholder]')
        input?.focus()
      },
      onGoBack: () => {
        if (selectedArticle) setSelectedArticle(null)
        else if (view === 'settings') setView('reader')
      },
    }
  )

  const markAllRead = useCallback(async () => {
    await articleRepo.markAllRead(selectedFeedId ?? undefined)
    setArticles(prev => prev.map(a => (selectedFeedId === null || a.feedId === selectedFeedId) ? { ...a, isRead: true } : a))
  }, [selectedFeedId])

  // 设置菜单项
  const settingsMenuItems: Array<{ id: SettingsMenu; icon: typeof SunIcon; label: string }> = [
    { id: 'appearance', icon: SunIcon, label: t('settingsAppearance') },
    { id: 'reading', icon: BookOpenIcon, label: t('settingsReading') },
    { id: 'update', icon: RefreshCwIcon, label: t('settingsUpdate') },
    { id: 'data', icon: DatabaseIcon, label: t('settingsData') },
    { id: 'shortcuts', icon: KeyboardIcon, label: t('settingsShortcuts') },
    { id: 'about', icon: InfoIcon, label: t('settingsAbout') },
  ]

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
        config={config || { theme: 'system', fontSize: 'medium', language: 'zh', articleSort: 'newest', showImages: true, autoMarkRead: true, fetchInterval: 30, maxArticlesPerFeed: 500, autoUpdate: true, keepDays: 30, shortcuts: {} }}
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
        onEditFeed={openEditFeed}
        onDeleteFeed={feed => setDeleteFeedTarget(feed)}
        categories={categories}
        onMoveToCategory={moveToCategory}
        onNewCategory={openNewCategoryDialog}
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
                  stats={stats}
                  onThemeChange={setTheme}
                  onConfigUpdate={updateConfig}
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

      {/* 删除订阅源确认 */}
      <AlertDialog open={!!deleteFeedTarget} onOpenChange={open => { if (!open) setDeleteFeedTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteFeed')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteFeedDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={deleteFeed}>{t('delete')}</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* 编辑订阅源 */}
      <Dialog open={!!editFeedTarget} onOpenChange={open => { if (!open) setEditFeedTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editFeed')}</DialogTitle>
            <DialogDescription>{t('editFeedDesc')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Input
              placeholder={t('feedTitle')}
              value={editFeedTitle}
              onChange={e => setEditFeedTitle(e.target.value)}
            />
            <Input
              placeholder={t('feedUrlPlaceholder')}
              value={editFeedUrl}
              onChange={e => setEditFeedUrl(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFeedTarget(null)}>{t('cancel')}</Button>
            <Button onClick={saveEditFeed} disabled={!editFeedTitle.trim()}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新建分组 */}
      <Dialog open={newCategoryDialogOpen} onOpenChange={setNewCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('newGroup')}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder={t('groupName')}
            value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createCategoryAndMove()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCategoryDialogOpen(false)}>{t('cancel')}</Button>
            <Button onClick={createCategoryAndMove} disabled={!newCategoryName.trim()}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </>
  )
}

export default App