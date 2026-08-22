# Real-Debrid Suite (RDtool)

A Tampermonkey userscript that turns any webpage into a Real-Debrid workstation — detect supported links, unrestrict downloads, manage torrents and cloud history, and play media in-browser.

## Features

- **Page action bar** — Top-right **Download via RD** + expand (⤢) when host, magnet, or `.torrent` links are detected; validity status dot (green / yellow / red)
- **Page scanner** — Inline icons on supported host links and magnets; optional host-file / iframe deep scan; toggles in Settings
- **Smart magnets** — Instant cache check; auto, video-only, all-files, or manual selection
- **Links tab** — Paste, drag-and-drop, batch unrestrict, history, and export (plain / curl / wget)
- **Torrents tab** — Add magnet/upload `.torrent`, file picker, live progress, Play/M3U, bulk delete
- **Cloud tab** — Paginated history, Load More, rename, search, sort, bulk delete
- **Media player** — In-browser playback with RD transcode fallback; PiP; VLC, IINA, Infuse
- **Updates** — Settings → Updates checks GitHub for a newer release and opens a one-click install URL
- **Mobile** — Bottom sheet UI, swipe dismiss, pull-to-refresh, long-press menus
- **Liquid Glass UI** — Dark glassmorphism that stays readable on any page

## Requirements

- [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/)
- A [Real-Debrid](https://real-debrid.com) account and API token

## Install

1. Install Tampermonkey in your browser.
2. Open the raw userscript: [`dist/real-debrid-suite.user.js`](https://github.com/NicoMancinelli/RDtool/raw/main/dist/real-debrid-suite.user.js)
3. Tampermonkey will prompt to install — confirm.
4. Visit any webpage. On first run, enter your Real-Debrid API token.

Already installed? Open **Settings → Updates → Check for Updates**, or let Tampermonkey pick up `@updateURL` / `@downloadURL`.

### API Token

1. Log in at [real-debrid.com](https://real-debrid.com)
2. Go to **My account** → **API** (or visit [API token page](https://real-debrid.com/apitoken))
3. Copy your API token and paste it into the RDtool setup card

## Usage

| Action | How |
|--------|-----|
| Open dashboard | Click **⤢** on the top-right action bar, the bottom-right ⚡ FAB (when the bar is hidden), or press `Alt+R` |
| Download from page | Click **Download via RD** on the top-right bar (when a supported host link is present) |
| Close dashboard | Click ✕ or press `Escape` |
| Unrestrict a link | Paste in Links tab, click inline ⚡, or use the page download button |
| Batch download | Page tab → select links → DL Selected |
| Settings | Settings tab — Page scanner, magnet behavior, player, updates |

See [docs/TESTING.md](docs/TESTING.md) for a full manual test checklist and [docs/DESIGN.md](docs/DESIGN.md) for the design system.

## GreasyFork

Listing copy, install steps, privacy notes, and browser compatibility for publishing on GreasyFork: [docs/GREASYFORK.md](docs/GREASYFORK.md).

## Supported Hosts

Built-in patterns for 1fichier, Rapidgator, Mega, MediaFire, Google Drive, YouTube, Turbobit, Uploaded, Zippyshare, Keep2Share, Nitroflare, Pixeldrain, DDownload, Katfile, Gofile, Qiwi.gg — plus dynamic hosts from the Real-Debrid API and custom hosts in Settings.

## Development

```bash
npm install
npm run split    # split monolith into src/modules/ (after editing RealDebrid v37.js)
npm run build    # bundle src/ → dist/real-debrid-suite.user.js
npm run lint     # ESLint
npm test         # Vitest
```

Source modules live in `src/`. The bundled output in `dist/` is what users install.

### CI / GitHub Actions

Pull requests run [`.github/workflows/ci.yml`](.github/workflows/ci.yml): `npm ci`, lint, test, and build. Run the same commands locally before pushing.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

MIT — see [LICENSE](LICENSE).
