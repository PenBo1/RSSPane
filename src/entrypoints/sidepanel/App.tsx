// ========== 侧边栏入口 ==========

import { useState, useEffect, useCallback, useMemo } from 'react'
import { SidepanelLayout } from '@/components/layouts/SidepanelLayout'
import { ArticleListItem } from '@/components/ArticleListItem'
import { ArticleDetailView } from '@/components/ArticleDetailView'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Toaster } from '@/components/ui/sonner'
import {
  PlusIcon,
  LoaderIcon,
  BookOpenIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '@/lib/i18n'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { getDefaultShortcuts } from '@/lib/shortcuts'
import { feedRepo, articleRepo, configRepo, getStats } from '@/lib/storage'
import { fetchFeed, createFeed, createArticle } from '@/lib/feed-parser'
import type { Feed, Article, ArticleFilter, AppConfig } from '@/types/feed'

const App = () => {
  const { t } = useI18n()

  // 数据
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [stats, setStats] = useState({ feedsCount: 0, articlesCount: 0, unreadCount: 0, starredCount: 0 })
  const [config, setConfig] = useState<AppConfig | null>(null)

  // 视图状态
  const [filter, setFilter] = useState<ArticleFilter>('all')
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [feedUrl, setFeedUrl] = useState('')
  const [feedUrlError, setFeedUrlError] = useState('')
  const [adding, setAdding] = useState(false)

  // 加载
  const load = useCallback(async () => {
    setFeeds(await feedRepo.getAll())
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

  // 过滤和排序文章
  const filteredArticles = useMemo(() => {
    const filtered = articles
      .filter(a => filter === 'unread' ? !a.isRead : filter === 'starred' ? a.isStarred : true)
      .filter(a => searchQuery ? a.title.toLowerCase().includes(searchQuery.toLowerCase()) : true)

    // 排序
    if (config?.articleSort === 'oldest') {
      filtered.sort((a, b) => a.pubDate - b.pubDate)
    } else {
      filtered.sort((a, b) => b.pubDate - a.pubDate)
    }
    return filtered
  }, [articles, filter, searchQuery, config?.articleSort])

  // 刷新
  const refresh = useCallback(async () => {
    setRefreshing(true)
    for (const feed of feeds) {
      try {
        const result = await fetchFeed(feed.url, feed.etag, feed.lastModified)
        if (result.status === 304) continue

        const existing = new Set(articles.filter(a => a.feedId === feed.id).map(a => a.guid))
        const newArticles = result.articles.map(p => createArticle(p, feed.id)).filter(a => !existing.has(a.guid))

        if (newArticles.length) await articleRepo.addBatch(newArticles)
        await feedRepo.update({ ...feed, lastFetched: Date.now(), etag: result.etag, lastModified: result.lastModified, errorCount: 0 })
      } catch (e) {
        await feedRepo.update({ ...feed, errorCount: feed.errorCount + 1, lastError: e instanceof Error ? e.message : 'Unknown' })
      }
    }
    await load()
    setRefreshing(false)
  }, [feeds, articles, load])

  // 添加
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

  // 操作
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
    setStats(prev => ({ ...prev, unreadCount: prev.unreadCount - 1 }))
  }, [selectedArticle])

  const openExternal = useCallback((article: Article) => window.open(article.link, '_blank'), [])

  const markAllRead = useCallback(async () => {
    await articleRepo.markAllRead()
    setArticles(prev => prev.map(a => ({ ...a, isRead: true })))
    setStats(prev => ({ ...prev, unreadCount: 0 }))
  }, [])

  const openSettings = useCallback(() => browser.runtime.openOptionsPage(), [])

  const selectArticle = useCallback((article: Article) => {
    setSelectedArticle(article)
    if (config?.autoMarkRead && !article.isRead) {
      markRead(article.id)
    }
  }, [config, markRead])

  // 键盘快捷键
  useKeyboardShortcuts(
    config?.shortcuts || getDefaultShortcuts(),
    {
      onNextArticle: () => {
        const currentIndex = filteredArticles.findIndex(a => a.id === selectedArticle?.id)
        const nextIndex = currentIndex < filteredArticles.length - 1 ? currentIndex + 1 : 0
        if (filteredArticles[nextIndex]) selectArticle(filteredArticles[nextIndex])
      },
      onPrevArticle: () => {
        const currentIndex = filteredArticles.findIndex(a => a.id === selectedArticle?.id)
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredArticles.length - 1
        if (filteredArticles[prevIndex]) selectArticle(filteredArticles[prevIndex])
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
      },
    }
  )

  // 文章详情视图
  if (selectedArticle) {
    return (
      <div className="h-screen">
        <ArticleDetailView
          article={selectedArticle}
          feed={feeds.find(f => f.id === selectedArticle.feedId)}
          onBack={() => setSelectedArticle(null)}
          onToggleStar={() => toggleStar(selectedArticle.id)}
          onMarkRead={() => markRead(selectedArticle.id)}
          onOpenExternal={() => openExternal(selectedArticle)}
        />
      </div>
    )
  }

  // 文章列表视图
  return (
    <>
      <SidepanelLayout
        filter={filter}
        searchQuery={searchQuery}
        onFilterChange={setFilter}
        onSearchChange={setSearchQuery}
        onRefresh={refresh}
        onAddFeed={() => setAddDialogOpen(true)}
        onOpenSettings={openSettings}
        onMarkAllRead={markAllRead}
        refreshing={refreshing}
      >
        {/* 文章列表 */}
        {filteredArticles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <BookOpenIcon className="size-6 mb-2" />
            <p className="text-sm">{t('noArticles')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredArticles.map(article => (
              <ArticleListItem
                key={article.id}
                article={article}
                feed={feeds.find(f => f.id === article.feedId)}
                onSelect={() => selectArticle(article)}
                onToggleStar={() => toggleStar(article.id)}
              />
            ))}
          </div>
        )}
      </SidepanelLayout>

      {/* Add Dialog */}
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

      <Toaster />
    </>
  )
}

export default App