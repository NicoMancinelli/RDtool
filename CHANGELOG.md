# Changelog

All notable changes to Real-Debrid Suite (RDtool) are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/). Versioning tracks the `@version` userscript metadata.

## [Unreleased]

## [41.9] - 2026-08-22

### Added
- **Multi-link cycle** — when several host links are on the page, a `1/N` control cycles which URL **Download via RD** targets.
- **Block Invalid Downloads** setting (default on) — disables the download button when the validity check fails or the host is offline.

### Changed
- **Mobile download label** — top-right button shortens to **Download** on narrow screens.
- Removed unused **Auto-Show Dashboard** setting (widget visibility is already content-based).
- README and GreasyFork docs updated for the action bar, updates, and Page scanner settings; CI docs match the live workflow.

## [41.8] - 2026-08-22

### Changed
- **Page action bar (top-right)** — download button moved from bottom-left to top-right, grouped with a new **expand** control (⤢) that opens the full RD Suite widget (Page tab when links are detected). Replaces the bottom-right FAB when the bar is visible.

## [41.7] - 2026-08-22

### Added
- **Page download button** — fixed **Download via RD** control appears when the scanner finds a supported host link on any page (not only when the open tab is itself a file URL).
- **Smart corner widget** — the FAB stays hidden until the page has a supported host link, magnet link, `.torrent` URL, or you are on a host file page. Opens into the full dashboard on click.
- **`.torrent` link detection** — HTTP(S) links ending in `.torrent` are scanned, counted for the widget badge, and can be fetched + uploaded from the Page tab.
- **Download button link check** — the page **Download via RD** button calls Real-Debrid `/unrestrict/check` and shows a colored status dot: green = supported file (hover for name/size), yellow = unsupported, red = host offline or check failed, pulsing gray while checking. Reuses the same cache as inline x-ray icons.

### Changed
- FAB visibility is now always content-based (independent of whether the dashboard was manually opened before).

## [41.6] - 2026-08-22

### Added
- **Settings → Updates** — check for a newer release against the GitHub install URL, see installed vs latest version, and **Install Update** opens the script in a new tab for one-click reinstall in Tampermonkey.
- **Automatic update check** — once per day on startup; toast when a newer version is available.

## [41.5] - 2026-08-22

### Added
- **Settings → Page scanner** — toggles for **Host File Download Button** (Download via RD on `/file/…` pages) and **Inline Page Icons** (⚡ beside detected links). Both default on; changes apply immediately without reload.

## [41.4] - 2026-08-22

### Added
- **Host file page download button** — when the open tab is itself a supported host file URL (e.g. Rapidgator `/file/…`), RDtool shows one fixed **Download via RD** control (bottom-left) instead of relying on inline ⚡ icons on every UI control.

## [41.3] - 2026-08-22

### Fixed
- **Scanner icon spam on host file pages** — `href="#"` (Free/Premium/Download buttons on Rapidgator etc.) resolves to the current file URL via `link.href`, so the scanner painted ⚡ on every UI control. Raw href is checked first; hash-only, `javascript:`, and same-document links are skipped.
- **Bare dynamic host domains** — `/hosts/domains` entries like `rapidgator.net` are no longer OR'd into the matcher when `BASE_HOSTS` already has a path-aware pattern, which was matching nav/login/article links.
- **API `/hosts/regex` parsing** — Real-Debrid returns an array of `/pattern/` strings; the scanner expected `{ regex }` and never applied the precise API patterns (`useApiHostRegex` default).

## [41.2] - 2026-08-21

### Fixed
- **Nagging init error banner** — `#rd-error-banner` no longer sticks forever on pages/frames where init fails. It is click-to-dismiss and auto-hides after 8s.
- **`@noframes`** — script no longer injects into every iframe (ads/embeds), which was a common source of stray "failed to load" alerts.
- **Scanner vs UI init** — scanner/history hook failures no longer present as a full "RD Suite failed to load" banner when the dashboard already mounted; they toast instead.
- **Restricted history access** — SPA `pushState`/`replaceState` hooks are try/caught so opaque origins don't abort scanner setup.

## [41.1] - 2026-08-21

### Changed
- **Widget contrast** — elevated chrome (FAB, dashboard, mobile sheet, tooltips) now layers glass over a near-opaque `--rd-bg-surface` underlay so light page backgrounds no longer wash out text.
- **Token refresh** — stronger borders (`0.18`), secondary text (`0.68` opacity), primary text `#f5f5f7`, and darker input fills for readable meta labels and form fields on any host page.

## [40.2] - 2026-07-30

### Added
- **`UI.destroy()`** releases every listener installed by `UI.init()` — keydown (Escape cascade + shortcut + `?`), visibilitychange, and all container-level click/drag/drop handlers. Page-lifetime safe today (Tampermonkey owns disposal) but the teardown is in place for future hot-reload or SPA-unmount paths (HER-117).
- **`UI._trackContainerListener()`** helper — single registration point for container-level listeners so `UI.destroy()` can find them by (target, type, handler, options) tuple without re-grepping the source. All three drag listeners (`dragover`/`dragleave`/`drop`) and the FAB click delegation now flow through it.
- **`Scanner.destroy()`** disconnects the page-lifetime `MutationObserver` and clears the scan debounce timer. Symmetric with `UI.destroy()`.
- **`vitest.config.js`** with `environmentMatchGlobs` — `tests/media-jsdom*.test.mjs` and `tests/ui-jsdom*.test.mjs` run in jsdom; everything else stays on the default `node` env for speed. jsdom 26 added as a devDep.
- **`tests/media-jsdom.test.mjs`** — 5 new tests against a real jsdom DOM, covering `Media.open` for video / audio / image / unknown formats, single-window invariant on repeated open, and listener-by-reference cleanup on `close()` (5 → 83 tests).
- **ESLint config block** for jsdom-backed tests — extends `globals.browser` so `window` / `document` / `URL.createObjectURL` don't trip `no-undef` on the new tests.

