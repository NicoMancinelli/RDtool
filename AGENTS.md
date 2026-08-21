# AGENTS.md

## Cursor Cloud specific instructions

### What this project is
Real-Debrid Suite (RDtool) is a **single client-side Tampermonkey/Violentmonkey userscript** — there is no backend, database, server, or listening port. `npm run build` bundles `src/modules/*` + `src/styles.css` into `dist/real-debrid-suite.user.js`, which end users install into a browser userscript manager. The only external service is the third-party hosted Real-Debrid REST API (`https://api.real-debrid.com/rest/1.0`), which cannot be self-hosted and needs a user-supplied API token entered in the UI (stored via `GM_setValue`, not env vars).

### Standard commands (already documented — do not duplicate)
Dev/lint/test/build commands live in `README.md` and `package.json` scripts: `npm run lint`, `npm test`, `npm run build`, `npm run split`, `npm run rebuild`. Node 20+ is used in CI (`.github/workflows/ci.yml`); this environment runs Node 22, which works. `npm ci` installs everything (dependency refresh is handled by the environment update script).

### Non-obvious gotchas
- `npm test` (Vitest) prints `Error: Not implemented: HTMLMediaElement.prototype.pause/load` to stderr from `tests/media-jsdom.test.mjs`. These are jsdom limitations, **not failures** — all tests still pass (44/44). Do not "fix" them.
- Editing `src/modules/*` does not change `dist/` until you run `npm run build`. The committed `dist/real-debrid-suite.user.js` is a build artifact; rebuild after source changes.
- `npm run split` regenerates `src/modules/` from a monolith and is only for that specific legacy workflow — do not run it casually or it may overwrite module files.
- GitHub Actions are intentionally disabled at the repo-settings level per the README, even though `.github/workflows/ci.yml` exists. Run lint/test/build locally.

### How to exercise the product end-to-end (no real RD account needed)
Because it is a browser userscript, there is no dev server to run. To manually test the built UI (dashboard, login flow, link unrestrict) without Tampermonkey or a real Real-Debrid token, load `dist/real-debrid-suite.user.js` from a plain HTML page that defines stubs for the `GM_*` APIs (`GM_addStyle`, `GM_getValue`/`GM_setValue`, `GM_setClipboard`, `GM_notification`) and a `GM_xmlhttpRequest` that emulates the Real-Debrid REST endpoints (`GET /user`, `GET /traffic`, `GET /torrents/activeCount`, `POST /unrestrict/link`, etc.). Serve it with `python3 -m http.server`, open in Chrome, enter any API key on the Setup card, press `Alt+R` to open the dashboard, and paste a supported host link (e.g. a mediafire.com/file/... URL) to unrestrict. This harness is a throwaway testing tool — keep it out of the repo.
