# Real-Debrid Suite v38 — Upgrade Design Plan

## Goal

Increase reliability, safety, and maintainability while preserving the fast "scan -> unrestrict -> play/export" workflow that defines the product.

Primary outcomes:
- fewer API/rate-limit failures and user-facing dead ends
- safer DOM/rendering surface
- complete feature consistency (desktop + mobile)
- easier future iteration with modular architecture and verification loops

---

## v37 Understanding and Comparison

Compared artifacts:
- `docs/superpowers/specs/2026-03-22-realdebrid-v37-rewrite-design.md`
- `docs/superpowers/plans/2026-03-22-realdebrid-v37-rewrite.md`
- `RealDebrid v37.js`

### What matches the v37 spec/plan

- Single-file userscript architecture with modules (`Config`, `State`, `API`, `DOM`, `UI`, `Tabs`, `Scanner`, `Media`, `Init`).
- Promise-based API wrapper with rate limiting and retry behavior.
- Core link/torrent/cloud/settings flows exist and are wired.
- Scanner includes host/magnet detection, icon injection, x-ray, and selection tooltip.
- Offline cache fallback for torrents/cloud exists.
- Mobile affordances exist (bottom sheet helper, long-press helper, pull-to-refresh helper).
- Settings import/export, notifications, queue processing, and media playlist support are present.

### Important gaps and inconsistencies

1) **Security architecture mismatch**
- v37 design says no unsafe HTML insertion for dynamic content, but `DOM.create()` supports `htmlContent` and assigns `innerHTML`.
- This is currently used for SVG insertion and creates policy drift from the safety model.

2) **Feature completeness mismatch (planned vs actual)**
- `deepScanEnabled` exists in state and scanner, but no clear UI control to toggle it in Page tab.
- Mobile helper functions are defined (`addMobileLongPress`, `addPullToRefresh`) but not consistently wired into tab/list interactions.
- Queue progress updates query `#rd-queue-progress`, but no stable guaranteed render path for that element.
- Subtitle handling advertised in design is not implemented in `Media` (no subtitle detection or `<track>` wiring).

3) **Architecture drift**
- v37 design estimated a tighter rewrite footprint; actual file is large monolith with UI, domain logic, API, and mobile helpers tightly coupled.
- Some globals/helpers are cross-cutting and hard to reason about in isolation.

4) **Verification and regression risk**
- No automated tests/linting pipeline; manual checks were planned but not codified as a reusable checklist in repo docs.
- High risk of regression when touching scanner/tabs/media interactions.

---

## v38 Product Direction

### Product thesis

v38 focuses on **trust and consistency**:
- "When a supported link is found, it should always produce a predictable, understandable result."
- "UI behavior should be coherent across desktop/mobile."
- "Changes should be safe to ship because we can verify them quickly."

### Non-goals for v38

- No broad platform expansion (new services/providers).
- No complete rewrite away from userscript model.
- No large visual redesign beyond consistency/clarity improvements.

---

## v38 Design Principles

1. **Safety first**: remove generic unsafe HTML paths; constrain any required markup injection.
2. **Deterministic flows**: one code path per user action with explicit state transitions and statuses.
3. **Module boundaries in-file first**: refactor internally before splitting artifacts.
4. **Mobile parity**: features advertised for mobile must be fully wired or removed from UI.
5. **Observable behavior**: add lightweight diagnostics/events for key operations.
6. **Verification before merge**: scripted checks + manual smoke suite as release gate.

---

## v38 Scope (Prioritized)

## P0 (must ship)

- **Secure DOM layer**
  - Remove generic `htmlContent` from `DOM.create()`.
  - Add explicit `DOM.iconSvg(name)` registry for static trusted SVG strings.
  - Enforce textContent/default-safe rendering for all user/API data.

- **Feature parity fixes**
  - Add visible Deep Scan toggle in `Tabs.Page` wired to `State.deepScanEnabled`.
  - Fully wire mobile long-press and pull-to-refresh into relevant list surfaces.
  - Add real queue progress UI element and lifecycle reset.

- **Media subtitle support**
  - Implement subtitle file detection (`.srt`, `.ass`, `.vtt`) in completed torrent flows.
  - Add track attachment and subtitle toggle UX in `Media`.

