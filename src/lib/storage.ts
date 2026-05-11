// ========== 存储层 ==========

import { openDB, type IDBPDatabase } from 'idb'
import type { Feed, Article, AppConfig } from '@/types/feed'

const DB_NAME = 'rsspane'
const DB_VERSION = 4

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
  shortcuts: {},
}

const CONFIG_KEY = 'rsspane_config'

let db: IDBPDatabase<DBSchema> | null = null

const getDB = async (): Promise<IDBPDatabase<DBSchema>> => {
  if (db) return db

  db = await openDB<DBSchema>(DB_NAME, DB_VERSION, {
    upgrade(database, oldVersion, _newVersion, transaction) {
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

      // v4: add category index to feeds
      if (oldVersion < 4) {
        const feedStore = transaction.objectStore('feeds')
        if (!feedStore.indexNames.contains('category')) {
          feedStore.createIndex('category', 'category')
        }
      }
    },
  })

  return db
}

// ========== Feed ==========

export const feedRepo = {
  getAll: async (): Promise<Feed[]> => {
    const database = await getDB()
    return database.getAll('feeds')
  },

  getById: async (id: string): Promise<Feed | undefined> => {
    const database = await getDB()
    return database.get('feeds', id)
  },

  getByUrl: async (url: string): Promise<Feed | undefined> => {
    const database = await getDB()
    return database.getFromIndex('feeds', 'url', url)
  },

  add: async (feed: Feed): Promise<void> => {
    const database = await getDB()
    await database.add('feeds', feed)
  },

  update: async (feed: Feed): Promise<void> => {
    const database = await getDB()
    await database.put('feeds', feed)
  },

  delete: async (id: string): Promise<void> => {
    const database = await getDB()
    const articles = await articleRepo.getByFeedId(id)
    const tx = database.transaction(['feeds', 'articles'], 'readwrite')
    await Promise.all([
      tx.objectStore('feeds').delete(id),
      ...articles.map(a => tx.objectStore('articles').delete(a.id)),
    ])
    await tx.done
  },

  getCategories: async (): Promise<string[]> => {
    const feeds = await feedRepo.getAll()
    const cats = new Set(feeds.map(f => f.category).filter((c): c is string => !!c))
    return Array.from(cats).sort()
  },

  setCategory: async (feedId: string, category: string | undefined): Promise<void> => {
    const feed = await feedRepo.getById(feedId)
    if (feed) {
      await feedRepo.update({ ...feed, category })
    }
  },
}

// ========== Article ==========

export const articleRepo = {
  getAll: async (limit = 500): Promise<Article[]> => {
    const database = await getDB()
    const articles = await database.getAllFromIndex('articles', 'pubDate')
    return articles.reverse().slice(0, limit)
  },

  getByFeedId: async (feedId: string): Promise<Article[]> => {
    const database = await getDB()
    return database.getAllFromIndex('articles', 'feedId', feedId)
  },

  getById: async (id: string): Promise<Article | undefined> => {
    const database = await getDB()
    return database.get('articles', id)
  },

  getByGuid: async (guid: string): Promise<Article | undefined> => {
    const database = await getDB()
    return database.getFromIndex('articles', 'guid', guid)
  },

  getUnread: async (): Promise<Article[]> => {
    const database = await getDB()
    const all = await database.getAllFromIndex('articles', 'isRead')
    return all.filter(a => !a.isRead).sort((a, b) => b.pubDate - a.pubDate)
  },

  getStarred: async (): Promise<Article[]> => {
    const database = await getDB()
    const all = await database.getAllFromIndex('articles', 'isStarred')
    return all.filter(a => a.isStarred).sort((a, b) => b.pubDate - a.pubDate)
  },

  add: async (article: Article): Promise<void> => {
    const database = await getDB()
    await database.add('articles', article)
  },

  addBatch: async (articles: Article[]): Promise<void> => {
    const database = await getDB()
    const tx = database.transaction('articles', 'readwrite')
    await Promise.all(articles.map(a => tx.store.add(a)))
    await tx.done
  },

  markRead: async (id: string): Promise<void> => {
    const database = await getDB()
    const article = await database.get('articles', id)
    if (article) {
      article.isRead = true
      await database.put('articles', article)
    }
  },

  markAllRead: async (feedId?: string): Promise<void> => {
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

  toggleStar: async (id: string): Promise<Article | undefined> => {
    const database = await getDB()
    const article = await database.get('articles', id)
    if (article) {
      article.isStarred = !article.isStarred
      await database.put('articles', article)
      return article
    }
  },

  cleanup: async (feedId: string, maxCount: number): Promise<void> => {
    const database = await getDB()
    const articles = await database.getAllFromIndex('articles', 'feedId', feedId)
    articles.sort((a, b) => b.pubDate - a.pubDate)

    if (articles.length > maxCount) {
      const tx = database.transaction('articles', 'readwrite')
      await Promise.all(articles.slice(maxCount).map(a => tx.store.delete(a.id)))
      await tx.done
    }
  },

  clearAll: async (): Promise<void> => {
    const database = await getDB()
    const tx = database.transaction('articles', 'readwrite')
    await tx.store.clear()
    await tx.done
  },
}

// ========== Config ==========

export const configRepo = {
  get: async (): Promise<AppConfig> => {
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

  update: async (updates: Partial<AppConfig>): Promise<AppConfig> => {
    const database = await getDB()
    const current = await configRepo.get()
    const newConfig = { ...current, ...updates }

    await database.put('config', { key: 'app', value: newConfig })
    localStorage.setItem(CONFIG_KEY, JSON.stringify(newConfig))

    return newConfig
  },
}

// ========== Stats ==========

export const getStats = async (): Promise<{ feedsCount: number; articlesCount: number; unreadCount: number; starredCount: number }> => {
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