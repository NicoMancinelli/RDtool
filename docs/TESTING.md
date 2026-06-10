# RDtool Manual Test Matrix

RDtool is a Tampermonkey userscript — automated unit tests are limited. Run this checklist before each release.

## Setup

- [ ] Tampermonkey or Violentmonkey installed
- [ ] Script installed from `dist/real-debrid-suite.user.js`
- [ ] Valid Real-Debrid API key entered on first run
- [ ] Test on at least one desktop browser (Chrome/Firefox) and one mobile viewport

## API Key & Auth

- [ ] First-run setup card appears without API key
- [ ] Invalid key shows error toast
- [ ] Valid key saves and FAB appears
- [ ] Settings → Log Out clears key and reloads to setup

## Links Tab

- [ ] Paste a supported host link → Unrestrict → appears in history
- [ ] History item shows filename, size, time
- [ ] DL / URL / Play buttons work on success items
- [ ] Clear empties history
- [ ] Export produces plain text / curl / wget format
- [ ] Drag-and-drop link onto dashboard processes it
- [ ] Session counter in header increments on success

## Page Tab

- [ ] Visit a page with supported host links — inline ⚡ icons appear
- [ ] Tab badge shows scan count
- [ ] Links grouped by domain; groups collapse/expand
- [ ] Select All + DL Selected works
- [ ] Queue adds items to processing
- [ ] 1-Click on individual link unrestricts

## Magnets & Torrent Modal (critical path)

- [ ] Paste magnet with `manual` magnet action in Settings
- [ ] File picker modal opens with styled buttons (Select All, Cancel, Start Download)
- [ ] Cancel closes modal and deletes pending torrent
- [ ] Start Download with files selected begins torrent
- [ ] Modal closes without console errors (`UI.closeModal` must not be called)

## Torrents Tab

- [ ] Active torrents list with progress bars
- [ ] Speed and ETA shown while downloading
- [ ] Completed torrents show DL / M3U / All badges
- [ ] Delete selected torrents works
- [ ] Clean Dead removes error/dead torrents
- [ ] Search filters list
- [ ] Pull-to-refresh on mobile reloads list

## Cloud Tab

- [ ] Loading state shows "Loading…"
- [ ] Cloud history syncs from API
- [ ] Search and sort (newest/oldest/largest/smallest) work
- [ ] Delete selected removes cloud items
- [ ] Offline fallback shows cached data with toast
- [ ] Pull-to-refresh on mobile reloads cloud

## Settings Tab

- [ ] Account info loads (username, plan, quotas)
- [ ] All toggles persist after reload (including Deep Scan)
- [ ] Dropdowns persist (magnet action, player, export format)
- [ ] Export/Import settings round-trip
- [ ] Deep Scan toggle enables iframe link scanning

## Media Player

- [ ] Play on video/audio opens in-browser player
- [ ] PiP button works (where supported)
- [ ] Fullscreen toggle works
- [ ] Escape closes player
- [ ] External player options (VLC, IINA, Infuse) open correct URL scheme

## Mobile

- [ ] FAB uses safe-area inset
- [ ] Dashboard opens as bottom sheet with grab handle
- [ ] Swipe down dismisses sheet
- [ ] Long-press history item shows Copy URL / Download menu

## Keyboard

- [ ] `Alt+R` toggles dashboard
- [ ] `Escape` closes modal, then player, then dashboard

## Regression Checks (v37.1 / v38.0)

- [ ] Torrent file-picker modal uses `rd-input-btn` styling (no `undefined` borders)
- [ ] Header session counter updates live (element id `rd-session-counter`)
