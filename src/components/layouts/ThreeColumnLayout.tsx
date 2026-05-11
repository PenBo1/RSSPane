// ========== 三栏布局 ==========

import { type ReactNode, useMemo, useState } from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SettingsIcon,
  SearchIcon,
  BookOpenIcon,
  CheckIcon,
  FilterIcon,
  StarIcon,
  PanelRightIcon,
  PanelRightCloseIcon,
  PlusIcon,
  ChevronRightIcon,
  FolderIcon,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FeedListItem } from '@/components/FeedListItem'
import { ArticleDetailPanel } from '@/components/ArticleDetailPanel'
import type { Feed, Article, ArticleFilter, AppConfig, SettingsMenu } from '@/types/feed'

type Props = {
  feeds: Feed[]
  articles: Article[]
  selectedFeedId: string | null
  selectedArticle: Article | null
  feedSearchQuery: string
  articleFilter: ArticleFilter
  config: AppConfig
  stats: { feedsCount: number; articlesCount: number; unreadCount: number; starredCount: number }
  feedUnreadCounts: Record<string, number>
  sidebarCollapsed: boolean
  viewMode: 'reader' | 'settings'
  onSelectFeed: (feedId: string | null) => void
  onSelectArticle: (article: Article | null) => void
  onSearchFeeds: (query: string) => void
  onChangeFilter: (filter: ArticleFilter) => void
  onAddFeed: () => void
  onOpenSettings: (menu: SettingsMenu) => void
  onSwitchView: (view: 'reader' | 'settings') => void
  onToggleStar: (articleId: string) => void
  onMarkRead: (articleId: string) => void
  onOpenExternal: (article: Article) => void
  onMarkAllRead: () => void
  onToggleSidebar: () => void
  onEditFeed?: (feed: Feed) => void
  onDeleteFeed?: (feed: Feed) => void
  categories?: string[]
  onMoveToCategory?: (feedId: string, category: string | undefined) => void
  onNewCategory?: (feedId: string) => void
  children?: ReactNode
}

