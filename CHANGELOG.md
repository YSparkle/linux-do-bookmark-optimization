# Changelog

All notable changes to the Linux.do 收藏增强 extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive testing guide (TESTING.md)
- Development documentation (DEVELOPMENT.md)
- Automated memory management for codebase knowledge

## [0.2.0] - 2025-10-24

### Added
- **Modular Library Architecture** (`src/lib/`)
  - `types.js`: Message protocol constants, error codes, tag types, preset tags, default settings
  - `idb.js`: Complete IndexedDB abstraction layer with CRUD operations
  - `api.js`: HTTP request wrapper with retry logic, AI classification interface, Semaphore concurrency control
  - `classify.js`: Batch classification scheduler, tag management, post tag updates
  - `logger.js`: Unified logging utility

- **IndexedDB Implementation**
  - Four core stores: posts, classifies, tags, settings, index_meta
  - Multi-index support (by_fav, by_upd, by_author, by_tag)
  - Automatic version migration on upgrades

- **AI Classification Engine**
  - OpenAI-compatible API integration
  - Strict prompt engineering (select from candidate pool only)
  - JSON-only response parsing with code fence stripping
  - Exponential backoff retry (2^n + jitter, max 10s)
  - Manual tag locking (AI won't overwrite user edits)

- **Enhanced Options Page**
  - Advanced settings grid layout
  - AI concurrency control (1-10, default 2)
  - Fetch concurrency control (1-10, default 4)
  - Timeout configuration (5000-60000 ms, default 20000)
  - Retry limit (0-5, default 3)
  - Body character limit (1000-32000, default 8000)
  - Batch classification limit (10-500, default 100)
  - Preset tags toggle (enable/disable 25 tech tags)
  - Three action buttons: Save, Reset to Defaults, Clear All Data (danger)

- **Service Worker Refactor**
  - Message-driven architecture with unified `handleMessage()` entry point
  - Complete data coordination layer
  - IndexedDB initialization on install (auto-inject preset tags)
  - Settings management (GET_SETTINGS / SAVE_SETTINGS with defaults merge)
  - Tag management (LIST_TAGS / UPSERT_TAG / DELETE_TAG)
  - Classification scheduler (CLASSIFY_BATCH with progress callbacks)
  - Tag editing (UPDATE_POST_TAGS with auto-lock)
  - Import/Export (EXPORT_JSON / IMPORT_JSON with scope support)
  - Data cleanup (CLEAR_ALL_DATA)
  - Progress notifications to content script

- **Icons**
  - SVG icon with adaptive scaling (16/32/48/128px)
  - Blue gradient background with white bookmark symbol

### Changed
- Service Worker completely rewritten to use ES6 modules
- Options page upgraded with responsive grid layout and enhanced UI
- Manifest updated with icons configuration
- README expanded with comprehensive feature documentation

### Technical Improvements
- ES6 module system throughout (export/import, type: "module" in manifest)
- Promise-based async patterns (no callback hell)
- JSDoc type annotations for IDE intellisense
- Unified error handling with ERR.* constants
- Batch operations for performance (putMany vs putOne)
- Semaphore class for concurrency control

### Documentation
- Comprehensive DEVELOPMENT.md with architecture overview, module API reference, debugging tips
- Detailed TESTING.md with testing checklists and verification steps
- Updated README.md with full changelog and implementation details

## [0.1.0] - 2025-10-23

### Added
- Initial skeleton implementation
- Manifest V3 configuration for Edge/Chrome
- Service Worker with command handler (Ctrl/Cmd+K toggle)
- Content Script with macOS-style floating panel
- Basic bookmark fetching from linux.do (JSON API + DOM fallback)
- Options page for API configuration (Base URL, API Key, Model)
- Local caching with chrome.storage.local (5 min TTL)
- Basic tag filtering (AND logic) and title search
- Export/Import JSON functionality
- UI state persistence (search query, selected tags)
- Drag-and-drop panel repositioning
- Keyboard shortcuts (Ctrl/Cmd+K toggle, Esc close, / focus search)

### Features
- Automatic bookmark pagination fetching (up to 50 pages)
- JSON API with DOM fallback for resilience
- Duplicate filtering by href
- Chrome extension optional host permissions for AI domains
- Tag chip visualization with counts
- Real-time search and filter UI updates

### Documentation
- README.md with PRD, feature list, architecture overview
- Installation instructions
- Basic usage guide

---

## Release Notes

### v0.2.0 Highlights

This release transforms the skeleton into a production-ready foundation with:

1. **Complete modular architecture** - Clean separation of concerns with lib/* utilities
2. **IndexedDB persistence** - Robust data layer with indexes and migrations
3. **AI classification ready** - Full integration with OpenAI-compatible APIs
4. **Enhanced UX** - Advanced settings, progress indicators, better error handling
5. **Developer experience** - Comprehensive docs, testing guide, debugging tips

**Next Steps**:
- Integrate content script with new message protocol
- Implement virtual scrolling for 1000+ posts
- Add unit tests for lib/* modules
- Internationalization (i18n) support
- Publish to Edge Add-ons store

### v0.1.0 Highlights

First working prototype with:
- Basic UI injection and panel display
- Bookmark fetching and caching
- Simple tag filtering
- Export/Import functionality

**Known Limitations**:
- No AI classification yet
- No IndexedDB persistence
- Performance issues with large lists
- Limited error handling
