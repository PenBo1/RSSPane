// ========== 订阅源列表项组件 ==========

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RssIcon, MoreHorizontalIcon, PencilIcon, TrashIcon, FolderIcon, FolderInputIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import type { Feed } from '@/types/feed'

type Props = {
  feed: Feed
  unreadCount: number
  isSelected: boolean
  onSelect: () => void
  onEdit?: () => void
  onDelete?: () => void
  categories?: string[]
  onMoveToCategory?: (category: string | undefined) => void
  onNewCategory?: (feedId: string) => void
}

const getFaviconUrl = (siteUrl: string | undefined): string | undefined => {
  if (!siteUrl) return undefined
  try {
    return `${new URL(siteUrl).origin}/favicon.ico`
  } catch {
    return undefined
  }
}

export const FeedListItem = ({ feed, unreadCount, isSelected, onSelect, onEdit, onDelete, categories, onMoveToCategory, onNewCategory }: Props) => {
  const { t } = useI18n()
  const [menuOpen, setMenuOpen] = useState(false)
  const imageUrl = feed.imageUrl || getFaviconUrl(feed.siteUrl)
  const showActions = onEdit || onDelete

  return (
    <div
      className={cn(
        'group flex items-center gap-2 h-10 px-3 rounded-lg w-full',
        'transition-colors hover:bg-accent',
        isSelected && 'bg-accent font-medium'
      )}
    >
      <button className="flex items-center gap-2 flex-1 min-w-0 text-left" onClick={onSelect}>
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

      {showActions && (
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'size-6 shrink-0 flex items-center justify-center rounded hover:bg-accent-foreground/10',
              )}
              onClick={e => e.stopPropagation()}
            >
              <MoreHorizontalIcon className="size-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuGroup>
              {onMoveToCategory && categories && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FolderInputIcon data-icon="inline-start" />
                    {t('moveToGroup')}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {feed.category && (
                      <DropdownMenuItem onClick={() => onMoveToCategory(undefined)}>
                        {t('ungrouped')}
                      </DropdownMenuItem>
                    )}
                    {categories.filter(c => c !== feed.category).map(cat => (
                      <DropdownMenuItem key={cat} onClick={() => onMoveToCategory(cat)}>
                        <FolderIcon data-icon="inline-start" />
                        {cat}
                      </DropdownMenuItem>
                    ))}
                    {onNewCategory && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onNewCategory(feed.id)}>
                          <FolderIcon data-icon="inline-start" />
                          {t('newGroup')}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              <DropdownMenuSeparator />
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <PencilIcon data-icon="inline-start" />
                  {t('editFeed')}
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                  <TrashIcon data-icon="inline-start" />
                  {t('deleteFeed')}
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
