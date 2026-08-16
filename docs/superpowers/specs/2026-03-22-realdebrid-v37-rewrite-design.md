# Real-Debrid Suite v37 — Full Rewrite Design Spec

## Overview

Complete rewrite of the Real-Debrid Suite Tampermonkey userscript (v36 → v37). Restores 8 missing core functions, modernizes architecture, adopts macOS Tahoe liquid glass dark aesthetic, adds mobile bottom sheet UX, and introduces new features (parallel queues, subtitle support, playlist mode, .torrent upload, offline caching).

## Userscript Header

```js
// ==UserScript==
// @name         Real-Debrid Suite (v37)
// @namespace    http://tampermonkey.net/
// @version      37.0
// @description  The ultimate RD tool. Liquid Glass UI, Cloud Management, Smart Magnets, PiP Media Player, Mobile Support.
// @author       Neek
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @grant        GM_notification
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      real-debrid.com
// @run-at       document-end
// ==/UserScript==
```

Notes:
- `@match *://*/*` matches all pages (same as v36). Required for the page scanner to work globally.
- `@run-at document-end` — scanner starts after DOM is ready.
- No additional grants needed for new features (Web Audio API, File API, Screen Orientation API are all available without grants).

## Architecture

Single `.js` file (Tampermonkey requirement) with 9 internal modules inside an IIFE:

```
(function() {
    'use strict';

    const Config = { ... };   // API key, settings, host lists, constants
    const State = { ... };    // All mutable state centralized
    const API = { ... };      // Promise-based RD API calls
    const DOM = { ... };      // Safe element creation helpers (no innerHTML)
    const UI = { ... };       // Shell: FAB, dashboard frame, tabs, toasts, modals
    const Tabs = {            // One object per tab
        Links: { ... },
        Page: { ... },
        Torrents: { ... },
        Cloud: { ... },
        Settings: { ... }
    };
    const Scanner = { ... };  // Page link detection, icon injection, cache checking
    const Media = { ... };    // Windowed player, PiP, fullscreen, drag, playlists
    const Init = { ... };     // Boot sequence, event listeners, hotkeys

    Init.start();
})();
```

### Key architectural decisions

- **Promise-based API** — all `API` methods return Promises that resolve to `{ ok, data, error }`. Consumer functions use `async/await` and unwrap: `const { ok, data } = await API.post(...)`. No callback nesting.
- **DOM helper** — `DOM.create(tag, attrs, children)` builds elements via `document.createElement` + `textContent`. No `innerHTML` with user data. Prevents XSS.
- **Centralized state** — `State` object holds all mutable data. Single source of truth.
- **Self-contained tabs** — each tab has `render()` (full rebuild) and `refresh()` (update data in-place, preserving scroll position and input values). Adding a tab means adding one object.
- **Event delegation** — single click/input/change listener on the dashboard container routes to the active tab's handlers.

### Data migration (v36 → v37)

v37 reads the same `GM_setValue` keys as v36:
- `rd_api_key` — API key (string)
- `rd_link_history` — JSON array of history items
- `rd_settings` — JSON object of settings
- `rd_dynamic_hosts` — JSON array of host domains

On first load, v37 validates and migrates:
- Unknown settings keys are stripped
- Missing settings keys get defaults from `Config.defaultSettings`
- History items are validated for required shape; malformed entries removed
- No data loss — v36 data works as-is, just gets validated

## Config Module

### Constants

```js
Config.BASE_HOSTS = [
    '1fichier\\.com\\/\\?[a-z0-9]{10,10}',
    'rapidgator\\.net\\/file\\/[a-z0-9]{32,32}',
    'mega\\.nz\\/(file|folder|#F?!)',
    'mediafire\\.com\\/(file|folder)\\/[a-z0-9]{15,15}',
    'drive\\.google\\.com\\/(file|drive|folders)\\/.+',
    'youtube\\.com\\/watch\\?v\\=[a-zA-Z0-9]{11,11}',
    'turbobit\\.net\\/[a-z0-9]{12,12}',
    'uploaded\\.net\\/file\\/[a-z0-9]{8,8}',
    'zippyshare\\.com\\/v\\/[a-zA-Z0-9]{8,8}\\/file',
    'k2s\\.cc\\/file\\/', 'keep2share\\.cc\\/file\\/',
    'nitroflare\\.com\\/view\\/[A-Z0-9]{15,15}',
    'pixeldrain\\.com\\/u\\/[a-zA-Z0-9]+',
    'ddownload\\.com\\/[a-zA-Z0-9]+',
    'katfile\\.com\\/[a-zA-Z0-9]+',
    'gofile\\.io\\/d\\/[a-zA-Z0-9]+',
    'qiwi\\.gg\\/file\\/[a-zA-Z0-9\\-]+'
];
```

