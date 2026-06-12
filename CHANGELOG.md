# Changelog

All notable changes to Real-Debrid Suite (RDtool) are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/). Versioning tracks the `@version` userscript metadata.

## [40.0] - 2026-06-10

### Added

- **v40 capstone** — complete torrent workflow, honest Page cache state, RD streaming playback, cloud scale, mobile parity
- Shared `TorrentPicker` modal — magnets, `.torrent` upload, and `waiting_files_selection` torrents
- Torrents **Add** panel — paste magnet, upload `.torrent`, Delete All
- **Play** from completed torrents (playlist with transcode fallback)
- Page tab **cache badges** (Cached / Uncached / Unknown / Host down) and batch host link checks
- **ListRenderer** — incremental list updates for Torrents, Cloud, and Links history (preserves scroll/selection on poll)
- Cloud **pagination** with Load More, rename, Delete All
- RD **streaming transcode** in media player with Transcode badge
- Header **quota chip** — premium days, daily quota %, active torrent count
- API v2 wrappers — streaming, hosts regex, pagination, bulk delete, traffic details
- Settings export **API key opt-in** (default off)
- Inline API key validation on setup (no reload on bad key)
- Mobile long-press on Page/Torrent/Cloud rows and inline link x-ray
- Vitest unit tests + CI `npm test`

### Changed

- Split monolithic `08-tabs.js` into `src/modules/tabs/*` with explicit build order
- `addMagnet` / torrent upload pass `host` from `/torrents/availableHosts`
- Optional API `/hosts/regex` for link detection (`useApiHostRegex` setting)
- `defaultAction: 'list'` now only adds to history (no download/copy)
- Settings migration via `migrateSettings()`

## [38.9] - 2026-06-10

### Added

- Torrent status filters — All | Active | Done | Errors
- **None** (deselect all) on Page, Torrents, and Cloud tabs
- Manual **Refresh** buttons on Torrents and Cloud tabs
- **Clear Session Caches** in Settings → Backup (unrestrict + x-ray caches)
- Page tab remembers collapsed domain groups per session
- Configurable API rate limit (2–8 req/s) and max links per scan pass

### Changed

- SPA navigation uses `popstate` / `history` hooks plus slower fallback poll (2s)
- Page tab refresh throttled (400ms) while scanning to reduce rebuild churn
- Scanner caps links processed per pass to avoid jank on huge pages

## [38.8] - 2026-06-10

### Added

- `UI.switchTab()` / `UI.openTab()` — lightweight tab switches without rebuilding the full dashboard
- Session unrestrict cache (toggleable) — skips repeat API calls for the same host link
- X-ray hover cache — avoids duplicate `/unrestrict/check` calls per URL
- Queue concurrency setting (1–8 workers)
- Cloud history limit setting (50–500 items)
- Invert selection on Torrents and Cloud tabs

### Changed

- Scanner uses debounced mutations only (300ms), skips scans when tab is hidden
- Selection tooltip debounced (150ms) to reduce work on text selection
- M3U generation uses parallel unrestrict (2 workers)
- Inline link / magnet actions use `openTab` instead of full `renderDashboard` rebuilds

## [38.7] - 2026-06-10

### Added

- Retry failed history items — per-item Retry button and Retry Errors batch action (stores `sourceUrl` on new failures)
- Invert selection button on Page tab
- Torrent Refresh Interval setting (3–30 seconds) in Settings; restarts polling when changed

## [38.6] - 2026-06-10

### Added

- FAB hover tooltip on desktop — shows `RD Suite (Alt+R)` using the configured toggle shortcut
- Remember Dashboard Open setting (default off) — persists dashboard open/closed state across page loads
- Copy URLs button on Page, Torrents, and Cloud tabs — copies newline-separated URLs from checked items only with count toast (Page: host URLs; Torrents: completed download links; Cloud: `item.download`)

### Changed

- Build reads `Config.VERSION` from `01-config.js` as single source of truth; syncs `@version` in userscript header and `package.json` on `npm run build`

## [38.5] - 2026-06-10

### Added

- Page tab Select Uncached button — checks only links not cached on RD (magnet inline icons)
- Switch to Torrents on Magnet setting (default off) — jumps to the Torrents tab after a magnet add succeeds
- Open Dashboard on Page Magnet setting (default off) — shows the dashboard when adding a magnet via the inline page icon
- Links tab history type filters — All | Success | Errors chip row filters history alongside search (session-persisted)
- Double-click on successful history row copies URL to clipboard with toast
- Notify on Queue Complete setting (default on) — `GM_notification` when batch queue finishes; optional chime when Notification Sound is enabled

## [38.4] - 2026-06-10

### Added

- Copy All URLs button on Links tab — copies all successful download URLs (newline-separated) with count toast
- Dedupe Link History setting (default on) — replaces older entries when the same download URL is added again
- `Config.VERSION` constant — dashboard header reads version from config instead of hardcoded string
- Remember Last Tab setting (default on) — restores the last active dashboard tab on open
- Links tab history search bar — filter by filename, URL, or error message (session-persisted)
- Paste button next to Unrestrict — reads clipboard into the input textarea
- Ctrl+Enter / Cmd+Enter in Links textarea triggers Unrestrict
- Keyboard shortcuts help — press `?` in dashboard or click `?` in header to open shortcuts modal

### Changed

- Clear history button now asks for confirmation before wiping link history

## [38.3] - 2026-06-10

### Added

- Import JSON button on Links tab — merges validated history entries from `rd-link-history.json` (cap 500)

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
