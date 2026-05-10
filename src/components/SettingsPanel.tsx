// ========== 设置面板组件 ==========

import { useState } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import {
  FieldGroup,
  Field,
  FieldTitle,
} from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  SunIcon,
  MoonIcon,
  MonitorIcon,
  UploadIcon,
  DownloadIcon,
  TrashIcon,
  RssIcon,
  BookOpenIcon,
  StarIcon,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import type { AppConfig, SettingsMenu, ExportFormat } from '@/types/feed'

type Props = {
  menu: SettingsMenu
  config: AppConfig
  feedsCount: number
  articlesCount: number
  stats: { feedsCount: number; articlesCount: number; unreadCount: number; starredCount: number }
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void
  onConfigUpdate: (updates: Partial<AppConfig>) => void
  onImportOpml: () => void
  onExportOpml: () => void
  onExportArticles: (format: ExportFormat) => void
  onClearArticles: () => void
}

export const SettingsPanel = ({
  menu,
  config,
  feedsCount,
  articlesCount,
  stats,
  onThemeChange,
  onConfigUpdate,
  onImportOpml,
  onExportOpml,
  onExportArticles,
  onClearArticles,
}: Props) => {
  const { t } = useI18n()
  const [exportFormat, setExportFormat] = useState<ExportFormat>('markdown')

  // 外观设置
  if (menu === 'appearance') {
    return (
      <ScrollArea className="h-full">
        <div className="p-6 flex flex-col gap-6">
          <Card size="sm">
            <CardHeader>
              <CardTitle>{t('theme')}</CardTitle>
              <CardDescription>{t('appDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={config.theme} onValueChange={v => v && onThemeChange(v as 'light' | 'dark' | 'system')}>
                <TabsList>
                  <TabsTrigger value="light">
                    <SunIcon data-icon="inline-start" />
                    {t('light')}
                  </TabsTrigger>
                  <TabsTrigger value="dark">
                    <MoonIcon data-icon="inline-start" />
                    {t('dark')}
                  </TabsTrigger>
                  <TabsTrigger value="system">
                    <MonitorIcon data-icon="inline-start" />
                    {t('system')}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>{t('fontSize')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={config.fontSize} onValueChange={v => v && onConfigUpdate({ fontSize: v as 'small' | 'medium' | 'large' })}>
                <TabsList>
                  <TabsTrigger value="small">{t('fontSizeSmall')}</TabsTrigger>
                  <TabsTrigger value="medium">{t('fontSizeMedium')}</TabsTrigger>
                  <TabsTrigger value="large">{t('fontSizeLarge')}</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    )
  }

  // 阅读设置
  if (menu === 'reading') {
    return (
      <ScrollArea className="h-full">
        <div className="p-6 flex flex-col gap-6">
          <Card size="sm">
            <CardHeader>
              <CardTitle>{t('settingsReading')}</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field orientation="horizontal">
                  <FieldTitle>{t('showImages')}</FieldTitle>
                  <Switch
                    checked={config.showImages}
                    onCheckedChange={v => onConfigUpdate({ showImages: v })}
                  />
                </Field>
                <Field orientation="horizontal">
                  <FieldTitle>{t('autoMarkRead')}</FieldTitle>
                  <Switch
                    checked={config.autoMarkRead}
                    onCheckedChange={v => onConfigUpdate({ autoMarkRead: v })}
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>{t('articleSort')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={config.articleSort} onValueChange={v => v && onConfigUpdate({ articleSort: v as 'newest' | 'oldest' })}>
                <TabsList>
                  <TabsTrigger value="newest">{t('sortNewest')}</TabsTrigger>
                  <TabsTrigger value="oldest">{t('sortOldest')}</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    )
  }

  // 更新设置
  if (menu === 'update') {
    return (
      <ScrollArea className="h-full">
        <div className="p-6 flex flex-col gap-6">
          <Card size="sm">
            <CardHeader>
              <CardTitle>{t('settingsUpdate')}</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field orientation="horizontal">
                  <FieldTitle>{t('autoUpdate')}</FieldTitle>
                  <Switch
                    checked={config.autoUpdate}
                    onCheckedChange={v => onConfigUpdate({ autoUpdate: v })}
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>{t('fetchInterval')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={String(config.fetchInterval)} onValueChange={v => v && onConfigUpdate({ fetchInterval: Number(v) })}>
                <TabsList>
                  <TabsTrigger value="15">15 {t('minutes')}</TabsTrigger>
                  <TabsTrigger value="30">30 {t('minutes')}</TabsTrigger>
                  <TabsTrigger value="60">60 {t('minutes')}</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>{t('maxArticles')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={String(config.maxArticlesPerFeed)} onValueChange={v => v && onConfigUpdate({ maxArticlesPerFeed: Number(v) })}>
                <TabsList>
                  <TabsTrigger value="100">100</TabsTrigger>
                  <TabsTrigger value="500">500</TabsTrigger>
                  <TabsTrigger value="1000">1000</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    )
  }

  // 数据设置
  if (menu === 'data') {
    return (
      <ScrollArea className="h-full">
        <div className="p-6 flex flex-col gap-6">
          <Card size="sm">
            <CardHeader>
              <CardTitle>{t('opmlTitle')}</CardTitle>
              <CardDescription>{t('opmlDesc')}</CardDescription>
            </CardHeader>
            <CardFooter>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onImportOpml}>
                  <UploadIcon data-icon="inline-start" />
                  {t('import')}
                </Button>
                <Button variant="outline" onClick={onExportOpml} disabled={feedsCount === 0}>
                  <DownloadIcon data-icon="inline-start" />
                  {t('export')}
                </Button>
              </div>
            </CardFooter>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>{t('exportArticles')}</CardTitle>
              <CardDescription>{t('exportArticlesDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <Badge variant="secondary">{articlesCount} {t('articlesCount')}</Badge>
                <Tabs value={exportFormat} onValueChange={v => v && setExportFormat(v as ExportFormat)}>
                  <TabsList>
                    <TabsTrigger value="markdown">{t('markdown')}</TabsTrigger>
                    <TabsTrigger value="html">{t('html')}</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                onClick={() => onExportArticles(exportFormat)}
                disabled={articlesCount === 0}
              >
                <DownloadIcon data-icon="inline-start" />
                {t('export')}
              </Button>
            </CardFooter>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>{t('clearArticles')}</CardTitle>
              <CardDescription>{t('clearArticlesDesc')}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="destructive" onClick={onClearArticles}>
                <TrashIcon data-icon="inline-start" />
                {t('delete')}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </ScrollArea>
    )
  }

  // 关于
  if (menu === 'about') {
    return (
      <ScrollArea className="h-full">
        <div className="p-6 flex flex-col gap-6">
          <Card size="sm">
            <CardHeader>
              <CardTitle>{t('appName')}</CardTitle>
              <CardDescription>{t('appDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50">
                  <RssIcon className="size-4 text-primary" />
                  <span className="text-sm text-muted-foreground">{t('feedsCount')}</span>
                  <Badge variant="secondary">{stats.feedsCount}</Badge>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50">
                  <BookOpenIcon className="size-4 text-primary" />
                  <span className="text-sm text-muted-foreground">{t('articlesCount')}</span>
                  <Badge variant="secondary">{stats.articlesCount}</Badge>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50">
                  <MonitorIcon className="size-4 text-primary" />
                  <span className="text-sm text-muted-foreground">{t('unread')}</span>
                  <Badge variant="secondary">{stats.unreadCount}</Badge>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50">
                  <StarIcon className="size-4 text-primary" />
                  <span className="text-sm text-muted-foreground">{t('filterStarred')}</span>
                  <Badge variant="secondary">{stats.starredCount}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    )
  }

  return null
}