### Settings schema

```js
Config.defaultSettings = {
    hijack: false,           // Intercept clicks on host links
    autoShow: true,          // Show FAB when links detected
    magnetAction: 'smart',   // 'smart' | 'video' | 'all' | 'manual'
    filterExts: 'nfo, txt, url, jpg, png, md, srt',  // Extensions to exclude in smart filter
    smartFilter: false,      // Enable extension-based filtering on magnets
    autoCleanup: false,      // Auto-delete dead/error torrents
    defaultAction: 'dl',     // 'dl' | 'copy' | 'list'
    extPlayer: 'browser',    // 'browser' | 'vlc' | 'iina' | 'infuse'
    customHosts: '',         // Comma-separated custom host patterns
    exportFormat: 'raw',     // 'raw' | 'curl' | 'wget'
    notificationSound: false // Chime on torrent completion
};
```

### Key management

- `Config.getKey()` — reads from `GM_getValue('rd_api_key')`, falls back to `localStorage('rd_api_key_backup')`
- `Config.saveKey(key)` — writes to both stores, updates `State.apiKey`
- `Config.clearKey()` — clears both stores, resets `State.apiKey`
- `Config.getActiveRegex()` — builds regex from `BASE_HOSTS` + dynamic hosts from API + custom hosts from settings

## State Module

```js
const State = {
    apiKey: '',
    settings: {},
    currentTab: 'links',
    isExpanded: false,
    isMobile: false,

    // Data
    linkHistory: [],         // Persisted — array of { type, name, url, download, size, msg, time }
    cachedTorrents: [],      // From /torrents API
    cachedCloud: [],         // From /downloads API
    scannedLinksMap: new Map(), // url → { type: 'magnet'|'host', text }
    dynamicHosts: [],        // From /hosts/domains API
    liveHosts: {},           // From /hosts/status API
    userProfile: null,       // From /user API
    trafficData: null,       // From /traffic API

    // Transient
    processedUrls: new Set(),       // Dedup within session
    completedTorrentsMemory: new Set(), // Track notified completions
    isFirstTorrentFetch: true,
    torrentRefreshInterval: null,
    magnetCacheQueue: [],    // Batched cache check queue
    cacheCheckTimer: null,

    // Session
    sessionStats: { processed: 0 },

    // Offline queue
    offlineQueue: []         // { action, endpoint, data } — replayed on reconnect
};
```

## API Module

### Core method

```js
API.request(method, endpoint, data) → Promise<{ ok, data, error }>
```

- Uses `GM_xmlhttpRequest` to call `https://api.real-debrid.com/rest/1.0{endpoint}`
- POST data is `application/x-www-form-urlencoded`
- Auth via `Authorization: Bearer {apiKey}` header
- Returns `{ ok: true, data }` on 2xx, `{ ok: false, error: string }` on failure

### Error handling

- `401/403` → clear key, show setup screen, toast "API Key Expired"
- `429` → auto-retry after `Retry-After` header value (or 5s default)
- `503` → retry once with 2s backoff
- Other `5xx` → toast with user-friendly message
- Network error → toast "Connection failed"

### Rate limiting

- Max 4 requests/second, excess queued with FIFO ordering

### Convenience methods

- `API.get(endpoint)` → `API.request('GET', ...)`
- `API.post(endpoint, data)` → `API.request('POST', ...)`
- `API.del(endpoint)` → `API.request('DELETE', ...)`
- `API.upload(endpoint, file)` → multipart form upload via `GM_xmlhttpRequest` (for .torrent files)

## Visual Design — macOS Tahoe Liquid Glass (Dark)

### Color tokens

