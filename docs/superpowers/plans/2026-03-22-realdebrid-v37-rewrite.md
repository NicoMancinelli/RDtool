# Real-Debrid Suite v37 Rewrite — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full rewrite of the Real-Debrid Suite Tampermonkey userscript with macOS Tahoe liquid glass UI, restored missing functions, new features, and mobile support.

**Architecture:** Single `.js` file with 9 internal modules (Config, State, API, DOM, UI, Tabs, Scanner, Media, Init) inside an IIFE. Promise-based API, safe DOM helpers (no innerHTML with user data), centralized state.

**Tech Stack:** Vanilla JS (Tampermonkey userscript), GM_* APIs, Web Audio API, CSS backdrop-filter

**Spec:** `docs/superpowers/specs/2026-03-22-realdebrid-v37-rewrite-design.md`

**Note:** This is a Tampermonkey userscript — no test framework available. Each task includes manual verification steps to run in the browser with Tampermonkey installed. Testing is done by loading the script on a test page and verifying behavior in the browser console and UI.

---

## File Map

- **Create:** `RealDebrid v37.js` — the complete rewritten userscript

All code lives in this single file. Tasks build it up section by section. Each task appends to / modifies the file in progress.

---

### Task 1: Scaffold — Header, Config, State

**Files:**
- Create: `RealDebrid v37.js`

- [ ] **Step 1: Create the file with UserScript header + Config module**

Write the `==UserScript==` header block with all `@grant` directives, `@match *://*/*`, `@connect real-debrid.com`, `@run-at document-end`.

Open the IIFE. Write the `Config` object containing:
- `BASE_HOSTS` array (all 16 host regex patterns from spec)
- `defaultSettings` object (all 11 settings with defaults)
- `getKey()`, `saveKey(key)`, `clearKey()` — API key management with GM_setValue + localStorage backup
- `getActiveRegex()` — builds regex from BASE_HOSTS + State.dynamicHosts + settings.customHosts
- `isMobile` detection: `/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 2)`

- [ ] **Step 2: Write the State module**

Write the `State` object with all properties from the spec:
- `apiKey`, `settings`, `currentTab`, `isExpanded`, `isMobile`
- Data: `linkHistory`, `cachedTorrents`, `cachedCloud`, `scannedLinksMap`, `dynamicHosts`, `liveHosts`, `userProfile`, `trafficData`
- Transient: `processedUrls`, `completedTorrentsMemory`, `isFirstTorrentFetch`, `torrentRefreshInterval`, `magnetCacheQueue`, `cacheCheckTimer`
- Session: `sessionStats: { processed: 0 }`
- `lastUrl: location.href` (for SPA navigation detection)

Add initialization logic:
- `State.apiKey = Config.getKey()`
- `State.settings = { ...Config.defaultSettings, ...JSON.parse(GM_getValue('rd_settings', '{}')) }` with validation (strip unknown keys, default missing)
- `State.isMobile = Config.isMobile`
- `State.linkHistory = JSON.parse(GM_getValue('rd_link_history', '[]'))` with validation (cap at 500, remove malformed)
- `State.dynamicHosts = JSON.parse(GM_getValue('rd_dynamic_hosts', '[]'))`
- `Config.hostRegex = Config.getActiveRegex()`

- [ ] **Step 3: Add utility functions**

Write at module scope (inside IIFE, after State):
- `saveSettings()` — `GM_setValue('rd_settings', JSON.stringify(State.settings))`
- `formatBytes(bytes)` — returns human-readable string (e.g., "1.5 GB", "256.3 MB")
- `decodeBase64Heuristic(text)` — scan for Base64 strings, decode if URL/magnet
- `getStreamUrl(url)` — map to VLC/IINA/Infuse URL schemes based on settings

- [ ] **Step 4: Verify scaffold**

Open the script in Tampermonkey, load any page. Open browser console and verify:
- No errors on load
- `Config.BASE_HOSTS` has 16 entries
- `Config.getActiveRegex()` returns a valid RegExp
- `State.settings` has all 11 default keys

- [ ] **Step 5: Commit**

```bash
git add "RealDebrid v37.js"
git commit -m "feat(v37): scaffold with Config, State, and utility modules"
```

---

### Task 2: API Module

**Files:**
- Modify: `RealDebrid v37.js`

- [ ] **Step 1: Write the API module**

Write the `API` object after State/utils with:

**Rate limiter:**
- `API._queue = []`, `API._activeCount = 0`, `API._maxPerSec = 4`
- `API._enqueue(fn)` — pushes to queue, calls `_drain()`
- `API._drain()` — processes queue items respecting maxPerSec

**Core method:**
```js
API.request(method, endpoint, data) → Promise<{ ok, data, error }>
```
- Wraps `GM_xmlhttpRequest` in a Promise
- URL: `https://api.real-debrid.com/rest/1.0` + endpoint
- Auth header: `Authorization: Bearer ${State.apiKey}`
- POST: `Content-Type: application/x-www-form-urlencoded`, body is URL-encoded key=value pairs
- Parses JSON response
- Error handling:
  - `401/403` → `Config.clearKey()`, return `{ ok: false, error: 'Auth Error' }`
  - `429` → wait `Retry-After` header (or 5s), retry once
  - `503` → wait 2s, retry once
  - Other errors → return `{ ok: false, error: 'API: ' + status }`
  - Network error → return `{ ok: false, error: 'Network Error' }`

