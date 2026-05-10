// ========== 存储层 ==========

import { openDB, type IDBPDatabase } from 'idb'
import type { Feed, Article, AppConfig } from '@/types/feed'

const DB_NAME = 'rsspane'
const DB_VERSION = 3

type DBSchema = {
  feeds: Feed
  articles: Article
  config: { key: string; value: AppConfig }
}

const DEFAULT_CONFIG: AppConfig = {
  theme: 'system',
  fontSize: 'medium',
  language: 'zh',
  articleSort: 'newest',
  showImages: true,
  autoMarkRead: true,
  fetchInterval: 30,
  maxArticlesPerFeed: 500,
  autoUpdate: true,
  keepDays: 30,
}

const CONFIG_KEY = 'rsspane_config'

let db: IDBPDatabase<DBSchema> | null = null

const getDB = async (): IDBPDatabase<DBSchema> => {
  if (db) return db

  db = await openDB<DBSchema>(DB_NAME, DB_VERSION, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        const feedStore = database.createObjectStore('feeds', { keyPath: 'id' })
        feedStore.createIndex('url', 'url', { unique: true })
        feedStore.createIndex('createdAt', 'createdAt')

        const articleStore = database.createObjectStore('articles', { keyPath: 'id' })
        articleStore.createIndex('feedId', 'feedId')
        articleStore.createIndex('pubDate', 'pubDate')
        articleStore.createIndex('isRead', 'isRead')
        articleStore.createIndex('isStarred', 'isStarred')
        articleStore.createIndex('guid', 'guid', { unique: true })
        articleStore.createIndex('link', 'link')
      }

      if (oldVersion < 2) {
        database.createObjectStore('config', { keyPath: 'key' })
      }
    },
  })

  return db
}

// ========== Feed ==========

export const feedRepo = {
  getAll: async (): Feed[] => {
    const database = await getDB()
    return database.getAll('feeds')
  },

  getById: async (id: string): Feed | undefined => {
    const database = await getDB()
    return database.get('feeds', id)
  },

  getByUrl: async (url: string): Feed | undefined => {
    const database = await getDB()
    return database.getFromIndex('feeds', 'url', url)
  },

  add: async (feed: Feed): void => {
    const database = await getDB()
    await database.add('feeds', feed)
  },

  update: async (feed: Feed): void => {
    const database = await getDB()
    await database.put('feeds', feed)
  },

  delete: async (id: string): void => {
    const database = await getDB()
    const articles = await articleRepo.getByFeedId(id)
    const tx = database.transaction(['feeds', 'articles'], 'readwrite')
    await Promise.all([
      tx.objectStore('feeds').delete(id),
      ...articles.map(a => tx.objectStore('articles').delete(a.id)),
    ])
    await tx.done
  },
}

// ========== Article ==========

export const articleRepo = {
  getAll: async (limit = 500): Article[] => {
    const database = await getDB()
    const articles = await database.getAllFromIndex('articles', 'pubDate')
    return articles.reverse().slice(0, limit)
  },

  getByFeedId: async (feedId: string): Article[] => {
    const database = await getDB()
    return database.getAllFromIndex('articles', 'feedId', feedId)
  },

  getById: async (id: string): Article | undefined => {
    const database = await getDB()
    return database.get('articles', id)
  },

  getByGuid: async (guid: string): Article | undefined => {
    const database = await getDB()
    return database.getFromIndex('articles', 'guid', guid)
  },

  getUnread: async (): Article[] => {
    const database = await getDB()
    const articles = await database.getAllFromIndex('articles', 'isRead', false)
    return articles.sort((a, b) => b.pubDate - a.pubDate)
  },

  getStarred: async (): Article[] => {
    const database = await getDB()
    const articles = await database.getAllFromIndex('articles', 'isStarred', true)
    return articles.sort((a, b) => b.pubDate - a.pubDate)
  },

  add: async (article: Article): void => {
    const database = await getDB()
    await database.add('articles', article)
  },

  addBatch: async (articles: Article[]): void => {
    const database = await getDB()
    const tx = database.transaction('articles', 'readwrite')
    await Promise.all(articles.map(a => tx.store.add(a)))
    await tx.done
  },

  markRead: async (id: string): void => {
    const database = await getDB()
    const article = await database.get('articles', id)
    if (article) {
      article.isRead = true
      await database.put('articles', article)
    }
  },

  markAllRead: async (feedId?: string): void => {
    const database = await getDB()
    const articles = feedId
      ? await database.getAllFromIndex('articles', 'feedId', feedId)
      : await database.getAll('articles')

    const tx = database.transaction('articles', 'readwrite')
    await Promise.all(
      articles.filter(a => !a.isRead).map(a => {
        a.isRead = true
        return tx.store.put(a)
      })
    )
    await tx.done
  },

  toggleStar: async (id: string): Article | undefined => {
    const database = await getDB()
    const article = await database.get('articles', id)
    if (article) {
      article.isStarred = !article.isStarred
      await database.put('articles', article)
      return article
    }
  },

  cleanup: async (feedId: string, maxCount: number): void => {
    const database = await getDB()
    const articles = await database.getAllFromIndex('articles', 'feedId', feedId)
    articles.sort((a, b) => b.pubDate - a.pubDate)

    if (articles.length > maxCount) {
      const tx = database.transaction('articles', 'readwrite')
      await Promise.all(articles.slice(maxCount).map(a => tx.store.delete(a.id)))
      await tx.done
    }
  },

  clearAll: async (): void => {
    const database = await getDB()
    const tx = database.transaction('articles', 'readwrite')
    await tx.store.clear()
    await tx.done
  },
}

// ========== Config ==========

export const configRepo = {
  get: async (): AppConfig => {
    const stored = localStorage.getItem(CONFIG_KEY)
    if (stored) {
      try {
        return JSON.parse(stored) as AppConfig
      } catch {
        // fallback to default
      }
    }

    const database = await getDB()
    const config = await database.get('config', 'app')
    if (config) {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config.value))
      return config.value
    }

    await database.put('config', { key: 'app', value: DEFAULT_CONFIG })
    localStorage.setItem(CONFIG_KEY, JSON.stringify(DEFAULT_CONFIG))
    return DEFAULT_CONFIG
  },

  update: async (updates: Partial<AppConfig>): AppConfig => {
    const database = await getDB()
    const current = await configRepo.get()
    const newConfig = { ...current, ...updates }

    await database.put('config', { key: 'app', value: newConfig })
    localStorage.setItem(CONFIG_KEY, JSON.stringify(newConfig))

    return newConfig
  },
}

// ========== Stats ==========

export const getStats = async () => {
  const feeds = await feedRepo.getAll()
  const articles = await articleRepo.getAll(10000)

  return {
    feedsCount: feeds.length,
    articlesCount: articles.length,
    unreadCount: articles.filter(a => !a.isRead).length,
    starredCount: articles.filter(a => a.isStarred).length,
  }
}

// ========== Helpers ==========

export const generateId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`