// ========== 侧边栏布局 ==========

import { type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ArrowLeftIcon,
  RefreshCwIcon,
  SettingsIcon,
  FilterIcon,
  CheckIcon,
  LoaderIcon,
  SearchIcon,
  PlusIcon,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { ArticleFilter } from '@/types/feed'

type Props = {
  children: ReactNode
  filter: ArticleFilter
  searchQuery: string
  onFilterChange: (filter: ArticleFilter) => void
  onSearchChange: (query: string) => void
  onRefresh: () => void
  onAddFeed: () => void
  onOpenSettings: () => void
  onMarkAllRead: () => void
  refreshing: boolean
  showBack?: boolean
  onBack?: () => void
  title?: string
}

export const SidepanelLayout = ({
  children,
  filter,
  searchQuery,
  onFilterChange,
  onSearchChange,
  onRefresh,
  onAddFeed,
  onOpenSettings,
  onMarkAllRead,
  refreshing,
  showBack,
  onBack,
  title,
}: Props) => {
  const { t } = useI18n()

  const filters: Array<{ id: ArticleFilter; label: string }> = [
    { id: 'all', label: t('filterAll') },
    { id: 'unread', label: t('filterUnread') },
    { id: 'starred', label: t('filterStarred') },
  ]

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 flex items-center gap-2 p-2 border-b">
        {showBack && onBack ? (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeftIcon />
          </Button>
        ) : null}

        {showBack && title && (
          <h1 className="font-semibold text-sm truncate flex-1">{title}</h1>
        )}

        {!showBack && (
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1">
              <SearchIcon className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('searchArticles')}
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                className="pl-8 h-8"
              />
            </div>
            <Button variant="outline" size="icon" className="size-8" onClick={onAddFeed}>
              <PlusIcon className="size-4" />
            </Button>
          </div>
        )}

        <div className="flex items-center gap-1">
          {!showBack && (
            <>
              <Button variant="ghost" size="icon" className="size-8" onClick={onRefresh} disabled={refreshing}>
                {refreshing ? <LoaderIcon className="size-4 animate-spin" /> : <RefreshCwIcon className="size-4" />}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <FilterIcon className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    {filters.map(f => (
                      <DropdownMenuItem key={f.id} onClick={() => onFilterChange(f.id)}>
                        {filter === f.id && <CheckIcon />}
                        <span className={cn(filter === f.id && 'font-medium')}>{f.label}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onMarkAllRead}>
                    <CheckIcon />
                    {t('markAllRead')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          <Button variant="ghost" size="icon" className="size-8" onClick={onOpenSettings}>
            <SettingsIcon className="size-4" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-2">{children}</div>
        </ScrollArea>
      </div>
    </div>
  )
}