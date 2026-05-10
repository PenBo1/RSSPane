// ========== 国际化服务 ==========

// 获取UI语言
export const getUILang = (): string => {
  try {
    return browser.i18n.getUILanguage()
  } catch {
    return 'zh-CN'
  }
}

// 是否中文环境
export const isZh = (): boolean => getUILang().startsWith('zh')

// 获取本地化消息
export const t = (key: string, subs?: string | string[]): string => {
  try {
    const msg = browser.i18n.getMessage(key, subs)
    return msg || key
  } catch {
    return key
  }
}

// Hook形式
import { useCallback } from 'react'

export const useI18n = () => {
  const translate = useCallback((key: string, subs?: string | string[]): string => {
    return t(key, subs)
  }, [])

  return { t: translate, lang: getUILang(), isZh: isZh() }
}