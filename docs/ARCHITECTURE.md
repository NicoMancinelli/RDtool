# RDtool Architecture

Real-Debrid Suite is a **single client-side userscript**: one IIFE bundle
(`dist/real-debrid-suite.user.js`) injected by Tampermonkey/Violentmonkey into
arbitrary web pages. There is no backend; the only external service is the
hosted Real-Debrid REST API.

```
src/
  userscript-header.txt      @connect/@grant metadata; version synced from Config
  styles.css                 design tokens + all component CSS (bundled verbatim)
  modules/                   concatenated in build order (scripts/build.mjs)
    01-config.js             constants, defaults, tab keys, version
    02-state.js              runtime state, GM storage persistence, settings migration
    03-utils.js              pure helpers (formatting) + playMediaUrl/resolvePlayableUrl
    04-api.js                RDClient — rate-limited request pipeline + typed errors
    05-dom.js                safe DOM builders; trusted SVG icon registry (_ICONS)
    05b-list-renderer.js     shared list rendering primitives
    06-ui.js                 shell: FAB, dashboard frame, toasts, modals, shortcuts
    07-core.js               domain actions: unrestrict, magnet add, queue, deletes
    07b-torrent-picker.js    modal file picker for new torrents
    08-subtitles.js          sidecar subtitle detection + SRT/ASS→VTT conversion
    tabs/                    one renderer per dashboard tab (+shared helpers)
    09-scanner.js            page scanning: host/magnet detection, icons, action bar
    10-media.js              player window: video/audio/image, playlist, subtitles
    11-mobile.js             bottom-sheet helpers: long-press menus, pull-to-refresh
    12-init.js               bootstrap order, error banners, SPA history hooks
```

## Layering rules

1. **Tabs and Scanner call domain actions (`07-core`), never `API.*` directly** for
   multi-step flows; single-shot endpoint wrappers are fine.
2. **All dynamic content renders through `DOM.create` with `textContent`.**
   Markup injection exists in exactly one place: `DOM.iconSvg(name)`, which reads
   static strings from the `_ICONS` registry. Never add another `innerHTML` site.
   A source guard in `tests/ui-jsdom-dom-icons.test.mjs` enforces this.
3. **API failures are typed.** Every rejected request resolves
   `{ ok:false, error:<short>, errorType:<category> }` with categories
   `auth | rate_limit | server | http | network | parse | nokey | file`.
   User-visible messages go through `API.describeError(res, fallback)` so the
   same failure always produces the same sentence.
4. **Blob/object URL lifecycle belongs to the owner module.** Media registers
   every URL it creates (including subtitle blobs via `Subtitles.loadTrack`) in
   `Media._objectUrls`; `Media.close()` revokes them all.

## Data flow: scan → resolve → consume

1. `Scanner` observes the page, matches links against BASE_HOSTS patterns plus
   API `/hosts/regex` results, and records them in `State.scannedLinksMap`.
2. User triggers download/play → `07-core` unrestricts via `/unrestrict/link`,
   caches results, appends history.
3. Playback goes through `resolvePlayableUrl`: direct if browser-native,
   otherwise `/streaming/transcode/{id}` fallback, then external player as a
   last resort. Torrent playlists collect sibling subtitle files (see
   `Subtitles.pickSubtitleFiles`) and hand them to `Media.open`.

## Persistence

Settings and small caches live through `GM_getValue/GM_setValue` keys prefixed
`rd_` (see `02-state.js`). The settings schema has a version
(`Config.SETTINGS_VERSION`) with forward migration on load — extend
`migrateSettings`, never break old keys silently.

## Verification gates

`npm run lint && npm test && npm run build` must pass before merge; see
docs/TESTING.md and docs/RELEASE.md. CI runs the same trio on push/PR once
Actions are enabled at the repo level (they were disabled intentionally during
the Cursor-agent era).
