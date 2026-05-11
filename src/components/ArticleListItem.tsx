// ========== 文章列表项 ==========

import { Badge } from '@/components/ui/badge'
import { StarIcon } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { Article, Feed } from '@/types/feed'

type Props = {
  article: Article
  feed?: Feed
  onSelect: () => void
  onToggleStar: () => void
}

export const ArticleListItem = ({ article, feed, onSelect, onToggleStar }: Props) => {
  const { t } = useI18n()

  const feedTitle = feed?.title || t('unknownSource')
  const timeAgo = formatTimeAgo(article.pubDate)

  return (
    <div
      className={cn(
        'flex flex-col gap-1 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent',
        !article.isRead && 'bg-primary/5'
      )}
      onClick={onSelect}
    >
      {article.image && (
        <img
          src={article.image}
          alt={article.title}
          className="w-full h-24 object-cover rounded-md mb-2"
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
        <span className="truncate max-w-[120px]">{feedTitle}</span>
        <span className="text-muted-foreground/60">·</span>
        <span>{timeAgo}</span>
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