```css
--rd-bg-base: #0a0a0a;
--rd-bg-glass: rgba(255, 255, 255, 0.08);
--rd-bg-glass-hover: rgba(255, 255, 255, 0.12);
--rd-bg-glass-active: rgba(255, 255, 255, 0.06);
--rd-glass-tint: rgba(120, 160, 255, 0.04);
--rd-glass-blur: blur(40px) saturate(180%);
--rd-glass-border: rgba(255, 255, 255, 0.1);
--rd-glass-highlight: inset 0 0.5px 0 rgba(255, 255, 255, 0.12);
--rd-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
--rd-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.2);

--rd-text-primary: #f0f0f0;
--rd-text-secondary: rgba(255, 255, 255, 0.45);
--rd-accent: #6eb1ff;
--rd-success: #81c995;
--rd-danger: #f28b82;
--rd-warning: #fdd663;

--rd-radius-lg: 14px;
--rd-radius-md: 10px;
--rd-radius-sm: 8px;
--rd-radius-xs: 6px;
```

### Surface treatment

- All elevated surfaces: `background: var(--rd-bg-glass)` + `backdrop-filter: var(--rd-glass-blur)` + blue tint overlay
- Borders: `border: 1px solid var(--rd-glass-border)` + `box-shadow: var(--rd-glass-highlight)` for the glass edge light catch
- Shadows: soft diffused (`var(--rd-shadow)`), depth through layered translucency

### Dimensions

- Dashboard (desktop): `400px` wide, `max-height: 580px`
- FAB (desktop): `46px` glass circle with soft glow ring on hover
- FAB (mobile): `52px` glass circle, positioned above safe area inset
- Cards: `10px` padding, `6px` gaps
- Base font: `12px`, secondary: `11px` at `0.45` opacity, weight `500` for labels

### Tabs

Segmented control style — pill-shaped highlight slides between tab labels (no underline indicator). Active tab gets a filled glass pill background.

### Animations

- `0.2s ease-out` transitions
- Gentle scale on hover (`transform: scale(1.02)`)
- Smooth opacity fades
- No bounce/spring easing on desktop

### Empty states

Each tab has a distinct empty state:
- **Links**: "No history. Paste links below or drag & drop." with faded icon
- **Page**: "No supported links detected on this page."
- **Torrents**: "No active torrents."
- **Cloud**: "Cloud history empty."
- **Settings** (no API key): Setup screen with API key input and "Get Token Here" link

## Existing Core Functions (carried from v36)

### `addMagnet(magnet, callback?)`

Sends a magnet link to RD and handles file selection based on `settings.magnetAction`:

1. `POST /torrents/addMagnet` with `{ magnet }`
2. Based on `magnetAction` setting:
   - **`'manual'`** — `GET /torrents/info/{id}` → open `showTorrentSelectorModal()` with file list
   - **`'video'`** — `GET /torrents/info/{id}` → find largest video file (`.mp4|.mkv|.avi|.mov|.webm`) → `POST /torrents/selectFiles/{id}` with that file. Falls back to manual modal if no video found.
   - **`'smart'`** — `GET /torrents/info/{id}` → if `smartFilter` enabled, exclude files matching `filterExts` extensions → `POST /torrents/selectFiles/{id}`. Otherwise select all.
   - **`'all'`** — `POST /torrents/selectFiles/{id}` with `files: 'all'`
3. On success: `addToHistory()`, toast, refresh torrent list if active, call `callback()` if provided

### `showTorrentSelectorModal(torrentId, files, title, callback?)`

Modal for manual file selection within a torrent:
- Full file list with checkboxes, showing folder paths (parsed from `/path/to/file`) and file sizes
- "Select All" / "Select None" buttons
- "Start Download" button → `POST /torrents/selectFiles/{id}` with selected file IDs
- "Cancel" button → removes modal, no action
- Folder paths displayed as dimmed prefix, filename bold

### `generateM3U(name, links[])`

Generates and downloads an M3U playlist file:
- Unrestricts each link sequentially via `API.post('/unrestrict/link', ...)`
- Builds M3U content: `#EXTM3U` header, `#EXTINF:-1,{filename}` + URL per track
- Creates Blob, triggers download as `{name}.m3u`
- Toast on completion

