# RSSPane

[English](#english) | [中文](#中文)

---

## 中文

极简、快速的本地 RSS 阅读器浏览器扩展，支持 Chrome 和 Firefox。

### 特性

- **纯本地存储** - 基于 IndexedDB，无服务器依赖，隐私安全
- **三栏布局** - Options 页面：订阅源列表 | 文章列表 | 文章详情
- **侧边栏阅读** - Sidepanel 快速浏览，点击查看详情
- **完整内容抓取** - 解析 RSS/Atom/JSON Feed，提取完整 HTML 内容
- **OPML 支持** - 导入导出订阅列表，方便迁移
- **文章导出** - 支持 Markdown / HTML 格式导出
- **主题切换** - 浅色 / 深色 / 跟随系统
- **多语言** - 中文 / English
- **定时更新** - 后台自动刷新订阅源
- **收藏标记** - 星标文章，筛选已读/未读

### 安装

#### 从源码构建

```bash
# 安装依赖
pnpm install

# 构建 Chrome 扩展
pnpm build

# 构建 Firefox 扩展
pnpm build:firefox
```

#### 加载扩展

- **Chrome**: 访问 `chrome://extensions`，开启开发者模式，点击「加载已解压的扩展程序」，选择 `.output/chrome-mv3` 目录
- **Firefox**: 访问 `about:debugging#/runtime/this-firefox`，点击「临时载入附加组件」，选择 `.output/firefox-mv2/manifest.json`

### 开发

```bash
pnpm dev           # 开发模式（Chrome）
pnpm dev:firefox   # 开发模式（Firefox）
pnpm build         # 生产构建（Chrome）
pnpm build:firefox # 生产构建（Firefox）
pnpm compile       # TypeScript 类型检查
pnpm zip           # 打包 Chrome 扩展 zip
```

### 项目结构

```
src/
├── components/
│   ├── layouts/           # 页面布局组件
│   │   ├── ThreeColumnLayout.tsx  # Options 三栏布局
│   │   └── SidepanelLayout.tsx     # Sidepanel 布局
│   ├── ui/               # shadcn-ui 组件（禁止修改）
│   ├── ArticleDetailPanel.tsx     # 文章详情面板
│   ├── ArticleDetailView.tsx      # 文章详情视图
│   ├── ArticleListItem.tsx        # 文章列表项
│   ├── FeedListItem.tsx           # 订阅源列表项
│   └── SettingsPanel.tsx          # 设置面板
├── entrypoints/
│   ├── background.ts      # Service Worker（定时更新、右键菜单）
│   ├── options/           # 选项页入口
│   │   ├── main.tsx
│   │   └── App.tsx
│   └── sidepanel/         # 侧边栏入口
│       ├── main.tsx
│       └── App.tsx
├── lib/
│   ├── storage.ts         # IndexedDB + localStorage 统一存储层
│   ├── feed-parser.ts     # RSS/Atom/JSON Feed 解析
│   ├── opml.ts            # OPML 导入导出
│   ├── export.ts          # 文章导出（Markdown/HTML）
│   ├── i18n.ts            # 国际化工具
│   └── utils.ts           # 通用工具函数
├── types/
│   └── feed.ts            # 核心类型定义
└── hooks/
    └── use-mobile.ts      # 响应式 hooks
public/
├── icon/                  # 扩展图标（16-128px）
└── _locales/              # 多语言文件
    ├── zh/messages.json
    └── en/messages.json
```

### 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | [WXT](https://wxt.dev/) - 跨浏览器扩展框架 |
| UI | React 19 + TypeScript |
| 样式 | Tailwind CSS 4 + shadcn-ui |
| 存储 | IndexedDB (via [idb](https://github.com/jakearchibald/idb)) |
| 图标 | [Lucide](https://lucide.dev/) |

### 设置选项

| 分类 | 选项 | 说明 |
|------|------|------|
| 外观 | 主题、字体大小 | 支持三档字体大小 |
| 阅读 | 显示图片、自动已读、排序 | 新文章优先/旧文章优先 |
| 更新 | 自动更新、间隔、最大文章数 | 默认 15 分钟检查一次 |
| 数据 | OPML 导入导出、文章导出、清空数据 | 支持 Markdown/HTML 导出 |
| 关于 | 版本信息、统计数据 | 订阅源/文章数量统计 |

### 权限说明

| 权限 | 用途 |
|------|------|
| `sidePanel` | 在浏览器侧边栏显示阅读器 |
| `alarms` | 定时刷新订阅源 |
| `storage` | 存储用户配置 |
| `contextMenus` | 右键菜单添加订阅（计划中） |
| `<all_urls>` | 抓取任意网站的 RSS 源 |

### 数据模型

```typescript
// 订阅源
interface Feed {
  id: string
  url: string
  title: string
  description?: string
  siteUrl?: string
  imageUrl?: string
  lastFetched?: number
  updateInterval: number
  etag?: string           // HTTP 缓存
  lastModified?: string   // HTTP 缓存
  errorCount: number
  lastError?: string
  createdAt: number
}

// 文章
interface Article {
  id: string
  feedId: string
  title: string
  summary: string          // 纯文本摘要
  content?: string         // 完整 HTML 内容
  image?: string
  link: string
  pubDate: number
  guid: string
  isRead: boolean
  isStarred: boolean
  fetchTimestamp: number
}
```

### License

MIT

---

## English

A clean, fast local RSS reader browser extension supporting Chrome and Firefox.

### Features

- **Pure Local Storage** - IndexedDB-based, no server, privacy-focused
- **Three-Column Layout** - Options page: Feed list | Article list | Article detail
- **Sidebar Reading** - Sidepanel for quick browsing
- **Full Content Fetching** - Parse RSS/Atom/JSON Feed with full HTML content
- **OPML Support** - Import/export subscription lists
- **Article Export** - Markdown / HTML formats
- **Theme Switching** - Light / Dark / System
- **Multi-language** - 中文 / English
- **Auto Update** - Background scheduled refresh
- **Star & Filter** - Star articles, filter by read/unread status

### Installation

#### Build from Source

```bash
pnpm install
pnpm build        # Chrome
pnpm build:firefox  # Firefox
```

#### Load Extension

- **Chrome**: Go to `chrome://extensions`, enable Developer mode, click "Load unpacked", select `.output/chrome-mv3`
- **Firefox**: Go to `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on", select `.output/firefox-mv2/manifest.json`

### Development

```bash
pnpm dev           # Dev mode (Chrome)
pnpm dev:firefox   # Dev mode (Firefox)
pnpm build         # Production build
pnpm compile       # TypeScript check
```

### Tech Stack

- **Framework**: WXT (Cross-browser extension framework)
- **UI**: React 19 + TypeScript
- **Styling**: Tailwind CSS 4 + shadcn-ui
- **Storage**: IndexedDB (via idb)
- **Icons**: Lucide

### License

MIT