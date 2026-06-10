# Real-Debrid Suite (RDtool)

A Tampermonkey userscript that turns any webpage into a Real-Debrid workstation — detect supported links, unrestrict downloads, manage torrents and cloud history, and play media in-browser.

## Features

- **Page scanner** — Inline icons on supported host links and magnets across any site
- **Smart magnets** — Instant cache check; auto, video-only, all-files, or manual selection
- **Links tab** — Paste, drag-and-drop, batch unrestrict, history, and export (plain / curl / wget)
- **Torrents tab** — Live progress, speed/ETA, M3U export, bulk delete, dead torrent cleanup
- **Cloud tab** — Real-Debrid download history with search, sort, and bulk actions
- **Media player** — In-browser video/audio with PiP; deep links to VLC, IINA, Infuse
- **Mobile** — Bottom sheet UI, swipe dismiss, pull-to-refresh, long-press menus
- **Liquid Glass UI** — Dark glassmorphism that stays readable on any page

## Requirements

- [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/)
- A [Real-Debrid](https://real-debrid.com) account and API token

## Install

1. Install Tampermonkey in your browser.
2. Open the raw userscript: [`dist/real-debrid-suite.user.js`](dist/real-debrid-suite.user.js)
3. Tampermonkey will prompt to install — confirm.
4. Visit any webpage. On first run, enter your Real-Debrid API token.

### API Token

1. Log in at [real-debrid.com](https://real-debrid.com)
2. Go to **My account** → **API** (or visit [API token page](https://real-debrid.com/apitoken))
3. Copy your API token and paste it into the RDtool setup card

## Usage

| Action | How |
|--------|-----|
| Open dashboard | Click the ⚡ FAB (bottom-right) or press `Alt+R` |
| Close dashboard | Click ✕ or press `Escape` |
| Unrestrict a link | Paste in Links tab, or click inline ⚡ on any page |
| Batch download | Page tab → select links → DL Selected |
| Settings | Settings tab — toggles, magnet behavior, player choice |

See [docs/TESTING.md](docs/TESTING.md) for a full manual test checklist and [docs/DESIGN.md](docs/DESIGN.md) for the design system.

## Supported Hosts

Built-in patterns for 1fichier, Rapidgator, Mega, MediaFire, Google Drive, YouTube, Turbobit, Uploaded, Zippyshare, Keep2Share, Nitroflare, Pixeldrain, DDownload, Katfile, Gofile, Qiwi.gg — plus dynamic hosts from the Real-Debrid API and custom hosts in Settings.

## Development

```bash
npm install
npm run split    # split monolith into src/modules/ (after editing RealDebrid v37.js)
npm run build    # bundle src/ → dist/real-debrid-suite.user.js
npm run lint     # ESLint
```

Source modules live in `src/`. The bundled output in `dist/` is what users install.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

MIT — see [LICENSE](LICENSE).