### `decodeBase64Heuristic(text)`

Scans text for Base64-encoded strings (30+ chars matching `[A-Za-z0-9+/]+=*`), attempts `atob()`, replaces with decoded content if it looks like a URL or magnet.

### `getStreamUrl(url)`

Maps URL to external player URL scheme:
- `'vlc'` → `vlc://{url}`
- `'iina'` → `iina://weblink?url={url}`
- `'infuse'` → `infuse://x-callback-url/play?url={encodeURIComponent(url)}`
- `'browser'` → returns URL as-is (opens in built-in player)

## Restored Core Functions

These 8 functions were called but never defined in v36:

### `handleManualInput(text?)`
- If `text` is provided, use it; otherwise read from `#rd-manual-input` textarea
- Run through `decodeBase64Heuristic()` to catch encoded links
- Extract all URLs (`https?://...`) and magnets (`magnet:?...`) via regex
- Deduplicate against `State.processedUrls` (new Set)
- Route magnets to `addMagnet()`, host links to `unrestrictLinkOrFolder()`
- Clear textarea on success

### `unrestrictLink(url, silent = false)`
- `const { ok, data, error } = await API.post('/unrestrict/link', { link: url })`
- On success: call `addToHistory()` with `{ type: 'success', name: data.filename, url: data.download, download: data.download, size: formatBytes(data.filesize) }`
- If not `silent`: execute default action based on `settings.defaultAction` (open download / copy URL / add to list only)
- On error: `addToHistory({ type: 'error', msg: error })`
- Returns the download URL string (unwrapped from the API response object)

### `unrestrictLinkOrFolder(url, silent = false, filter = null, callback = null)`
- Call `API.post('/unrestrict/link', { link: url })`
- If the response contains a single file: same as `unrestrictLink`, call `callback(downloadUrl)` if provided
- If the URL points to a folder host (gofile, Google Drive folder, etc.) and the API returns an error or indicates it's a folder: attempt `/unrestrict/folder/{url}` to get child links, then unrestrict each child
- If `filter` regex is provided, only unrestrict files whose names match
- Falls back to `unrestrictLink()` for simple single files
- Calls `callback(finalUrl)` when the first/primary file is resolved (used by inline 1-click buttons in Page tab)

### `addToHistory(item)`
- `item` shape: `{ type: 'success'|'error', name?, url?, download?, size?, msg?, time? }`
- Auto-sets `time: new Date().toLocaleTimeString()` if not provided
- Pushes to `State.linkHistory`
- Caps at 500 items (removes oldest entries beyond limit)
- Persists to `GM_setValue('rd_link_history', JSON.stringify(State.linkHistory))`
- If Links tab is active, calls `Tabs.Links.refresh()`
- Increments `State.sessionStats.processed`

### `deleteTorrent(id)`
- `await API.del('/torrents/delete/' + id)`
- On success: remove from `State.cachedTorrents` in-place, re-render torrent list
- Toast: "Torrent deleted"

### `deleteCloudItem(id)`
- `await API.del('/downloads/delete/' + id)`
- On success: remove from `State.cachedCloud` in-place, re-render cloud list
- Toast: "Removed from cloud"

### `cleanupTorrents()`
- Filter `State.cachedTorrents` for entries with `status === 'dead' || status === 'error'`
- Delete each via `API.del()` in parallel (`Promise.all`)
- Toast: "Cleaned {n} dead torrents"
- Refresh torrent list

### `convertPoints()`
- `await API.post('/settings/convertPoints')`
- On success: toast "Points converted! +30 days", clear cached `State.userProfile`, refresh settings tab
- On error: toast error message

## Scanner Module

### Page scanning

- Uses `MutationObserver` on `document.body` (childList + subtree) debounced via `requestIdleCallback` (fallback: 300ms `setTimeout`)
- On each scan: queries `a:not(.rd-processed)` for unprocessed links
- Magnet links (`href` starts with `magnet:`) → inject magnet icon, check cache, optionally hijack click
- Host links (match `Config.getActiveRegex()`) → inject unrestrict icon, optionally hijack click
- Marks processed links with `.rd-processed` class

### Host status