**Convenience methods:**
- `API.get(endpoint)` → `API.request('GET', endpoint)`
- `API.post(endpoint, data)` → `API.request('POST', endpoint, data)`
- `API.del(endpoint)` → `API.request('DELETE', endpoint)`
- `API.upload(endpoint, file)` — multipart form upload for .torrent files. Note: `GM_xmlhttpRequest` does not support `FormData`, so the multipart body must be manually constructed:

```js
API.upload(endpoint, file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
            const boundary = '----RDUpload' + Date.now();
            const body = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${file.name}"\r\nContent-Type: application/x-bittorrent\r\n\r\n`;
            // Use Uint8Array to combine text boundary + binary file data + closing boundary
            const bodyStart = new TextEncoder().encode(body);
            const bodyEnd = new TextEncoder().encode(`\r\n--${boundary}--\r\n`);
            const fileData = new Uint8Array(reader.result);
            const combined = new Uint8Array(bodyStart.length + fileData.length + bodyEnd.length);
            combined.set(bodyStart, 0);
            combined.set(fileData, bodyStart.length);
            combined.set(bodyEnd, bodyStart.length + fileData.length);

            GM_xmlhttpRequest({
                method: 'PUT', // RD uses PUT for torrent upload
                url: 'https://api.real-debrid.com/rest/1.0' + endpoint,
                headers: {
                    'Authorization': 'Bearer ' + State.apiKey,
                    'Content-Type': 'multipart/form-data; boundary=' + boundary
                },
                data: combined.buffer,
                onload: (res) => { /* parse like API.request */ },
                onerror: () => resolve({ ok: false, error: 'Upload failed' })
            });
        };
        reader.readAsArrayBuffer(file);
    });
}
```

- [ ] **Step 2: Verify API module**

Load script. In console, test (requires valid API key):
- `API.get('/user')` should resolve with `{ ok: true, data: { username, email, ... } }`
- `API.get('/nonexistent')` should resolve with `{ ok: false, error: ... }`
- Verify no errors on load

- [ ] **Step 3: Commit**

```bash
git add "RealDebrid v37.js"
git commit -m "feat(v37): add Promise-based API module with rate limiting and retry"
```

---

### Task 3: DOM Helper Module

**Files:**
- Modify: `RealDebrid v37.js`

- [ ] **Step 1: Write the DOM module**

Write the `DOM` object:

```js
DOM.create(tag, attrs = {}, children = [])
```
- Creates element via `document.createElement(tag)`
- For each attr in `attrs`:
  - `className` → `el.className = value`
  - `textContent` → `el.textContent = value`
  - `style` (if object) → merge into `el.style`
  - `style` (if string) → `el.style.cssText = value`
  - `dataset` (if object) → merge into `el.dataset`
  - `on*` (e.g., `onClick`) → `el.addEventListener('click', value)`
  - Everything else → `el.setAttribute(key, value)`
- For each child in `children`:
  - If string → `el.appendChild(document.createTextNode(child))`
  - If Node → `el.appendChild(child)`
  - If null/undefined → skip
- Returns `el`

Additional helpers:
- `DOM.text(str)` → `document.createTextNode(str)`
- `DOM.fragment(children)` → creates a DocumentFragment with children appended
- `DOM.clear(el)` → `while(el.firstChild) el.removeChild(el.firstChild)`

- [ ] **Step 2: Verify DOM module**

In console:
- `DOM.create('div', { className: 'test', textContent: 'hello' })` creates a proper div
- `DOM.create('button', { onClick: () => console.log('clicked') }, ['Click me'])` creates a clickable button
- No innerHTML used anywhere

- [ ] **Step 3: Commit**

```bash
git add "RealDebrid v37.js"
git commit -m "feat(v37): add safe DOM helper module (no innerHTML)"
```

---

### Task 4: UI Shell — Styles + FAB + Dashboard Frame + Toasts

**Files:**
- Modify: `RealDebrid v37.js`

- [ ] **Step 1: Write all CSS via GM_addStyle**

Write the complete Tahoe liquid glass stylesheet. Key classes:
- `:root` CSS variables (all color tokens, radii, shadows from spec)
- `#rd-ui-container` — base container, fixed position, z-index 999999
- `.rd-desktop-fab` — 46px glass circle, bottom-right, glow ring on hover
- `.rd-mobile-fab` — 52px glass circle, safe area inset
- `.rd-desktop-dash` — 400px wide glass panel, bottom-right, max-height 580px
- `.rd-mobile-sheet` — full-width bottom sheet with grab handle, snap points
- `.rd-hidden` — `display: none !important`
- `.rd-header` — frosted glass header with blur(40px)
- `.rd-tabs` — segmented control with pill highlight
- `.rd-tab` / `.rd-tab.active` — glass pill background on active
- `.rd-content` — scrollable content area
- `.rd-control-bar` — glass surface control strip
- `.rd-input-btn` / `.rd-input-btn.primary` — glass buttons
- `.rd-log-item` / `.rd-log-item.success` / `.rd-log-item.error` — glass cards with thin left accent
- `.rd-badge` — notification badge on FAB
- `.rd-toast` — pill-shaped toast notifications
- `.rd-modal-overlay` / `.rd-modal` — glass modal
- `.rd-inline-icon` / `.rd-inline-icon.cached` / `.rd-inline-icon.uncached` / `.rd-inline-icon.error` — injected page icons
- `#rd-xray-tooltip` / `#rd-sel-tooltip` — glass tooltips
- `.rd-textarea` / `.rd-search-bar` / `.rd-select` / `.rd-checkbox` — form controls
- `.rd-toggle` / `.rd-slider` — toggle switch
- `.rd-progress-track` / `.rd-progress-fill` — progress bars
- `.rd-drag-active` — drag-over state
- `#rd-media-window` / `.rd-fullscreen` — media player
- Scrollbar styling (thin, glass-themed)
- Animations: `toastIn`, `toastOut`, `popIn`
- Mobile-specific: bottom sheet transitions, grab handle

