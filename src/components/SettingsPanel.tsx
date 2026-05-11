// ========== 设置面板组件 ==========

import { useState, useEffect, useCallback } from 'react'
import {
  FieldGroup,
  Field,
  FieldTitle,
  FieldSet,
  FieldLegend,
  FieldDescription,
} from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  SunIcon,
  MoonIcon,
  MonitorIcon,
  TrashIcon,
  RssIcon,
  BookOpenIcon,
  StarIcon,
  ExternalLinkIcon,
  InfoIcon,
} from 'lucide-react'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { IN_PAGE_SHORTCUTS, formatKeyForDisplay } from '@/lib/shortcuts'
import { useI18n } from '@/lib/i18n'
import type { AppConfig, SettingsMenu } from '@/types/feed'

type Props = {
  menu: SettingsMenu
  config: AppConfig
  stats: { feedsCount: number; articlesCount: number; unreadCount: number; starredCount: number }
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void
  onConfigUpdate: (updates: Partial<AppConfig>) => void
  onClearArticles: () => void
}

export const SettingsPanel = ({
  menu,
  config,
  stats,
  onThemeChange,
  onConfigUpdate,
  onClearArticles,
}: Props) => {
  const { t } = useI18n()

  // 快捷键自定义状态
  const [bindingShortcut, setBindingShortcut] = useState<string | null>(null)
  const handleKeyBind = useCallback((e: KeyboardEvent) => {
    if (!bindingShortcut) return
    e.preventDefault()
    const key = e.key === 'Escape' ? 'Escape' : e.key.length === 1 ? e.key.toLowerCase() : e.key
    onConfigUpdate({ shortcuts: { ...config.shortcuts, [bindingShortcut]: key } })
    setBindingShortcut(null)
  }, [bindingShortcut, config.shortcuts, onConfigUpdate])

  useEffect(() => {
    if (!bindingShortcut) return
    document.addEventListener('keydown', handleKeyBind)
    return () => document.removeEventListener('keydown', handleKeyBind)
  }, [bindingShortcut, handleKeyBind])

  // 外观
  if (menu === 'appearance') {
    return (
      <ScrollArea className="h-full">
        <div className="p-6 flex flex-col gap-0">
          <FieldSet>
            <FieldLegend>{t('settingsAppearance')}</FieldLegend>
            <FieldGroup>
              <Field orientation="horizontal">
                <FieldTitle>{t('theme')}</FieldTitle>
                <Tabs value={config.theme} onValueChange={v => v && onThemeChange(v as 'light' | 'dark' | 'system')}>
                  <TabsList>
                    <TabsTrigger value="light"><SunIcon data-icon="inline-start" />{t('light')}</TabsTrigger>
                    <TabsTrigger value="dark"><MoonIcon data-icon="inline-start" />{t('dark')}</TabsTrigger>
                    <TabsTrigger value="system"><MonitorIcon data-icon="inline-start" />{t('system')}</TabsTrigger>
                  </TabsList>
                </Tabs>
              </Field>
              <Separator />
              <Field orientation="horizontal">
                <FieldTitle>{t('fontSize')}</FieldTitle>
                <Tabs value={config.fontSize} onValueChange={v => v && onConfigUpdate({ fontSize: v as 'small' | 'medium' | 'large' })}>
                  <TabsList>
                    <TabsTrigger value="small">{t('fontSizeSmall')}</TabsTrigger>
                    <TabsTrigger value="medium">{t('fontSizeMedium')}</TabsTrigger>
                    <TabsTrigger value="large">{t('fontSizeLarge')}</TabsTrigger>
                  </TabsList>
                </Tabs>
              </Field>
            </FieldGroup>
          </FieldSet>
        </div>
      </ScrollArea>
    )
  }

  // 阅读
  if (menu === 'reading') {
    return (
      <ScrollArea className="h-full">
        <div className="p-6 flex flex-col gap-0">
          <FieldSet>
            <FieldLegend>{t('settingsReading')}</FieldLegend>
            <FieldGroup>
              <Field orientation="horizontal">
                <FieldTitle>{t('showImages')}</FieldTitle>
                <Switch checked={config.showImages} onCheckedChange={v => onConfigUpdate({ showImages: v })} />
              </Field>
              <Separator />
              <Field orientation="horizontal">
                <FieldTitle>{t('autoMarkRead')}</FieldTitle>
                <Switch checked={config.autoMarkRead} onCheckedChange={v => onConfigUpdate({ autoMarkRead: v })} />
              </Field>
              <Separator />
              <Field orientation="horizontal">
                <FieldTitle>{t('articleSort')}</FieldTitle>
                <Tabs value={config.articleSort} onValueChange={v => v && onConfigUpdate({ articleSort: v as 'newest' | 'oldest' })}>
                  <TabsList>
                    <TabsTrigger value="newest">{t('sortNewest')}</TabsTrigger>
                    <TabsTrigger value="oldest">{t('sortOldest')}</TabsTrigger>
                  </TabsList>
                </Tabs>
              </Field>
            </FieldGroup>
          </FieldSet>
        </div>
      </ScrollArea>
    )
  }

  // 更新
  if (menu === 'update') {
    return (
      <ScrollArea className="h-full">
        <div className="p-6 flex flex-col gap-0">
          <FieldSet>
            <FieldLegend>{t('settingsUpdate')}</FieldLegend>
            <FieldGroup>
              <Field orientation="horizontal">
                <FieldTitle>{t('autoUpdate')}</FieldTitle>
                <Switch checked={config.autoUpdate} onCheckedChange={v => onConfigUpdate({ autoUpdate: v })} />
              </Field>
              <Separator />
              <Field orientation="horizontal">
                <FieldTitle>{t('fetchInterval')}</FieldTitle>
                <Tabs value={String(config.fetchInterval)} onValueChange={v => v && onConfigUpdate({ fetchInterval: Number(v) })}>
                  <TabsList>
                    <TabsTrigger value="15">15 {t('minutes')}</TabsTrigger>
                    <TabsTrigger value="30">30 {t('minutes')}</TabsTrigger>
                    <TabsTrigger value="60">60 {t('minutes')}</TabsTrigger>
                  </TabsList>
                </Tabs>
              </Field>
              <Separator />
              <Field orientation="horizontal">
                <FieldTitle>{t('maxArticles')}</FieldTitle>
                <Tabs value={String(config.maxArticlesPerFeed)} onValueChange={v => v && onConfigUpdate({ maxArticlesPerFeed: Number(v) })}>
                  <TabsList>
                    <TabsTrigger value="100">100</TabsTrigger>
                    <TabsTrigger value="500">500</TabsTrigger>
                    <TabsTrigger value="1000">1000</TabsTrigger>
                  </TabsList>
                </Tabs>
              </Field>
              <Separator />
              <Field orientation="horizontal">
                <FieldTitle>{t('keepDays')}</FieldTitle>
                <Tabs value={String(config.keepDays)} onValueChange={v => v && onConfigUpdate({ keepDays: Number(v) })}>
                  <TabsList>
                    <TabsTrigger value="7">{t('keepDays7')}</TabsTrigger>
                    <TabsTrigger value="30">{t('keepDays30')}</TabsTrigger>
                    <TabsTrigger value="90">{t('keepDays90')}</TabsTrigger>
                    <TabsTrigger value="0">{t('keepDaysForever')}</TabsTrigger>
                  </TabsList>
                </Tabs>
              </Field>
            </FieldGroup>
          </FieldSet>
        </div>
      </ScrollArea>
    )
  }

  // 数据
  if (menu === 'data') {
    return (
      <ScrollArea className="h-full">
        <div className="p-6 flex flex-col gap-0">
          <FieldSet>
            <FieldLegend>{t('settingsData')}</FieldLegend>
            <FieldGroup>
              <Field orientation="horizontal">
                <FieldTitle>
                  {t('clearArticles')}
                  <FieldDescription>{t('clearArticlesDesc')}</FieldDescription>
                </FieldTitle>
                <Button variant="destructive" size="sm" onClick={onClearArticles}>
                  <TrashIcon data-icon="inline-start" />
                  {t('delete')}
                </Button>
              </Field>
            </FieldGroup>
          </FieldSet>
        </div>
      </ScrollArea>
    )
  }

  // 快捷键
  if (menu === 'shortcuts') {
    const categories = [
      { id: 'navigation' as const, label: t('shortcutCategoryNavigation') },
      { id: 'article' as const, label: t('shortcutCategoryArticle') },
      { id: 'feed' as const, label: t('shortcutCategoryFeed') },
    ]

    return (
      <ScrollArea className="h-full">
        <div className="p-6 flex flex-col gap-0">
          <FieldSet>
            <FieldLegend>{t('settingsShortcuts')}</FieldLegend>
            <FieldDescription>{bindingShortcut ? t('pressAnyKey') : t('clickToRebind')}</FieldDescription>
            {categories.map(cat => (
              <div key={cat.id} className="mt-4">
                <h4 className="text-xs font-medium text-muted-foreground mb-3">{cat.label}</h4>
                <FieldGroup>
                  {IN_PAGE_SHORTCUTS.filter(s => s.category === cat.id).map(shortcut => {
                    const currentKey = config.shortcuts[shortcut.id] || shortcut.defaultKey
                    const isBinding = bindingShortcut === shortcut.id
                    return (
                      <Field key={shortcut.id} orientation="horizontal">
                        <FieldTitle>{t(shortcut.label)}</FieldTitle>
                        <button
                          className="inline-flex items-center gap-1"
                          onClick={() => {
                            if (bindingShortcut === shortcut.id) {
                              setBindingShortcut(null)
                            } else {
                              setBindingShortcut(shortcut.id)
                            }
                          }}
                        >
                          {isBinding ? (
                            <Kbd className="animate-pulse bg-primary text-primary-foreground">
                              ...
                            </Kbd>
                          ) : (
                            <KbdGroup>
                              <Kbd>{formatKeyForDisplay(currentKey)}</Kbd>
                            </KbdGroup>
                          )}
                        </button>
                      </Field>
                    )
                  })}
                </FieldGroup>
              </div>
            ))}
          </FieldSet>
        </div>
      </ScrollArea>
    )
  }

  // 关于
  if (menu === 'about') {
    return (
      <ScrollArea className="h-full">
        <div className="p-6 flex flex-col gap-6">
          {/* 应用信息 */}
          <div className="flex items-center gap-4">
            <img src="/icon/96.png" alt="RSSPane" className="size-16 rounded-xl" />
            <div>
              <h2 className="text-lg font-bold">{t('appName')}</h2>
              <p className="text-sm text-muted-foreground">{t('version')} 1.0.0</p>
            </div>
          </div>

          <Separator />

          <p className="text-sm text-muted-foreground leading-relaxed">{t('appDesc')}</p>

          {/* 统计 */}
          <FieldSet>
            <FieldLegend>{t('aboutStats')}</FieldLegend>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <RssIcon className="size-4 text-primary" />
                <span className="text-sm text-muted-foreground">{t('feedsCount')}</span>
                <Badge variant="secondary" className="ml-auto">{stats.feedsCount}</Badge>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <BookOpenIcon className="size-4 text-primary" />
                <span className="text-sm text-muted-foreground">{t('articlesCount')}</span>
                <Badge variant="secondary" className="ml-auto">{stats.articlesCount}</Badge>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <MonitorIcon className="size-4 text-primary" />
                <span className="text-sm text-muted-foreground">{t('unread')}</span>
                <Badge variant="secondary" className="ml-auto">{stats.unreadCount}</Badge>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <StarIcon className="size-4 text-primary" />
                <span className="text-sm text-muted-foreground">{t('filterStarred')}</span>
                <Badge variant="secondary" className="ml-auto">{stats.starredCount}</Badge>
              </div>
            </div>
          </FieldSet>

          {/* 技术信息 */}
          <FieldSet>
            <FieldLegend>{t('aboutTech')}</FieldLegend>
            <FieldGroup>
              <Field orientation="horizontal">
                <FieldTitle>{t('aboutPlatform')}</FieldTitle>
                <span className="text-sm text-muted-foreground">Chrome MV3 / Firefox MV2</span>
              </Field>
              <Separator />
              <Field orientation="horizontal">
                <FieldTitle>{t('aboutStorage')}</FieldTitle>
                <span className="text-sm text-muted-foreground">IndexedDB + localStorage</span>
              </Field>
              <Separator />
              <Field orientation="horizontal">
                <FieldTitle>{t('aboutFormats')}</FieldTitle>
                <span className="text-sm text-muted-foreground">RSS 2.0, Atom, JSON Feed</span>
              </Field>
            </FieldGroup>
          </FieldSet>

          {/* 链接 */}
          <FieldSet>
            <FieldLegend>{t('aboutLinks')}</FieldLegend>
            <FieldGroup>
              <Field orientation="horizontal">
                <FieldTitle>
                  <InfoIcon data-icon="inline-start" />
                  {t('aboutSource')}
                </FieldTitle>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://github.com/PenBo1/RSSPane" target="_blank" rel="noopener noreferrer">
                    GitHub
                    <ExternalLinkIcon data-icon="inline-end" />
                  </a>
                </Button>
              </Field>
            </FieldGroup>
          </FieldSet>
        </div>
      </ScrollArea>
    )
  }

  return null
}
