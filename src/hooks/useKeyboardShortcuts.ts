// ========== 键盘快捷键 Hook ==========

import { useEffect, useRef } from 'react'
import type { ShortcutConfig } from '@/types/feed'
import { IN_PAGE_SHORTCUTS } from '@/lib/shortcuts'

type ShortcutCallbacks = {
  onNextArticle?: () => void
  onPrevArticle?: () => void
  onOpenArticle?: () => void
  onToggleStar?: () => void
  onToggleRead?: () => void
  onRefreshFeeds?: () => void
  onFocusSearch?: () => void
  onGoBack?: () => void
}

export const useKeyboardShortcuts = (
  shortcuts: ShortcutConfig,
  callbacks: ShortcutCallbacks
) => {
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        if (e.key !== 'Escape') return
      }

      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key

      const callbackMap: Record<string, (() => void) | undefined> = {
        nextArticle: callbacksRef.current.onNextArticle,
        prevArticle: callbacksRef.current.onPrevArticle,
        openArticle: callbacksRef.current.onOpenArticle,
        toggleStar: callbacksRef.current.onToggleStar,
        toggleRead: callbacksRef.current.onToggleRead,
        refreshFeeds: callbacksRef.current.onRefreshFeeds,
        focusSearch: callbacksRef.current.onFocusSearch,
        goBack: callbacksRef.current.onGoBack,
      }

      for (const def of IN_PAGE_SHORTCUTS) {
        const configuredKey = shortcuts[def.id] || def.defaultKey
        const matchKey = configuredKey.length === 1 ? configuredKey.toLowerCase() : configuredKey
        if (key === matchKey) {
          const callback = callbackMap[def.id]
          if (callback) {
            e.preventDefault()
            callback()
            return
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}