- [ ] **Step 2: Write UI module — shell components**

Write the `UI` object with:

**`UI.init()`:**
- Create `#rd-ui-container` div, append to body
- Create `#rd-toast-container`, append to body
- Create `#rd-sel-tooltip` ("Process Link"), append to body
- Create `#rd-xray-tooltip`, append to body
- If no API key: render setup screen in container
- If has API key: render FAB (desktop or mobile based on State.isMobile)

**`UI.renderFAB()`:**
- Lightning bolt SVG icon + badge span
- Badge shows `State.scannedLinksMap.size`
- Click handler → `UI.toggleDashboard(true)`

**`UI.renderSetup()`:**
- API key input field + save button + "Get Token Here" link
- Save button calls `Config.saveKey()`, reloads page

**`UI.toggleDashboard(show)`:**
- If show: switch container class to dashboard mode, call `UI.renderDashboard()`
- If hide: switch to FAB mode, call `UI.renderFAB()`, update badge, **call `Tabs.Torrents.stopPolling()`** to clean up interval

**`UI.renderDashboard()`:**
- Render header (title + session stats + close button)
- Render segmented tab bar (Links, Page, Torrents, Cloud, Settings)
- Render content area
- Call active tab's `render()` method
- Wire tab click handlers

**`UI.showToast(msg, type = 'info')`:**
- Create toast element, append to toast container
- Auto-remove after 3s with fade-out animation

**`UI.showModal(title, content, footer)`:**
- Create overlay + modal with glass styling
- Returns { overlay, modal } for caller to populate and manage
- Escape key closes modal

**`UI.updateBadge(count)`:**
- Update badge text and visibility on FAB and desktop tab

**`UI.copyToClipboard(text, btnElement?)`:**
- Try `navigator.clipboard.writeText`, fallback to `GM_setClipboard`
- If btnElement: flash checkmark, revert after 1.5s

- [ ] **Step 3: Write event delegation on UI container**

Single `click`, `input`, `change` listeners on `#rd-ui-container`:
- Route tab clicks to tab switching
- Route button clicks by class/id to appropriate handlers
- Route input events to settings updates
- Route change events to select/toggle handlers

Wire global event listeners:
- `Escape` key: close modal → exit fullscreen → close media → close dashboard
- `Alt+R`: toggle dashboard
- `visibilitychange`: pause/resume torrent polling
- Drag & drop on container: handle text drops and .torrent file drops

- [ ] **Step 4: Verify UI shell**

Load script on any page:
- FAB appears bottom-right (if API key set) or setup screen shows
- Click FAB → dashboard opens with header, tabs, empty content
- Click close → returns to FAB
- Alt+R toggles dashboard
- Toast appears and auto-dismisses
- Escape closes dashboard
- Glass styling visible (blur, translucency, borders)

- [ ] **Step 5: Commit**

```bash
git add "RealDebrid v37.js"
git commit -m "feat(v37): add Tahoe liquid glass UI shell with FAB, dashboard, toasts, modals"
```

---

### Task 5: Core Functions — Link Processing

**Files:**
- Modify: `RealDebrid v37.js`

- [ ] **Step 1: Write addToHistory()**

```js
function addToHistory(item) {
    item.time = item.time || new Date().toLocaleTimeString();
    State.linkHistory.push(item);
    if (State.linkHistory.length > 500) State.linkHistory = State.linkHistory.slice(-500);
    GM_setValue('rd_link_history', JSON.stringify(State.linkHistory));
    if (item.type === 'success') State.sessionStats.processed++;
    if (State.currentTab === 'links') Tabs.Links.refresh();
}
```

- [ ] **Step 2: Write unrestrictLink()**

```js
async function unrestrictLink(url, silent = false) {
    const { ok, data, error } = await API.post('/unrestrict/link', { link: url });
    if (!ok) {
        addToHistory({ type: 'error', msg: 'Unrestrict failed: ' + error });
        return null;
    }
    const dlUrl = data.download;
    addToHistory({
        type: 'success', name: data.filename,
        url: dlUrl, download: dlUrl,
        size: formatBytes(data.filesize)
    });
    if (!silent) {
        if (State.settings.defaultAction === 'dl') window.open(dlUrl, '_blank');
        else if (State.settings.defaultAction === 'copy') UI.copyToClipboard(dlUrl);
    }
    return dlUrl;
}
```

- [ ] **Step 3: Write unrestrictLinkOrFolder()**

```js
async function unrestrictLinkOrFolder(url, silent = false, filter = null, callback = null) {
    const { ok, data, error } = await API.post('/unrestrict/link', { link: url });
    if (ok && data.download) {
        const dlUrl = data.download;
        addToHistory({
            type: 'success', name: data.filename,
            url: dlUrl, download: dlUrl,
            size: formatBytes(data.filesize)
        });
        if (!silent) {
            if (State.settings.defaultAction === 'dl') window.open(dlUrl, '_blank');
            else if (State.settings.defaultAction === 'copy') UI.copyToClipboard(dlUrl);
        }
        if (callback) callback(dlUrl);
        return dlUrl;
    }
    // Try folder endpoint
    const folderRes = await API.post('/unrestrict/folder', { link: url });
    if (folderRes.ok && Array.isArray(folderRes.data)) {
        let firstUrl = null;
        for (const childUrl of folderRes.data) {
            if (filter && !filter.test(childUrl)) continue;
            const childDl = await unrestrictLink(childUrl, silent);
            if (!firstUrl && childDl) firstUrl = childDl;
        }
        if (callback && firstUrl) callback(firstUrl);
        return firstUrl;
    }
    addToHistory({ type: 'error', msg: 'Failed: ' + (error || 'Unknown error') });
    if (callback) callback(null);
    return null;
}
```

