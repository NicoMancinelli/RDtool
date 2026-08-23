# Release Process

## Version scheme

`MAJOR.MINOR` in `Config.VERSION` (userscript `@version`). Minor bumps for
features/fixes; major for breaking settings-schema or behavior changes.
GitHub tags follow `v<version>` (e.g. `v41.8`, historical: `v42.0`).

## Pre-flight checklist

1. **Version bump** — edit `VERSION` in `src/modules/01-config.js`. The build
   syncs `@version` in `src/userscript-header.txt` and `package.json`
   automatically; never hand-edit those two.
2. **CHANGELOG.md** — add a section under `[Unreleased]` following Keep a
   Changelog; move it to the new version with today's date.
3. **Gates** — all three must pass clean:
   ```bash
   npm run lint && npm test && npm run build
   ```
   Known-benign noise: jsdom prints
   `Not implemented: HTMLMediaElement.prototype.pause/load` during media
   tests. It is not a failure.
4. **Commit dist** — `dist/real-debrid-suite.user.js` is committed and must be
   rebuilt with the release (`git status` must be clean after build). CI and
   the in-app updater both read the blob on `main`.
5. Verify `dist/` version header matches `Config.VERSION`.

## Shipping

1. Feature branches via PR, squash-merged (matches repo history).
2. After merge to `main`, tag:
   ```bash
   git tag v<X.Y> && git push origin main --tags
   ```
3. GitHub Releases are cut from that tag; the GreasyFork listing
   (copy in docs/GREASYFORK.md) is updated manually with the same notes.

## Post-release smoke test (manual)

Because this is a userscript there is no dev server; exercise the built bundle:

1. Reinstall `dist/real-debrid-suite.user.js` in Tampermonkey.
2. Setup card accepts an API key; Alt+R toggles the dashboard.
3. Paste one supported host link → unrestrict succeeds, history row appears.
4. Open a host file page → top-right action bar shows Download via RD with a
   status dot; multi-link pages show the `1/N` cycle control.
5. Play a torrent with a sibling `.srt` → CC button appears, subtitles render,
   `C` cycles them off/on.
6. Settings → Updates reports the just-released version as up to date.