- On boot (if API key set): `GET /hosts/domains` → updates `State.dynamicHosts`, rebuilds regex
- On boot: `GET /hosts/status` → populates `State.liveHosts`
- Scanner checks `liveHosts` for each detected host — if status is `'down'`, injects error icon instead of unrestrict icon

### Icon injection (`Scanner.injectIcon`)

- Creates a `<span class="rd-inline-icon">` next to the target link
- Left-click: runs handler (unrestrict or add magnet)
- Right-click: context action — magnets get added directly, host links get unrestricted and URL copied to clipboard
- Magnet icons show hover tooltip with cached/uncached status

### X-ray tooltip (link preview)

- On hover over an injected host link icon (with 500ms delay):
  - Calls `API.post('/unrestrict/check', { link: url })`
  - Shows floating tooltip with filename and filesize
  - Result cached in `icon.dataset.xray` for subsequent hovers
  - If unsupported: shows "Unsupported" in tooltip
- Tooltip: absolute positioned, glass background, follows icon position

### Selection tooltip

- Listens to `document.selectionchange`
- When selected text contains a URL or magnet (after Base64 decode):
  - Shows floating "Process Link" tooltip centered above selection
  - Click on tooltip → opens dashboard, routes text through `handleManualInput()`
- Tooltip hidden when selection is cleared or doesn't contain processable content

### Magnet cache checking (batched)

- When a magnet icon is injected, its hash is added to `State.magnetCacheQueue`
- After 500ms of no new additions (debounced timer):
  - Batch all queued hashes into a single `GET /torrents/instantAvailability/{hash1}/{hash2}/...`
  - For each result: update icon to green (cached) or yellow (uncached) with tooltip text
- Prevents flooding the API with individual cache checks on pages with many magnets

## Link Export System

Three export scopes available from different tabs:

- **Local** (Links tab): exports all successful URLs from `State.linkHistory`
- **Page** (Page tab): exports URLs of checked items that have been unrestricted (have a `dlUrl`)
- **Cloud** (Cloud tab): exports download URLs of checked cloud items

Each scope shares the same format dropdown:
- **Plain Text** (`raw`): one URL per line
- **cURL** (`curl`): `curl -O "{url}"` per line
- **Wget** (`wget`): `wget "{url}"` per line

Export copies result to clipboard.

## New Features

### Parallel Queue with Progress
- `processQueue()` uses `async/await` with concurrency of 3 parallel unrestricts (hardcoded, not user-configurable — keeps settings simple)
- Thin progress bar in the dashboard header: "3/12 processed"
- Each item shows inline status (pending → processing → done/error)

### .torrent File Upload
- Drag & drop `.torrent` files onto the FAB or dashboard
- Detects `File` objects with `.torrent` extension in `dataTransfer.files`
- Uploads via `API.upload('/torrents/addTorrent', file)` (multipart form data through `GM_xmlhttpRequest`)

### Media Player — Subtitles
- When a torrent completes with `.srt`/`.ass`/`.vtt` files alongside video, detect them
- Unrestrict subtitle files alongside the video
- Add as `<track>` elements on the `<video>` tag
- Subtitle toggle button in player controls

### Media Player — Playlist Mode
- When a torrent has multiple video files, build a playlist
- Prev/Next buttons in the player header
- Auto-advance to next file on end
- Playlist panel (collapsible bottom list within the player window)

### Media Player — Keyboard Controls
- Space: play/pause
- Left/Right arrow: seek 10s
- Up/Down arrow: volume
- F: fullscreen
- P: PiP
- Escape: close player (or exit fullscreen first)
- M: mute toggle
- Only active when media player is open and focused

### Media Player — Volume Memory
- Persist last volume level via `GM_setValue('rd_volume', ...)`
- Restore on player open

### Scanner — Link Grouping
- Page tab groups links by domain instead of flat list
- Collapsible domain headers showing count
- "Select all in group" checkbox per domain

### Scanner — Deep Scan
- Optional toggle in Page tab control bar
- Scans inside same-origin iframes via `contentDocument` (cross-origin silently skipped — browsers block this by design)
- Re-scans on dynamic content load via MutationObserver

### Settings — Import/Export
- "Export Settings" button → downloads JSON blob with all settings + API key
- "Import Settings" button → file picker, validates JSON schema, applies
- Warns before overwriting existing settings

