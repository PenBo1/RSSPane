// ========== 文章详情视图（侧边栏专用） ==========

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeftIcon,
  ExternalLinkIcon,
  StarIcon,
  CheckIcon,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { Article, Feed } from '@/types/feed'

type Props = {
  article: Article
  feed?: Feed
  onBack: () => void
  onToggleStar: () => void
  onMarkRead: () => void
  onOpenExternal: () => void
}

export const ArticleDetailView = ({
  article,
  feed,
  onBack,
  onToggleStar,
  onMarkRead,
  onOpenExternal,
}: Props) => {
  const { t } = useI18n()

  const feedTitle = feed?.title || t('unknownSource')
  const pubDate = new Date(article.pubDate).toLocaleString()
  const hasContent = article.content && article.content.length > article.summary.length

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 flex items-center gap-2 p-3 border-b">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeftIcon />
        </Button>

        <span className="text-sm text-muted-foreground truncate">{feedTitle}</span>

        <div className="flex items-center gap-1 ml-auto">
          <Button variant="ghost" size="icon" onClick={onToggleStar}>
            <StarIcon className={cn(article.isStarred ? 'fill-primary text-primary' : 'text-muted-foreground')} />
          </Button>

          {!article.isRead && (
            <Button variant="ghost" size="icon" onClick={onMarkRead}>
              <CheckIcon />
            </Button>
          )}

          <Button variant="ghost" size="icon" onClick={onOpenExternal}>
            <ExternalLinkIcon />
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
              {!article.isRead && <Badge variant="secondary">{t('unread')}</Badge>}
              {article.isStarred && (
                <Badge variant="outline">
                  <StarIcon className="size-3 fill-primary text-primary" />
                </Badge>
              )}
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

            {/* Open Original */}
            <div className="mt-6 pt-4 border-t">
              <Button variant="outline" className="w-full" onClick={onOpenExternal}>
                <ExternalLinkIcon />
                {t('openOriginal')}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}