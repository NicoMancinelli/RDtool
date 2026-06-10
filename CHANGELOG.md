# Changelog

All notable changes to Real-Debrid Suite (RDtool) are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/). Versioning tracks the `@version` userscript metadata.

## [38.2] - 2026-06-10

### Added

- Batch queue progress in dashboard header and FAB badge (`Processing N/M...`)
- Cancel in-flight queue from dashboard header
- Page tab Queue button shows queued item count after click

### Changed

- Suppress per-magnet toasts while a batch queue is running

## [38.1] - 2026-06-10

### Added

- Host regex auto-update indicator in Settings account area (`Hosts: N supported` with last-updated time; subtle warning when API refresh fails)
- Export JSON button on Links tab — downloads `State.linkHistory` as formatted `rd-link-history.json`
- Customizable dashboard toggle keyboard shortcut in Settings (default `alt+r`; supports `alt`/`ctrl`/`shift`/`meta` + key)
- GreasyFork listing prep: `@license`, `@homepageURL`, `@supportURL` in userscript metadata
- `docs/GREASYFORK.md` with description, features, install steps, privacy note, and browser compatibility
- README GreasyFork section linking to listing docs

## [38.0] - 2026-06-10

### Added

- Deep Scan (iframes) toggle in Settings
- Pull-to-refresh on Torrents and Cloud tabs (mobile)
- Long-press context menu on Links history items (mobile)
- `.rd-btn-danger` / `.rd-btn-success` button variants
- `.rd-account-row` CSS for Settings layout
- Modular `src/` build with esbuild → `dist/real-debrid-suite.user.js`
- ESLint config and GitHub Actions CI
- Design system docs (`docs/DESIGN.md`) and manual test matrix (`docs/TESTING.md`)

### Changed

- Unified loading copy to "Loading…" across Cloud and Settings
- Dashboard desktop background uses `--rd-glass-tint` gradient
- Active press states use `--rd-bg-glass-active` on tabs and buttons
- Delete buttons use `.rd-input-btn.danger` instead of inline overrides

### Fixed

- Torrent file-picker modal: replaced undefined `Config.colors` with design-system classes
- Torrent modal: use `modal.close()` instead of nonexistent `UI.closeModal()`
- Session counter in header now updates (`rd-session-counter` id alignment)
- Torrent modal footer buttons moved to `showModal` footer API

## [37.1] - 2026-06-10

### Fixed

- Torrent manual file-selection modal styling and close behavior
- Header session processed counter not updating

## [37.0] - baseline

### Features

- Liquid Glass UI with FAB and five-tab dashboard (Links, Page, Torrents, Cloud, Settings)
- Page link/magnet scanner with inline icons and smart cache check
- Smart magnet actions (auto, video-only, all, manual selection)
- Link unrestricting, batch queue, M3U export, folder support
- Torrent management with live polling and progress
- Cloud download history with search, sort, bulk delete
- In-browser media player with PiP and external player deep links
- Mobile bottom sheet, swipe dismiss, safe-area FAB
- Settings import/export and offline cache fallback
