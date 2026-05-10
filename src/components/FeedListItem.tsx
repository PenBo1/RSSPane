// ========== 订阅源列表项组件（紧凑版） ==========

import { Badge } from '@/components/ui/badge'
import { RssIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Feed } from '@/types/feed'

type Props = {
  feed: Feed
  unreadCount: number
  isSelected: boolean
  onSelect: () => void
}

// 获取 favicon URL
const getFaviconUrl = (siteUrl: string | undefined): string | undefined => {
  if (!siteUrl) return undefined
  try {
    const origin = new URL(siteUrl).origin
    return `${origin}/favicon.ico`
  } catch {
    return undefined
  }
}

export const FeedListItem = ({ feed, unreadCount, isSelected, onSelect }: Props) => {
  // 图片源优先级: feed.imageUrl > favicon > RSS 图标
  const imageUrl = feed.imageUrl || getFaviconUrl(feed.siteUrl)

  return (
    <button
      className={cn(
        'flex items-center gap-2 h-10 px-3 rounded-lg w-full text-left',
        'transition-colors hover:bg-accent',
        isSelected && 'bg-accent font-medium'
      )}
      onClick={onSelect}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={feed.title}
          className="size-4 rounded shrink-0 object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            e.currentTarget.nextElementSibling?.classList.remove('hidden')
          }}
        />
      ) : null}
      <RssIcon className={cn('size-4 text-muted-foreground shrink-0', imageUrl && 'hidden')} />

      <span className="truncate flex-1 text-sm">{feed.title}</span>

      {unreadCount > 0 && (
        <Badge variant="secondary" className="text-xs shrink-0">
          {unreadCount}
        </Badge>
      )}
    </button>
  )
}