### Session Stats
- Small counter in the dashboard header: "12 links processed"
- Resets each browser session (not persisted)

### Notification Sounds
- Toggle in Settings (`notificationSound`)
- Short subtle chime when torrent completes (generated via Web Audio API oscillator, no external files)
- Desktop notification via `GM_notification` also fires (carried from v36)

## Mobile Experience

### Bottom Sheet
- Dashboard renders as a full-width bottom sheet on mobile (`< 768px` or `navigator.maxTouchPoints > 2`)
- Glass background with rounded grab handle at top
- Three snap points: collapsed (FAB), half-height (`50vh`), full-height (`85vh`)
- Swipe down on handle to step down or dismiss
- Content scrolls independently within the sheet

### Touch Interactions
- Long-press on injected page icons → context menu (unrestrict, copy URL, add to queue)
- Swipe left on list items → reveal delete/action buttons (iOS-style)
- Pull-to-refresh on Torrents and Cloud tabs (touch drag down triggers refetch)

### Media Player (Mobile)
- Opens fullscreen by default (no windowed mode on small screens)
- Larger touch targets for controls (48px minimum)
- Auto-enters PiP when switching tabs (where browser supports it)
- Landscape lock option button during video playback (uses Screen Orientation API — requires fullscreen context, silently degrades on unsupported browsers)

### Offline Resilience (simplified scope)
- Last-fetched torrent list and cloud history cached in `GM_setValue('rd_cached_torrents')` and `GM_setValue('rd_cached_cloud')`
- When API calls fail due to network error: shows cached data with "Offline" badge overlay
- No action queuing — offline actions show toast "You're offline. Try again when connected." (queuing adds too much complexity for a userscript that reinitializes on every page load)

## Error Handling & Security

### XSS Prevention
- Zero `innerHTML` with user-controlled data
- `DOM.create()` helper uses `document.createElement` + `textContent` for all dynamic content
- Filenames, URLs, API responses never injected as raw HTML
- Event handlers attached via `addEventListener`, not inline `onclick` strings

### API Error Handling
- All API methods return `{ ok: boolean, data?: any, error?: string }`
- Status code mapping:
  - `401/403` → clear key, show setup screen, toast "API Key Expired"
  - `429` → auto-retry after `Retry-After` header value (or 5s default)
  - `503` → retry once with 2s backoff
  - Other `5xx` → toast with user-friendly message
  - Network error → toast "Connection failed"
- Rate limiter: max 4 requests/second to RD API, excess queued

### Data Safety
- API key: `GM_setValue` primary, `localStorage` backup (kept from v36)
- Settings validated on load: unknown keys stripped, missing keys get defaults from `Config.defaultSettings`
- Link history capped at 500 items
- Import/export validates JSON schema before applying
- No sensitive data in `console.log`

### Memory & Performance
- `MutationObserver` debounced via `requestIdleCallback` (falls back to 300ms `setTimeout`)
- Torrent polling pauses when document is hidden (visibility API)
- Media player releases `ObjectURL`s on close
- Event delegation on dashboard container — no per-element listeners
- `scannedLinksMap` cleared on SPA navigation (detects URL changes via polling)
- Torrent refresh interval cleaned up on dashboard close

## File Structure

Single file: `RealDebrid v37.js`

Internal section order:
1. Userscript header (`==UserScript==`)
2. `Config` — constants, key management, settings, host lists, BASE_HOSTS regex patterns
3. `State` — all mutable state (full shape defined above)
4. `API` — Promise-based RD API wrapper with rate limiting and retry
5. `DOM` — safe element creation
6. `UI` — styles (GM_addStyle), shell components (FAB, dashboard, toasts, modals, selection tooltip, x-ray tooltip)
7. `Tabs` — Links, Page, Torrents, Cloud, Settings renderers (each with render/refresh)
8. `Scanner` — page scanning, icon injection, cache checking, host status, x-ray preview
9. `Media` — player, PiP, playlist, subtitles, keyboard controls
10. `Init` — boot, global event listeners, hotkeys, host/domain fetch

Estimated size: ~1600-1800 lines (up from 920, with all functions defined, new features, and proper architecture).