export const ThreeColumnLayout = ({
  feeds,
  articles,
  selectedFeedId,
  selectedArticle,
  feedSearchQuery,
  articleFilter,
  stats,
  feedUnreadCounts,
  sidebarCollapsed,
  viewMode,
  onSelectFeed,
  onSelectArticle,
  onSearchFeeds,
  onChangeFilter,
  onAddFeed,
  onOpenSettings,
  onSwitchView,
  onToggleStar,
  onMarkRead,
  onOpenExternal,
  onMarkAllRead,
  onToggleSidebar,
  onEditFeed,
  onDeleteFeed,
  categories,
  onMoveToCategory,
  onNewCategory,
  children,
}: Props) => {
  const { t } = useI18n()

  const filteredFeeds = feeds.filter(f =>
    f.title.toLowerCase().includes(feedSearchQuery.toLowerCase())
  )

  // 按分组归类订阅源
  const groupedFeeds = useMemo(() => {
    const groups = new Map<string, Feed[]>()
    const ungrouped: Feed[] = []
    for (const feed of filteredFeeds) {
      if (feed.category) {
        const list = groups.get(feed.category) || []
        list.push(feed)
        groups.set(feed.category, list)
      } else {
        ungrouped.push(feed)
      }
    }
    return { groups, ungrouped }
  }, [filteredFeeds])

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const toggleGroup = (name: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  const filteredArticles = articles
    .filter(a => selectedFeedId === null || a.feedId === selectedFeedId)
    .filter(a => articleFilter === 'unread' ? !a.isRead : articleFilter === 'starred' ? a.isStarred : true)

  const articleListTitle = selectedFeedId ? feeds.find(f => f.id === selectedFeedId)?.title || t('allFeeds') : t('allFeeds')

  const filters: Array<{ id: ArticleFilter; label: string }> = [
    { id: 'all', label: t('filterAll') },
    { id: 'unread', label: t('filterUnread') },
    { id: 'starred', label: t('filterStarred') },
  ]

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      {/* 左侧：订阅源 */}
      <Sidebar className={cn("w-[240px] border-r", sidebarCollapsed && "hidden")} collapsible="none">
        <SidebarHeader className="border-b p-3">
          <div className="flex items-center gap-2 mb-2">
            <img src="/icon/32.png" alt="RSSPane" className="size-6" />
            <span className="font-bold text-base">{t('appName')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <SearchIcon className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('searchFeeds')}
                value={feedSearchQuery}
                onChange={e => onSearchFeeds(e.target.value)}
                className="pl-8 h-8"
              />
            </div>
            <Button variant="outline" size="icon" className="size-8" onClick={onAddFeed}>
              <PlusIcon className="size-4" />
            </Button>
          </div>
        </SidebarHeader>

        <SidebarContent className="overflow-hidden p-2">
          <ScrollArea className="h-full">
            <FeedListItem
              feed={{ id: 'all', title: t('allFeeds'), url: '', updateInterval: 0, errorCount: 0, createdAt: 0 }}
              unreadCount={stats.unreadCount}
              isSelected={selectedFeedId === null}
              onSelect={() => {
                onSwitchView('reader')
                onSelectFeed(null)
              }}
            />
            <Separator className="my-2" />

            {/* 分组订阅源 */}
            {Array.from(groupedFeeds.groups.entries()).map(([category, categoryFeeds]) => {
              const groupUnread = categoryFeeds.reduce((sum, f) => sum + (feedUnreadCounts[f.id] || 0), 0)
              const isCollapsed = collapsedGroups.has(category)
              return (
                <Collapsible key={category} open={!isCollapsed} onOpenChange={() => toggleGroup(category)}>
                  <div className="flex items-center gap-1 px-2 py-1.5">
                    <CollapsibleTrigger asChild>
                      <button className="flex items-center gap-1 flex-1 min-w-0 text-left hover:text-foreground transition-colors">
                        <ChevronRightIcon className={cn('size-3 text-muted-foreground transition-transform', !isCollapsed && 'rotate-90')} />
                        <FolderIcon className="size-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground truncate">{category}</span>
                        {groupUnread > 0 && (
                          <Badge variant="secondary" className="text-[10px] ml-auto">{groupUnread}</Badge>
                        )}
                      </button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    {categoryFeeds.map(feed => (
                      <FeedListItem
                        key={feed.id}
                        feed={feed}
                        unreadCount={feedUnreadCounts[feed.id] || 0}
                        isSelected={selectedFeedId === feed.id}
                        onSelect={() => {
                          onSwitchView('reader')
                          onSelectFeed(feed.id)
                        }}
                        onEdit={onEditFeed ? () => onEditFeed(feed) : undefined}
                        onDelete={onDeleteFeed ? () => onDeleteFeed(feed) : undefined}
                        categories={categories}
                        onMoveToCategory={onMoveToCategory ? (cat) => onMoveToCategory(feed.id, cat) : undefined}
                        onNewCategory={onNewCategory}
                      />
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )
            })}

            {/* 未分组订阅源 */}
            {groupedFeeds.ungrouped.map(feed => (
              <FeedListItem
                key={feed.id}
                feed={feed}
                unreadCount={feedUnreadCounts[feed.id] || 0}
                isSelected={selectedFeedId === feed.id}
                onSelect={() => {
                  onSwitchView('reader')
                  onSelectFeed(feed.id)
                }}
                onEdit={onEditFeed ? () => onEditFeed(feed) : undefined}
                onDelete={onDeleteFeed ? () => onDeleteFeed(feed) : undefined}
                categories={categories}
                onMoveToCategory={onMoveToCategory ? (cat) => onMoveToCategory(feed.id, cat) : undefined}
                onNewCategory={onNewCategory}
              />
            ))}
          </ScrollArea>
        </SidebarContent>

        <SidebarFooter className="border-t p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={viewMode === 'settings'}
                onClick={() => onOpenSettings('appearance')}
              >
                <SettingsIcon data-icon="inline-start" />
                {t('openSettings')}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* 中间 + 右侧 */}
      <SidebarInset className="h-full flex-row">
        {children || (
          <>
            {/* 中间：文章列表 */}
            <div className={cn("w-[320px] border-r h-full flex flex-col", sidebarCollapsed && "hidden")}>
              <header className="shrink-0 p-3 border-b">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold text-sm truncate">{articleListTitle}</h2>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary">{filteredArticles.length}</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7">
                          <FilterIcon className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                          {filters.map(f => (
                            <DropdownMenuItem key={f.id} onClick={() => onChangeFilter(f.id)}>
                              {articleFilter === f.id && <CheckIcon data-icon="inline-start" />}
                              <span className={cn(articleFilter === f.id && 'font-medium')}>{f.label}</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onMarkAllRead}>
                          <CheckIcon data-icon="inline-start" />
                          {t('markAllRead')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <BookOpenIcon className="size-3" />
                  <span>{stats.feedsCount} {t('feedsCount')}</span>
                  <span>·</span>
                  <span>{stats.articlesCount} {t('articlesCount')}</span>
                </div>
              </header>

              <div className="flex-1 min-h-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-2 flex flex-col gap-2">
                    {filteredArticles.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <BookOpenIcon className="size-6 mb-2" />
                        <p className="text-sm">{t('noArticles')}</p>
                      </div>
                    ) : (
                      filteredArticles.map(article => (
                        <ArticleCardItem
                          key={article.id}
                          article={article}
                          feed={feeds.find(f => f.id === article.feedId)}
                          isSelected={selectedArticle?.id === article.id}
                          onSelect={() => onSelectArticle(article)}
                          onToggleStar={() => onToggleStar(article.id)}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* 右侧：文章详情 */}
            <div className="flex-1 h-full">
              <ArticleDetailPanel
                article={selectedArticle}
                feed={feeds.find(f => f.id === selectedArticle?.feedId)}
                sidebarCollapsed={sidebarCollapsed}
                onToggleStar={() => selectedArticle && onToggleStar(selectedArticle.id)}
                onMarkRead={() => selectedArticle && onMarkRead(selectedArticle.id)}
                onOpenExternal={() => selectedArticle && onOpenExternal(selectedArticle)}
                onToggleSidebar={onToggleSidebar}
              />
            </div>
          </>
        )}
      </SidebarInset>
    </SidebarProvider>
  )
}

// 文章卡片项
const ArticleCardItem = ({
  article,
  feed,
  isSelected,
  onSelect,
  onToggleStar,
}: {
  article: Article
  feed?: Feed
  isSelected: boolean
  onSelect: () => void
  onToggleStar: () => void
}) => {
  const { t } = useI18n()

  return (
    <div
      className={cn(
        'flex flex-col gap-1 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent',
        isSelected && 'bg-accent border-primary/30',
        !article.isRead && 'bg-primary/5'
      )}
      onClick={onSelect}
    >
      {article.image && (
        <img
          src={article.image}
          alt={article.title}
          className="w-full h-32 object-cover rounded-md mb-2"
          onError={(e) => e.currentTarget.style.display = 'none'}
        />
      )}
      <div className="flex items-start gap-2">
        <h3 className={cn('text-sm flex-1 truncate', !article.isRead && 'font-semibold')}>
          {article.title}
        </h3>
        <StarIcon
          className={cn('size-4 shrink-0 cursor-pointer', article.isStarred ? 'fill-primary text-primary' : 'text-muted-foreground')}
          onClick={e => { e.stopPropagation(); onToggleStar() }}
        />
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="truncate max-w-[100px]">{feed?.title || t('unknownSource')}</span>
        <span>·</span>
        <span>{formatTimeAgo(article.pubDate)}</span>
        {!article.isRead && <Badge variant="secondary" className="text-xs">{t('unread')}</Badge>}
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2">{article.summary}</p>
    </div>
  )
}

const formatTimeAgo = (timestamp: number): string => {
  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 60) return `${mins}m`
  if (hrs < 24) return `${hrs}h`
  if (days < 7) return `${days}d`
  return new Date(timestamp).toLocaleDateString()
}