- [ ] **Step 4: Write handleManualInput()**

```js
async function handleManualInput(text) {
    const textarea = document.getElementById('rd-manual-input');
    const raw = text || (textarea ? textarea.value : '');
    if (!raw.trim()) return UI.showToast('Nothing to process', 'error');

    const decoded = decodeBase64Heuristic(raw);
    const urls = decoded.match(/https?:\/\/[^\s<>"']+/gi) || [];
    const magnets = decoded.match(/magnet:\?[^\s<>"']+/gi) || [];
    const all = [...new Set([...magnets, ...urls])];

    if (all.length === 0) return UI.showToast('No links found', 'error');

    if (textarea) textarea.value = '';

    for (const link of all) {
        if (State.processedUrls.has(link)) continue;
        State.processedUrls.add(link);
        if (link.startsWith('magnet:')) addMagnet(link);
        else unrestrictLinkOrFolder(link);
    }
}
```

- [ ] **Step 5: Write remaining CRUD functions**

```js
async function deleteTorrent(id) {
    const { ok } = await API.del('/torrents/delete/' + id);
    if (ok) {
        State.cachedTorrents = State.cachedTorrents.filter(t => t.id !== id);
        if (State.currentTab === 'torrents') Tabs.Torrents.refresh();
        UI.showToast('Torrent deleted');
    }
}

async function deleteCloudItem(id) {
    const { ok } = await API.del('/downloads/delete/' + id);
    if (ok) {
        State.cachedCloud = State.cachedCloud.filter(c => c.id !== id);
        if (State.currentTab === 'cloud') Tabs.Cloud.refresh();
        UI.showToast('Removed from cloud');
    }
}

async function cleanupTorrents() {
    const dead = State.cachedTorrents.filter(t => t.status === 'dead' || t.status === 'error');
    if (dead.length === 0) return UI.showToast('Nothing to clean');
    await Promise.all(dead.map(t => API.del('/torrents/delete/' + t.id)));
    State.cachedTorrents = State.cachedTorrents.filter(t => t.status !== 'dead' && t.status !== 'error');
    if (State.currentTab === 'torrents') Tabs.Torrents.refresh();
    UI.showToast(`Cleaned ${dead.length} dead torrents`);
}

async function convertPoints() {
    const { ok, error } = await API.post('/settings/convertPoints');
    if (ok) {
        UI.showToast('Points converted! +30 days');
        State.userProfile = null;
        if (State.currentTab === 'settings') Tabs.Settings.render();
    } else {
        UI.showToast('Failed: ' + error, 'error');
    }
}
```

- [ ] **Step 6: Write addMagnet() and showTorrentSelectorModal()**

`addMagnet(magnet, callback?)`:
- `API.post('/torrents/addMagnet', { magnet })`
- Based on `State.settings.magnetAction`:
  - `'manual'` → fetch info, call `showTorrentSelectorModal()`
  - `'video'` → fetch info, find largest video file, select it; fallback to manual modal
  - `'smart'` → fetch info, if smartFilter enabled exclude filterExts, select remaining; else select all
  - `'all'` → select all files
- On success: `addToHistory()`, toast, refresh torrents if active, call callback

`showTorrentSelectorModal(torrentId, files, title, callback?)`:
- Use `UI.showModal()` to create overlay
- Build file list with checkboxes using `DOM.create()` — show folder paths dimmed, filenames bold, sizes
- "Select All" / "Select None" buttons
- "Start Download" → POST `/torrents/selectFiles/{id}` with checked file IDs
- "Cancel" → remove overlay

- [ ] **Step 7: Write processQueue() with parallel concurrency**

```js
async function processQueue(urls, mode) {
    const concurrency = 3;
    let completed = 0;
    const total = urls.length;

    UI.showToast(`Processing ${total} links...`);

    const worker = async () => {
        while (urls.length > 0) {
            const url = urls.shift();
            if (url.startsWith('magnet:')) {
                await addMagnet(url);
            } else {
                await unrestrictLinkOrFolder(url, mode === 'queue', null, (finalUrl) => {
                    if (mode === 'dl' && finalUrl) window.open(finalUrl, '_blank');
                });
            }
            completed++;
            // Update progress in header if visible
            const progEl = document.getElementById('rd-queue-progress');
            if (progEl) progEl.textContent = `${completed}/${total}`;
        }
    };

    const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker());
    await Promise.all(workers);
    UI.showToast('Queue finished');
}
```

- [ ] **Step 8: Write generateM3U()**