### Changed
- **`06-ui.js` event listeners** (HER-117): global keydown and visibilitychange handlers now use named refs (`UI._globalKeydownHandler`, `UI._visibilityChangeHandler`) instead of anonymous arrows. Container listeners flow through `_trackContainerListener()`. Behavior unchanged; infrastructure for future teardown.
- **`09-scanner.js` MutationObserver** (HER-117): ref kept on `Scanner._observer` with explanatory comment documenting the page-lifetime choice. `Scanner.destroy()` is the paired teardown.
- **HER-116 security decision** (now part of v40.2): bumped lint tooling to `eslint@^10.8.0` + `@eslint/js@^10.0.1`, which resolves the dev-only `npm audit` findings left in v40.1 (3 HIGH + 1 LOW transitive vulnerabilities). Verified `npm audit` reports 0 vulnerabilities, `npm run lint` passes, all 83 Vitest tests pass, and the userscript bundle still builds.
- **CI audit gate** (now part of v40.2): GitHub Actions now runs `npm audit --audit-level=high` after `npm ci`, blocking future HIGH/CRITICAL transitive dependency regressions while allowing lower-severity advisories to be reviewed deliberately.

### Notes
- Rejected `npm audit fix` non-force: it partially bumps lockfile transitive packages but leaves the eslint v9 `minimatch`/`brace-expansion` path vulnerable and increases the report to 5 HIGH + 1 LOW. Direct eslint v10 upgrade is the clean path.
- The `dist/real-debrid-suite.user.js` shipped in v40.1 was tagged with `@version 40.1` in the source bundle (ac23320) but the file checked into `main` was stale (`@version 40.0`). v40.2 regenerates the bundle from `afad08c`'s source state, ensuring the GitHub Release artifact matches the `src/` truth.
- HER-114 (GreasyFork manual upload) and HER-118 (GreasyFork auto-deploy) remain open — v40.2 does not include any GreasyFork credentials or pipeline.

## [40.1] - 2026-07-29

### Added
- **`Config.TAB_KEYS`** central registry — single source of truth for tab identifiers (`cloud`, `links`, `page`, `settings`, `torrents`) prevents silent typo bugs in `Tabs.*` lookups across `02-state.js`, `06-ui.js`, `07-core.js`, and `tabs/*`.
- **`UI.notify()` wrapper** for `GM_notification` + optional notification chime — replaces 2 inline call sites (`07-core.js` queue-complete, `tabs/torrents.js` torrent-ready) with a single API.
- **CI / GitHub Actions section in README** documenting the deliberate Actions-off decision and how to restore CI if needed.
- **6 new regression tests** (32 new test cases, 7 → 39 total) locking in the perf + bug-fix contracts:
  - `list-renderer-shallow-equal.test.mjs` (R3-4) — cheap default compare, ~10× faster than `JSON.stringify`
  - `list-renderer-map-lookup.test.mjs` (R3-3) — `existing.get(k)` instead of per-item `querySelector`
  - `scanner-host-regex.test.mjs` (R3-5) — `Scanner._HOST_RE` hostname extraction
  - `media-drag-cleanup.test.mjs` (R2-2) — mousemove/mouseup listeners cleaned up on `Media.close()`
  - `torrent-polling-hidden.test.mjs` (R3-2) — interval callback short-circuits when `document.hidden`
  - `tab-keys.test.mjs` (R2-3) — `Config.TAB_KEYS` contract lock
- **ESLint config** for `tests/**/*.mjs` with vitest globals declared.

### Changed
- **Scanner init (R3-1):** 4 sequential `API.get()` calls (`/hosts/domains`, `/hosts/status`, `/hosts/regex`, `/hosts/regexFolder`) wrapped in `Promise.all` — ~4× faster on cold start.
- **ListRenderer perf (R3-3, R3-4):** per-item loop reads from `existing` Map (O(1)) instead of `container.querySelector(...)` (O(n)). Default `compareFn` replaced with shallow-equal `_shallowEqual` instead of expensive `JSON.stringify` round-trip.
- **Scanner hot path (R3-5):** `new URL(url).hostname` per qualifying link replaced with cached regex `/^(?:https?|magnet):\/\/([^/]+)/i` — ~10× faster per link.
- **`package-lock.json` synced to package.json@40.0.0** (was drifting at 38.9.0).

### Fixed
- **Media drag listener leak (R2-2, RISKY):** `_setupDrag()` registered `mousemove` + `mouseup` as anonymous arrow functions that were never removed; `Media.close()` now stores handler refs and `removeEventListener`s them. After 5 open/close cycles, listener count goes from 10 leaked → 0.
- **Torrent polling wastes API quota when tab backgrounded (R3-2, RISKY):** `setInterval` callback in `tabs/torrents.js` `startPolling()` now short-circuits when `document.hidden` is true — previously only the seed fetch checked hidden state; background tabs kept polling every 4s indefinitely.
- **20 dead `typeof Tabs !== 'undefined'` guards** (R2-1, bulk noise):** removed across `06-ui.js` (7), `07-core.js` (11), `tabs/settings.js` (2) — `tabs/00-index.js` unconditionally creates `Tabs = {}` at module load, so the guards were always-true defensive checks adding runtime noise.

### Notes
- `npm audit fix` was evaluated for v40.1 and left for HER-116: non-force behavior was not clearly better at the time, and the remaining findings were dev-only (not shipped to users).

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