- **Error model normalization**
  - Standardize API/user errors into typed categories (`auth`, `network`, `rate_limit`, `server`, `validation`).
  - Map each type to deterministic toast text + suggested action.

## P1 (high value)

- **In-file modular refactor**
  - Separate concerns by stable regions/interfaces:
    - `Core` (state, settings, utilities)
    - `RDClient` (API + retry/rate limit)
    - `ShellUI` (container, tabs switch)
    - `Features` (Scanner, Torrents, Cloud, Media)
  - Introduce narrow public method contracts between modules.

- **State transition hygiene**
  - Add explicit operation states for queue/torrent actions: `idle|running|success|error|cancelled`.
  - Prevent duplicate action triggers while in-flight.

- **Documentation and release process**
  - Add `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `docs/RELEASE.md`.
  - Add a canonical manual regression checklist for each release.

## P2 (nice to have)

- **Performance tuning**
  - Reduce scanner overhead on mutation-heavy pages with smarter batching.
  - Add cache TTL rules for x-ray/host metadata.

- **UX polish**
  - Better empty states with direct "what next" actions.
  - Consistent action labels and iconography across tabs.

---

## Proposed v38 Architecture Delta

Keep single userscript output, but introduce strict internal layering:

1. `Config/State` (pure config + normalized state shape)
2. `Storage` (all GM/localStorage reads/writes)
3. `RDClient` (request pipeline, retries, typed errors)
4. `DomainActions` (unrestrict, magnet, queue, delete, convert, export)
5. `UIPrimitives` (safe DOM builders, toasts, modal, controls)
6. `FeatureTabs` (Links/Page/Torrents/Cloud/Settings rendering and handlers)
7. `Scanner` (detection/injection/cache checks)
8. `Media` (playback, playlist, subtitles, keyboard)
9. `Init` (wiring and lifecycle)

Key rule: tabs and scanner call domain actions, never raw API methods directly.

---

## v38 Implementation Plan

### Phase 1 — Stabilization (P0)
- lock behavior with manual baseline tests from current v37
- implement secure DOM changes + svg registry
- wire deep scan toggle and queue progress UI
- wire mobile long-press/pull-to-refresh into active tab surfaces
- add subtitle support end-to-end

### Phase 2 — Refactor (P1)
- introduce internal module boundaries and public interfaces
- centralize action state transitions and duplicate-action guards
- unify error mapping + user messaging

### Phase 3 — Operations (P1/P2)
- add architecture/testing/release docs
- formalize regression checklist and release checklist
- performance and UX polish pass

---

## Verification Strategy for v38

Required before release:

- **Static checks**
  - syntax/lint pass (introduce lightweight linting even if run manually)
  - grep check for forbidden unsafe render patterns

- **Functional smoke**
  - API key setup/login/logout
  - host link unrestrict + folder fallback
  - magnet add with each mode (`manual`, `video`, `smart`, `all`)
  - torrent list updates, cleanup, notifications
  - cloud actions (search/sort/delete/export)
  - scanner behaviors (icon inject, x-ray, selection tooltip, deep scan)
  - media playback (video/audio/image + playlist + subtitle toggle)
  - mobile interactions (sheet, long-press, pull-to-refresh)
  - offline fallback for torrents/cloud

- **Regression checks**
  - no duplicate processing for same link in same scan cycle
  - no stuck queue progress state after completion/error
  - no unauthorized HTML injection paths

---

## Risks and Mitigations

- **Risk:** regressions from refactor in monolithic file.
  - **Mitigation:** phase work, preserve old paths behind temporary wrappers, verify each phase.

- **Risk:** API behavior changes from Real-Debrid.
  - **Mitigation:** typed error abstraction + endpoint compatibility checks.

- **Risk:** mobile event complexity causing flaky interactions.
  - **Mitigation:** central touch utility helpers + deterministic thresholds + manual device matrix.

---

## Success Criteria (v38)

- All P0 scope implemented and verified.
- No generic unsafe HTML rendering helper remains.
- Deep Scan, mobile long-press/pull-to-refresh, queue progress, and subtitles are functional and testable.
- Release checklist and regression checklist are documented and repeatable.
- Core user journey success rate improves (scan -> resolve -> consume/export) with fewer ambiguous failures.
