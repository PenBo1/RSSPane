# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RSSPane is a local RSS reader browser extension built with WXT framework. It supports Chrome (MV3) and Firefox (MV2) with a clean three-column layout for the options page and a sidepanel for quick reading.

## Build Commands

```bash
pnpm dev           # Development mode with hot reload (Chrome)
pnpm dev:firefox   # Development mode (Firefox)
pnpm build         # Build for Chrome (outputs to .output/chrome-mv3)
pnpm build:firefox # Build for Firefox (outputs to .output/firefox-mv2)
pnpm compile       # TypeScript type check (no emit)
pnpm zip           # Create Chrome extension zip
pnpm zip:firefox   # Create Firefox extension zip
```

## Project Standards

### Code Quality
- **No `index.ts` export files** - Direct imports from specific files
- **No `any` types** - All types must be explicitly defined
- **Use modern syntax** - Arrow functions, const over let, optional chaining
- **Keep code concise** - Avoid over-engineering, no unnecessary abstractions
- **No verbose logs** - Minimize console output, no debug logs in production
- **Production-ready quality** - Follow industry standards for architecture and performance

### Naming Conventions
- **Files**: PascalCase for components, camelCase for utilities
- **Variables**: camelCase for locals, PascalCase for types/components
- **Constants**: UPPER_SNAKE_CASE for global constants, camelCase for local
- **Functions**: camelCase, descriptive names

### Component Design
- **Reusable components** - Extract shared UI patterns into components
- **Do NOT modify `src/components/ui/`** - shadcn-ui components are frozen
- **Layouts in `src/components/layouts/`** - Page-level layout components

### Storage Layer
- **Unified design** - localStorage + IndexedDB via `src/lib/storage.ts`
- **configRepo** - Cache in localStorage, persist to IndexedDB
- **generateId()** - Use this function for all IDs, no local generators

### Internationalization
- **Keys**: ASCII `[a-zA-Z0-9_]` only (no hyphens)
- **Location**: `public/_locales/{zh,en}/messages.json`
- **Default locale**: `zh`
- **Usage**: `useI18n()` hook or `t()` function
- **Adding new text**: Add to both zh and en locale files

## Architecture

### WXT Framework
Entry points in `src/entrypoints/`:
- `background.ts` - Service Worker for scheduled fetching, context menus
- `options/` - Options page (new tab, three-column layout)
- `sidepanel/` - Sidepanel (article list + article detail views)

### Data Layer
IndexedDB via `idb` library with repositories:
- `feedRepo` - CRUD for feeds (allFeeds, getById, create, update, delete)
- `articleRepo` - CRUD for articles (filters: unread, starred, by feed)
- `configRepo` - AppConfig with localStorage sync
- DB version: 3, migrations in `upgrade()` function in `storage.ts`

### Feed Parsing
`src/lib/feed-parser.ts` supports RSS 2.0, Atom, JSON Feed:
- `fetchFeed()` - Conditional requests with ETag/Last-Modified caching
- `createFeed()` / `createArticle()` - Factory functions
- `validateFeedUrl()` - URL validation before adding
- `content`: full HTML, `summary`: truncated plain text

### Types
All types in `src/types/feed.ts`:
- `Feed` - RSS subscription source
- `Article` - Feed article with read/starred status
- `AppConfig` - User preferences (theme, font size, update interval, etc.)
- `ArticleFilter` - 'all' | 'unread' | 'starred'
- `SettingsMenu` - Settings navigation items
- `ExportFormat` - 'markdown' | 'html'

## Key Patterns

### Config Management
- Config cached in localStorage for fast reads
- Persisted to IndexedDB for durability
- Use `configRepo.get()` and `configRepo.set()` for all config access

### Article Content
- `content` field = full HTML content
- `summary` field = plain text excerpt (truncated)
- Display `content` in article detail, `summary` in list preview

### Theme Handling
- Theme sync via `dark` class on `document.documentElement`
- Supported themes: 'light', 'dark', 'system'
- Uses `next-themes` for theme management

### Component Structure
```
src/entrypoints/
├── options/App.tsx      # Main options page, uses ThreeColumnLayout
└── sidepanel/App.tsx    # Sidepanel, uses SidepanelLayout

src/components/
├── layouts/
│   ├── ThreeColumnLayout.tsx  # Resizable panels for options
│   └── SidepanelLayout.tsx     # Compact layout for sidepanel
├── FeedListItem.tsx           # Feed list item with favicon, unread count
├── ArticleListItem.tsx        # Article item with read/star status
├── ArticleDetailPanel.tsx     # Article content viewer
├── ArticleDetailView.tsx      # Full article view with actions
└── SettingsPanel.tsx          # Settings navigation and forms
```

## Common Tasks

### Adding a new setting
1. Add type to `AppConfig` in `src/types/feed.ts`
2. Add default value in `configRepo.get()` defaults
3. Add i18n keys to both `public/_locales/zh/messages.json` and `en/messages.json`
4. Create form component in `SettingsPanel.tsx`

### Adding a new feed parser feature
1. Modify `src/lib/feed-parser.ts`
2. Handle edge cases for different feed formats
3. Ensure content extraction works for both RSS and Atom

### Debugging storage issues
- Check IndexedDB in DevTools → Application → IndexedDB
- Config also synced to localStorage for quick inspection
- Use `storage.ts` functions, never access IndexedDB directly

## Browser Compatibility

- Chrome MV3: Primary target, uses `chrome.sidePanel` API
- Firefox MV2: Uses `browser.sidebarAction` API (WXT handles compatibility)
- Always test both browsers when changing entry point code