```js
async function generateM3U(name, links) {
    UI.showToast('Generating M3U...');
    let m3u = '#EXTM3U\n';
    for (const link of links) {
        const { ok, data } = await API.post('/unrestrict/link', { link });
        if (ok && data.download) {
            m3u += `#EXTINF:-1,${data.filename}\n${data.download}\n`;
        }
    }
    const blob = new Blob([m3u], { type: 'audio/x-mpegurl' });
    const url = URL.createObjectURL(blob);
    const a = DOM.create('a', { href: url, download: name.replace(/[^a-z0-9]/gi, '_') + '.m3u' });
    a.click();
    URL.revokeObjectURL(url);
    UI.showToast('M3U Downloaded!');
}
```

- [ ] **Step 9: Write getExportHtml helper**

Function to build export controls (format dropdown + export button) using DOM.create():
- Format select: raw / curl / wget
- Export button that gathers URLs from the given scope (local/page/cloud) and copies formatted output

- [ ] **Step 10: Verify core functions**

Load script with a valid API key:
- Paste a supported host link in the textarea → click Unrestrict → link appears in history
- Paste a magnet → magnet is sent to RD
- Click Clear → history clears
- Verify no console errors

- [ ] **Step 11: Commit**

```bash
git add "RealDebrid v37.js"
git commit -m "feat(v37): add all core functions — unrestrict, magnets, queue, M3U, CRUD"
```

---

### Task 6: Tab Renderers — Links + Page

**Files:**
- Modify: `RealDebrid v37.js`

- [ ] **Step 1: Write Tabs.Links**

```js
Tabs.Links = {
    render() { ... },   // Full rebuild: textarea, buttons, export, history list
    refresh() { ... }   // Update history list only, preserve textarea content
}
```

`render()`:
- Input area: textarea (`#rd-manual-input`), Unrestrict button, Clear button
- Export controls (format dropdown + export button, scope: 'local')
- History list: reverse chronological, each item as a glass card
  - Success items: filename, size, time, DL button, Copy URL button, Play button (if media)
  - Error items: error message, time
- Empty state: "No history. Paste links below or drag & drop."

`refresh()`:
- Only rebuild the history list portion, keep textarea and buttons intact

All built with `DOM.create()` — no innerHTML.

- [ ] **Step 2: Write Tabs.Page**

```js
Tabs.Page = {
    render() { ... },   // Full rebuild: control bar, link list grouped by domain
    refresh() { ... }   // Update link list, preserve search/checkbox state
}
```

`render()`:
- Control bar: Select All checkbox, "DL Selected" button, "Queue" button, export controls (scope: 'page')
- Deep scan toggle (optional)
- Link list grouped by domain:
  - Collapsible domain header with count + "select all in group" checkbox
  - Each link: checkbox, icon (magnet/host), link text, URL preview
  - Per-link actions: "1-Click" download button, "Queue" button
- Empty state: "No supported links detected on this page."

- [ ] **Step 3: Verify Links and Page tabs**

- Open dashboard → Links tab shows textarea and empty history
- Paste a link, click Unrestrict → item appears in history
- Navigate to a page with supported links → Page tab shows grouped links
- Select all, click DL → downloads start

- [ ] **Step 4: Commit**

```bash
git add "RealDebrid v37.js"
git commit -m "feat(v37): add Links and Page tab renderers with domain grouping"
```

---

### Task 7: Tab Renderers — Torrents + Cloud

**Files:**
- Modify: `RealDebrid v37.js`

- [ ] **Step 1: Write Tabs.Torrents**

```js
Tabs.Torrents = {
    render() { ... },
    refresh() { ... }
}
```

`render()`:
- Control bar: Select All checkbox, Delete Selected button, Clean Dead button
- Search bar for filtering
- Torrent list (built from `State.cachedTorrents`):
  - Each torrent: checkbox, filename (colored by status), status text, size (downloaded/total), progress bar
  - If downloading: speed (MB/s), ETA
  - If done + has links: "1 File" badge (single), or "M3U" + "All (N)" badges (multi)
  - Delete button per torrent
- Empty state: "No active torrents."

`refresh()`:
- Update torrent list only, preserve search input value and scroll position

**Torrent polling:**
- `Tabs.Torrents.startPolling()` — `setInterval(fetchTorrents, 4000)`
- `Tabs.Torrents.stopPolling()` — `clearInterval`
- `fetchTorrents(forceRender)`:
  - `API.get('/torrents')`
  - Update `State.cachedTorrents`
  - If autoCleanup: delete dead/error torrents automatically
  - Detect newly completed torrents → `GM_notification` + optional sound
  - Call `refresh()` or `render()` based on forceRender

- [ ] **Step 2: Write Tabs.Cloud**

```js
Tabs.Cloud = {
    render() { ... },
    refresh() { ... }
}
```

`render()`:
- Control bar: Select All checkbox, Delete Selected button, export controls (scope: 'cloud')
- Search bar + sort dropdown (Newest, Oldest, Largest, Smallest)
- Cloud item list (from `State.cachedCloud`):
  - Each item: checkbox, filename, size, date, DL button, Copy URL button, Play button (if media), Delete button
- Empty state: "Cloud history empty."

`refresh()`:
- Update list only, preserve search/sort state

**Data fetching:**
- On tab activate: `API.get('/downloads?limit=100')` → populate `State.cachedCloud`

- [ ] **Step 3: Write notification sound helper**

```js
function playNotificationChime() {
    if (!State.settings.notificationSound) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
}
```

- [ ] **Step 4: Verify Torrents and Cloud tabs**

- Open Torrents tab → shows loading then torrent list (if any)
- Search filters in real-time
- Completed torrents show download badges
- Open Cloud tab → shows cloud history with sort options
- Delete individual items works

- [ ] **Step 5: Commit**

```bash
git add "RealDebrid v37.js"
git commit -m "feat(v37): add Torrents and Cloud tab renderers with polling and notifications"
```

---

### Task 8: Tab Renderer — Settings

**Files:**
- Modify: `RealDebrid v37.js`

- [ ] **Step 1: Write Tabs.Settings**

```js
Tabs.Settings = {
    render() { ... },
    refresh() { ... }  // Same as render() for settings
}
```

