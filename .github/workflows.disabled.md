# GitHub Actions history

CI was disabled in commit `3ae2995` (2026-07-14) because the workflow at that
time was failing noisily. Two contributing factors were identified on
re-enable (commit restoring `.github/workflows/ci.yml`):

1. **Local-only failure mode.** With `NODE_ENV=production` exported in the
   shell, `npm ci` skips `devDependencies`, so `eslint` and `vitest` are not
   installed — `npm run lint` / `npm test` then exit with `eslint: not found`
   (exit 127). GitHub Actions defaults to no `NODE_ENV`, so this only bites
   local runners, but the new workflow guards against it explicitly.

2. **Generated-bundle lint collision.** `npm run build` writes
   `dist/real-debrid-suite.user.js`, which is a concatenated IIFE in plain
   browser mode. If a future lint script ever scopes beyond `src/ tests/`,
   the bundle will produce ~270 false-positive `no-undef` errors. The
   restored workflow pins lint to `npm run lint` (which already scopes to
   `src tests`), and adds a bundle-verification step that asserts
   `@version` and `GM_addStyle` are present in the output instead of
   re-linting it.

The original disabled workflow file is recoverable from git:
```sh
git show 3ae2995~1:.github/workflows/ci.yml
```