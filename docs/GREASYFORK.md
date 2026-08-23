# GreasyFork Listing — Real-Debrid Suite (RDtool)

Copy for the [GreasyFork](https://greasyfork.org/) script page. Source and updates: [github.com/NicoMancinelli/RDtool](https://github.com/NicoMancinelli/RDtool).

## Description

Real-Debrid Suite turns any webpage into a Real-Debrid workstation. When the page has supported host links, magnets, or `.torrent` URLs, a compact top-right bar offers **Download via RD** (with a live validity check) and an expand control to open the full Liquid Glass dashboard — unrestrict downloads, manage torrents and cloud history, and play media in-browser.

## Features

- **Page action bar** — Top-right download + expand when actionable links are detected; colored validity status on the download button
- **Page scanner** — Inline icons on supported host links and magnets; settings for host-file button, inline icons, and API host regex
- **Smart magnets** — Instant cache check; auto, video-only, all-files, or manual selection
- **Links tab** — Paste, drag-and-drop, batch unrestrict, history, and export (plain / curl / wget)
- **Torrents tab** — Live progress, speed/ETA, M3U export, bulk delete, dead torrent cleanup
- **Cloud tab** — Real-Debrid download history with search, sort, and bulk actions
- **Media player** — In-browser video/audio with PiP; deep links to VLC, IINA, Infuse
- **In-app updates** — Check for a newer release and install from GitHub in one click
- **Mobile** — Bottom sheet UI, swipe dismiss, pull-to-refresh, long-press menus
- **Liquid Glass UI** — Dark glassmorphism that stays readable on any page

## Install

1. Install a userscript manager: [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. Install from GreasyFork (when published) or open the raw script: [`dist/real-debrid-suite.user.js`](https://github.com/NicoMancinelli/RDtool/raw/main/dist/real-debrid-suite.user.js)
3. Confirm the install prompt in your userscript manager.
4. Visit any webpage. On first run, enter your [Real-Debrid API token](https://real-debrid.com/apitoken).

## Privacy

Your Real-Debrid API token is stored **locally in your browser** via `GM_setValue` (Tampermonkey/Violentmonkey storage). It is sent only to `real-debrid.com` when the script calls the Real-Debrid API. Update checks fetch the public userscript from GitHub. RDtool does not phone home, collect analytics, or transmit your key to third parties.

## Compatible Browsers

| Browser | Userscript manager | Notes |
|---------|-------------------|-------|
| Chrome / Chromium (Edge, Brave, Opera, Vivaldi) | Tampermonkey or Violentmonkey | Recommended on desktop |
| Firefox | Tampermonkey or Violentmonkey | Full feature support |
| Safari (macOS / iOS) | Tampermonkey | Mobile bottom sheet and touch gestures supported |
| Mobile Chrome / Firefox | Tampermonkey (Android) | Pull-to-refresh and swipe dismiss on list tabs |

Requires a [Real-Debrid](https://real-debrid.com) account and API token.