`render()`:
- Account card (fetched from `/user` and `/traffic` APIs):
  - Username, email, account type, days remaining
  - Fidelity points + "Convert 1000 Points" button (if >= 1000)
  - Daily host quotas with progress bars (from traffic data)
- Preferences section — each setting as a row:
  - Toggle switches: hijack, autoShow, autoCleanup, smartFilter, notificationSound
  - Dropdowns: magnetAction, defaultAction, extPlayer, exportFormat
  - Text inputs: filterExts, customHosts
- Import/Export section:
  - "Export Settings" button → JSON download
  - "Import Settings" button → file picker, validate, apply with confirmation
- Logout button (danger styled)

All built with `DOM.create()`. Toggle changes save immediately via `saveSettings()`.

- [ ] **Step 2: Write import/export settings logic**

Export:
- Gather `State.settings` + `State.apiKey` into JSON
- Create Blob, trigger download as `rd-settings-backup.json`

Import:
- File input, read JSON, validate keys against `Config.defaultSettings`
- Confirm before applying
- Apply settings, save key, reload

- [ ] **Step 3: Verify Settings tab**

- Open Settings → shows account info (username, days left, points)
- Toggle a setting → toast confirms save
- Change dropdown → saves immediately
- Export → downloads JSON file
- Import → file picker, applies settings
- Logout → clears key, shows setup

- [ ] **Step 4: Commit**

```bash
git add "RealDebrid v37.js"
git commit -m "feat(v37): add Settings tab with account info, preferences, import/export"
```

---

### Task 9: Scanner Module

**Files:**
- Modify: `RealDebrid v37.js`

- [ ] **Step 1: Write Scanner.init() and Scanner.scanPage()**

`Scanner.init()`:
- If no API key, return
- Fetch host domains: `API.get('/hosts/domains')` → update `State.dynamicHosts`, rebuild regex
- Fetch host status: `API.get('/hosts/status')` → populate `State.liveHosts`
- Set up `MutationObserver` on `document.body` (childList + subtree)
  - Debounce via `requestIdleCallback` or `setTimeout(300ms)` fallback
  - On mutation: call `Scanner.scanPage()`
- Run initial `Scanner.scanPage()`

`Scanner.scanPage()`:
- Query `a:not(.rd-processed)`
- For each link:
  - If `href` starts with `magnet:` → mark processed, inject magnet icon, check cache, optionally hijack click, add to `State.scannedLinksMap`
  - If `href` matches `Config.hostRegex` and link doesn't contain `<img>`:
    - Check `State.liveHosts` for host status
    - If host is down → inject error icon
    - Otherwise → inject unrestrict icon with x-ray hover, optionally hijack click, add to scannedLinksMap
- If new links found: update badge, refresh Page tab if active

- [ ] **Step 2: Write Scanner.injectIcon()**

`Scanner.injectIcon(target, text, handler, linkUrl, extraClass)`:
- Create `<span class="rd-inline-icon">` via `DOM.create()`
- Left-click: `preventDefault`, `stopPropagation`, call handler
- Right-click (contextmenu):
  - Magnets → `addMagnet(linkUrl)`, show checkmark
  - Host links → `unrestrictLinkOrFolder(linkUrl, true)`, copy result, show clipboard icon
- For magnets: mouseenter/mouseleave shows cached/uncached tooltip
- Insert after target element
- Return the icon element

- [ ] **Step 3: Write Scanner.checkMagnetCache() — batched**

`Scanner.checkMagnetCache(magnetLink, iconElement)`:
- Extract hash from magnet link via regex
- Push `{ hash, el: iconElement }` to `State.magnetCacheQueue`
- Clear and reset `State.cacheCheckTimer` (500ms debounce)
- On timer fire:
  - Batch all queued hashes
  - `API.get('/torrents/instantAvailability/' + hashes.join('/'))`
  - For each result: update icon class (cached/uncached) and text

- [ ] **Step 4: Write X-ray tooltip logic**

On mouseenter of host link icon (with 500ms delay):
- If `icon.dataset.xray` exists → show tooltip immediately
- Otherwise: call `API.post('/unrestrict/check', { link })` → cache result in `icon.dataset.xray`
- Show tooltip with filename + filesize (or "Unsupported")
- On mouseleave: hide tooltip, clear delay timer

Tooltip positioning: absolute, centered above icon, glass background.

- [ ] **Step 5: Write selection tooltip logic**

Listen to `document.selectionchange`:
- Get selected text, run through `decodeBase64Heuristic()`
- If contains URL or magnet:
  - Position `#rd-sel-tooltip` centered above selection range
  - Show tooltip with "Process Link" text
  - Click handler: open dashboard, call `handleManualInput(text)`
- If no match: hide tooltip

- [ ] **Step 6: Write deep scan support**

Add `Scanner.scanDeep()`:
- Check if deep scan toggle is enabled (tracked in `State.deepScanEnabled`, default false, toggled from Page tab control bar)
- If enabled: iterate `document.querySelectorAll('iframe')`
- For each iframe, wrap in try/catch:
  ```js
  try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      if (iframeDoc) Scanner.scanDocument(iframeDoc);
  } catch(e) { /* cross-origin, silently skip */ }
  ```
- Refactor: extract the link-scanning loop from `Scanner.scanPage()` into `Scanner.scanDocument(doc)` that accepts a document/root. `scanPage()` calls `scanDocument(document)` then optionally `scanDeep()`.

- [ ] **Step 7: Write SPA navigation detection**

