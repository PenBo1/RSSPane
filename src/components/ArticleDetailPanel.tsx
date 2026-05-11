// ========== 文章详情面板（嵌入式，用于三栏布局右侧） ==========

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  ExternalLinkIcon,
  StarIcon,
  CheckIcon,
  FileTextIcon,
  PanelRightIcon,
  PanelRightCloseIcon,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { Article, Feed } from '@/types/feed'

type Props = {
  article: Article | null
  feed?: Feed
  sidebarCollapsed: boolean
  onToggleStar: () => void
  onMarkRead: () => void
  onOpenExternal: () => void
  onToggleSidebar: () => void
}

export const ArticleDetailPanel = ({
  article,
  feed,
  sidebarCollapsed,
  onToggleStar,
  onMarkRead,
  onOpenExternal,
  onToggleSidebar,
}: Props) => {
  const { t } = useI18n()

  // 空状态
  if (!article) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-muted-foreground gap-2">
        <FileTextIcon className="size-8" />
        <p className="text-sm">{t('selectArticle')}</p>
      </div>
    )
  }

  const feedTitle = feed?.title || t('unknownSource')
  const pubDate = new Date(article.pubDate).toLocaleString()
  const isRead = article.isRead
  const hasContent = article.content && article.content.length > article.summary.length

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 flex items-center gap-2 p-3 border-b border-border">
        <span className="text-sm text-muted-foreground truncate">{feedTitle}</span>

        <div className="flex items-center gap-1 ml-auto">
          <Button variant="ghost" size="icon" onClick={onToggleSidebar}>
            {sidebarCollapsed ? (
              <PanelRightCloseIcon data-icon="inline-start" />
            ) : (
              <PanelRightIcon data-icon="inline-start" />
            )}
          </Button>

          <Button variant="ghost" size="icon" onClick={onToggleStar}>
            <StarIcon
              className={cn(article.isStarred ? 'fill-primary text-primary' : 'text-muted-foreground')}
              data-icon="inline-start"
            />
          </Button>

          {!isRead && (
            <Button variant="ghost" size="icon" onClick={onMarkRead}>
              <CheckIcon data-icon="inline-start" />
            </Button>
          )}

          <Button variant="ghost" size="icon" onClick={onOpenExternal}>
            <ExternalLinkIcon data-icon="inline-start" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4">
            {/* Title */}
            <h1 className="text-lg font-semibold leading-tight mb-3">{article.title}</h1>

            {/* Meta */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
              <span>{feedTitle}</span>
              <span className="text-muted-foreground/60">·</span>
              <span>{pubDate}</span>
              {!isRead && <Badge variant="secondary">{t('unread')}</Badge>}
              {article.isStarred && <Badge variant="outline"><StarIcon className="size-3 fill-primary text-primary" data-icon="inline-start" /></Badge>}
            </div>

            <Separator className="mb-4" />

            {/* Content */}
            {hasContent ? (
              <div
                className="prose prose-sm dark:prose-invert max-w-none article-content"
                dangerouslySetInnerHTML={{ __html: article.content! }}
              />
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{article.summary}</p>
              </div>
            )}

            {/* Open Original Link */}
            <div className="mt-6 pt-4 border-t border-border">
              <Button variant="outline" className="w-full" onClick={onOpenExternal}>
                <ExternalLinkIcon data-icon="inline-start" />
                {t('openOriginal')}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}