In `Scanner.init()`, add URL change polling:
```js
State.lastUrl = location.href;
setInterval(() => {
    if (location.href !== State.lastUrl) {
        State.lastUrl = location.href;
        State.scannedLinksMap.clear();
        State.processedUrls.clear();
        // Remove all injected icons from previous page
        document.querySelectorAll('.rd-inline-icon').forEach(el => el.remove());
        document.querySelectorAll('.rd-processed').forEach(el => el.classList.remove('rd-processed'));
        UI.updateBadge(0);
        Scanner.scanPage();
    }
}, 1000);
```

This handles SPA frameworks (React Router, etc.) that change the URL without a full page reload.

- [ ] **Step 8: Verify scanner**

Navigate to a page with supported host links or magnet links:
- Icons appear next to links
- Hovering shows x-ray tooltip with file info
- Right-click copies unrestricted URL
- Select a URL text → "Process Link" tooltip appears
- Magnet icons show cached/uncached status
- On an SPA site: navigate to a new page → old icons cleared, new page scanned
- If deep scan enabled: links inside same-origin iframes are also detected

- [ ] **Step 9: Commit**

```bash
git add "RealDebrid v37.js"
git commit -m "feat(v37): add Scanner with icon injection, cache checking, x-ray, selection tooltip"
```

---

### Task 10: Media Player

**Files:**
- Modify: `RealDebrid v37.js`

- [ ] **Step 1: Write Media.open()**

`Media.open(url, filename, playlist?)`:
- Remove existing media window if any (call `Media.close()` first to clean up)
- Track any created ObjectURLs in `Media._objectUrls = []`
- Create `#rd-media-window` via `DOM.create()`
- Detect media type from filename extension:
  - Video (`.mp4|.mkv|.webm|.mov|.avi`) → `<video>` with controls, autoplay, playsinline
  - Audio (`.mp3|.flac|.wav|.ogg`) → `<audio>` with album art placeholder
  - Image (`.jpg|.jpeg|.png|.webp|.gif`) → `<img>` with object-fit contain
  - Other → download link fallback
- Build header: filename (truncated), controls: PiP button (video only), fullscreen toggle, close button
- If `playlist` provided: add prev/next buttons, playlist panel
- Append to document.body
- Restore volume from `GM_getValue('rd_volume', 1)`
- If mobile: open fullscreen by default

- [ ] **Step 2: Write Media.setupDrag()**

Drag handle on the media window header:
- `mousedown` on handle (not on buttons) → start drag
- `mousemove` → update position (skip if fullscreen)
- `mouseup` → stop drag
- Touch equivalents for mobile: `touchstart`, `touchmove`, `touchend`

- [ ] **Step 3: Write Media.setupKeyboard()**

Keyboard controls (only when media window exists):
- Space → play/pause
- Left arrow → seek -10s
- Right arrow → seek +10s
- Up arrow → volume +0.1
- Down arrow → volume -0.1
- F → toggle fullscreen
- P → toggle PiP
- M → toggle mute
- Escape → exit fullscreen, or close player

Save volume on change: `GM_setValue('rd_volume', video.volume)`

- [ ] **Step 4: Write Media.setupPlaylist()**

If multiple video URLs provided:
- Track current index in playlist
- "Prev" / "Next" buttons in header update `src` and filename
- `ended` event on video → auto-advance to next
- Collapsible playlist panel at bottom of media window showing all filenames
- Click filename in playlist → jump to that item

- [ ] **Step 5: Write Media.close()**

```js
Media.close() {
    const win = document.getElementById('rd-media-window');
    if (!win) return;
    // Revoke any ObjectURLs created for this player session
    (Media._objectUrls || []).forEach(u => URL.revokeObjectURL(u));
    Media._objectUrls = [];
    // Pause media to stop buffering
    const video = win.querySelector('video');
    const audio = win.querySelector('audio');
    if (video) { video.pause(); video.src = ''; }
    if (audio) { audio.pause(); audio.src = ''; }
    win.remove();
}
```

Close button and Escape handler both call `Media.close()`.

- [ ] **Step 6: Write subtitle support**

When opening a video from a torrent with companion `.srt`/`.ass`/`.vtt` files:
- Unrestrict subtitle files via `unrestrictLink()` (requires Task 5 core functions)
- Add as `<track kind="subtitles">` elements on the video
- Add subtitle toggle button to media controls
- Default: subtitles off

- [ ] **Step 7: Verify media player**

- Click Play on a video item → media window opens
- Drag window by header → moves
- Fullscreen toggle works
- PiP works (if browser supports)
- Keyboard shortcuts work
- Close via Escape or close button → no ObjectURL leaks
- Volume persists across opens

- [ ] **Step 8: Commit**

```bash
git add "RealDebrid v37.js"
git commit -m "feat(v37): add media player with PiP, keyboard controls, playlists, subtitles"
```

---

### Task 11: Mobile Experience

**Files:**
- Modify: `RealDebrid v37.js`

- [ ] **Step 1: Write mobile bottom sheet behavior**

Modify `UI.toggleDashboard()` for mobile:
- Instead of glass panel, render full-width bottom sheet with:
  - Grab handle at top (rounded pill, centered)
  - Glass background with blur
  - Swipe-down gesture on handle/header → dismiss or step to lower snap point
- Snap points: collapsed (FAB), 50vh, 85vh
- Touch gesture handler:
  - `touchstart` on handle → record start Y
  - `touchmove` → translate sheet, show drag feedback
  - `touchend` → snap to nearest point based on velocity and position

- [ ] **Step 2: Write touch interactions**

Long-press handler for injected icons (mobile):
- `touchstart` → start 500ms timer
- `touchend` before timer → normal click
- Timer fires → show context menu (unrestrict, copy URL, add to queue)
- Context menu: glass overlay with action buttons, tap outside to dismiss

Swipe-to-delete on list items:
- `touchstart` → record X position
- `touchmove` → translate item left, reveal action buttons behind
- `touchend` → if swiped far enough, keep open; otherwise snap back

Pull-to-refresh on Torrents and Cloud:
- `touchstart` at scroll top → track pull distance
- Show spinner when pulled far enough
- `touchend` → trigger refetch if threshold met

- [ ] **Step 3: Write mobile media player adjustments**

- `Media.open()`: if `State.isMobile`, open fullscreen immediately
- Larger control buttons (48px minimum touch targets)
- Auto-PiP on `visibilitychange` (tab switch) if playing
- Landscape lock button: uses `screen.orientation.lock('landscape')` inside fullscreen, catches errors silently

- [ ] **Step 4: Verify mobile experience**

Use Chrome DevTools device emulation or test on a phone:
- FAB appears at bottom with safe area spacing
- Tap FAB → bottom sheet slides up
- Swipe down on handle → sheet dismisses
- Long-press on page icons → context menu appears
- Swipe left on list items → delete button reveals
- Pull down on Torrents tab → refreshes
- Media player opens fullscreen

- [ ] **Step 5: Commit**

```bash
git add "RealDebrid v37.js"
git commit -m "feat(v37): add mobile bottom sheet, touch gestures, and responsive media player"
```

---

### Task 12: Offline Resilience + .torrent Upload

**Files:**
- Modify: `RealDebrid v37.js`

- [ ] **Step 1: Write offline caching**

Modify `fetchTorrents()`:
- On successful fetch: cache to `GM_setValue('rd_cached_torrents', JSON.stringify(data))`
- On network error: load from `GM_getValue('rd_cached_torrents', '[]')`, show "Offline" badge

Modify `fetchCloudHistory()`:
- On successful fetch: cache to `GM_setValue('rd_cached_cloud', JSON.stringify(data))`
- On network error: load from cache, show "Offline" badge

Offline toast: "You're offline. Try again when connected."

- [ ] **Step 2: Write .torrent file upload**

Modify drag & drop handler on UI container:
- Check `e.dataTransfer.files` for `.torrent` files
- For each .torrent file:
  - Read as ArrayBuffer
  - Call `API.upload('/torrents/addTorrent', file)` — uses `GM_xmlhttpRequest` with binary data
  - On success: toast, switch to torrents tab
- Still handle text drops for URLs as before

- [ ] **Step 3: Verify offline + upload**

- Disconnect network → open Torrents tab → shows cached data with "Offline" badge
- Reconnect → data refreshes normally
- Drag a .torrent file onto the FAB → torrent appears in list

- [ ] **Step 4: Commit**

```bash
git add "RealDebrid v37.js"
git commit -m "feat(v37): add offline caching and .torrent file upload via drag & drop"
```

---

### Task 13: Init Module + Final Wiring

**Files:**
- Modify: `RealDebrid v37.js`

- [ ] **Step 1: Write Init.start()**

```js
const Init = {
    start() {
        UI.init();
        if (State.apiKey) {
            Scanner.init();
        }
    }
};

Init.start();
```

Close the IIFE: `})();`

- [ ] **Step 2: End-to-end verification**

Full test on a real page with supported links:
1. Load script → FAB appears (or setup screen if no key)
2. Enter API key → saves, reloads, FAB shows
3. Click FAB → dashboard opens with glass styling
4. **Links tab**: paste a link → unrestricts → appears in history → DL/Copy/Play work
5. **Page tab**: icons injected on links → grouped by domain → 1-click works → cache status shown on magnets
6. **Torrents tab**: shows active torrents → progress bars update → completed torrents notify → M3U/download works
7. **Cloud tab**: shows history → search/sort work → delete works → export works
8. **Settings tab**: account info loads → toggles save → import/export works
9. **Media player**: play video → drag/resize/fullscreen/PiP/keyboard all work
10. **Mobile**: bottom sheet slides, gestures work, media opens fullscreen
11. **Alt+R** toggles dashboard
12. **Escape** cascades through modals/media/dashboard
13. **Drag & drop**: text URLs and .torrent files both work
14. **Selection tooltip**: select a URL → tooltip appears → click processes it
15. No console errors on any page

- [ ] **Step 3: Final commit**

```bash
git add "RealDebrid v37.js"
git commit -m "feat(v37): complete Real-Debrid Suite v37 rewrite — init module and final wiring"
```

---

## Task Summary

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Scaffold: Header, Config, State, Utils | — |
| 2 | API Module | 1 |
| 3 | DOM Helper | 1 |
| 4 | UI Shell: Styles, FAB, Dashboard, Toasts, Modals | 1, 3 |
| 5 | Core Functions: Link Processing, Magnets, Queue, CRUD | 2, 3, 4 |
| 6 | Tab Renderers: Links + Page | 5 |
| 7 | Tab Renderers: Torrents + Cloud | 5 |
| 8 | Tab Renderer: Settings | 5 |
| 9 | Scanner Module | 5, 6 |
| 10 | Media Player | 3, 4, 5 (subtitles need unrestrictLink) |
| 11 | Mobile Experience | 4, 6, 7, 10 |
| 12 | Offline + .torrent Upload | 2, 7 |
| 13 | Init + Final Wiring | All |

**Parallelizable:** Tasks 2 and 3 can run in parallel. Tasks 6, 7, and 8 can run in parallel. Tasks 10 and 12 can run in parallel after their dependencies.
