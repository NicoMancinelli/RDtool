# RDtool Design System — Liquid Glass

RDtool uses a dark-only glassmorphism UI injected into arbitrary web pages via Tampermonkey. All styles live in `src/styles.css` (bundled) and use the `rd-*` class prefix.

## Principles

1. **Low footprint** — Collapsed FAB stays out of the way; dashboard opens on demand (`Alt+R` or tap).
2. **Readable on any page** — High-contrast text at 9–16px; glass surfaces with blur and border for separation.
3. **Touch-first mobile** — Bottom sheet, safe-area insets, swipe-to-dismiss, pull-to-refresh on list tabs.
4. **Progressive disclosure** — Five tabs (Links, Page, Torrents, Cloud, Settings); batch actions behind checkboxes.

## Color Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--rd-bg-base` | `#0a0a0a` | Solid base, primary button text on accent |
| `--rd-bg-glass` | `rgba(255,255,255,0.08)` | Cards, FAB, dashboard |
| `--rd-bg-glass-hover` | `rgba(255,255,255,0.12)` | Hover states |
| `--rd-bg-glass-active` | `rgba(255,255,255,0.06)` | Active press (tabs, buttons) |
| `--rd-glass-tint` | `rgba(120,160,255,0.04)` | Dashboard gradient tint |
| `--rd-glass-border` | `rgba(255,255,255,0.1)` | Borders |
| `--rd-accent` | `#6eb1ff` | Primary actions, active tab |
| `--rd-success` | `#81c995` | Cached links, completed items |
| `--rd-danger` | `#f28b82` | Errors, delete actions |
| `--rd-warning` | `#fdd663` | In-progress, M3U badges |
| `--rd-text-primary` | `#f0f0f0` | Body text |
| `--rd-text-secondary` | `rgba(255,255,255,0.45)` | Meta, labels |

## Shape & Elevation

| Token | Value |
|-------|-------|
| `--rd-radius-lg` | 14px — dashboard, modals |
| `--rd-radius-md` | 10px — mobile sheet corners |
| `--rd-radius-sm` | 8px — buttons, cards |
| `--rd-radius-xs` | 6px — small controls |
| `--rd-shadow` | Large elevation |
| `--rd-shadow-sm` | FAB, small cards |
| `--rd-glass-blur` | `blur(40px) saturate(180%)` |

## Typography

- **UI:** `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, …`
- **Monospace inputs:** `'SF Mono', 'Fira Code', 'Cascadia Code'`
- **Scale:** 9px (badges) → 16px (modal close)

## Components

### Buttons

| Class | Use |
|-------|-----|
| `.rd-input-btn` | Secondary actions (Clear, Cancel, Select All) |
| `.rd-input-btn.primary` | Primary CTAs (Unrestrict, Export, Start Download) |
| `.rd-input-btn.danger` | Destructive batch actions (Delete) |
| `.rd-input-btn.success` | Positive batch actions (when needed) |
| `.rd-action-btn` | Per-item list actions (DL, URL, Play) |

**Contract:** No raw hex or `Config.colors`. Use CSS variables and `rd-input-btn` variants.

### Shell

| Class | Use |
|-------|-----|
| `.rd-desktop-fab` / `.rd-mobile-fab` | Collapsed trigger |
| `.rd-desktop-dash` / `.rd-mobile-sheet` | Expanded dashboard |
| `.rd-header` | Title bar with session counter |
| `.rd-tabs` / `.rd-tab` | Segmented tab control |
| `.rd-content` | Scrollable tab body |

### Lists

| Class | Use |
|-------|-----|
| `.rd-log-list` | Scrollable list container |
| `.rd-log-item` | Card row; add `.success` or `.error` for border accent |
| `.rd-filename` / `.rd-meta` | Title and metadata |
| `.rd-btn-group` | Inline action button row |

### Forms

| Class | Use |
|-------|-----|
| `.rd-textarea` | Link paste area |
| `.rd-search-bar` | Filter inputs |
| `.rd-select` | Dropdowns |
| `.rd-toggle` / `.rd-slider` | Boolean settings |
| `.rd-checkbox` | Batch selection |
| `.rd-account-row` | Settings preference rows |

### Overlays

| Class | Use |
|-------|-----|
| `.rd-modal-overlay` | Full-screen dim + glass modal |
| `.rd-modal-header` / `.rd-modal-content` / `.rd-modal-footer` | Modal regions |
| `.rd-toast` | Bottom-center feedback (3s auto-dismiss) |

### Page injection

| Class | Use |
|-------|-----|
| `.rd-inline-icon` | Lightning icon beside host/magnet links |
| `.cached` / `.uncached` / `.error` | Cache status modifiers |

## Icon Policy

- **FAB / header:** Inline SVG lightning bolt (`LIGHTNING_SVG`)
- **Everywhere else:** Unicode emoji for link type affordance (magnet, video, etc.)

Emoji are intentional for v38 — zero dependencies and instant recognition. SVG migration is a future option.

## UX Patterns

- **Empty states:** Centered `--rd-text-secondary` copy (e.g. "No history. Paste links below or drag & drop.")
- **Loading states:** Unified `"Loading…"` copy
- **Feedback:** Toasts for actions; left-border color on history items; progress bars on torrents
- **Keyboard:** `Escape` cascades modal → fullscreen → media → dashboard; `Alt+R` toggles dashboard
- **Mobile:** Long-press history rows for Copy/Download; pull-to-refresh on Torrents and Cloud lists

## Design Review Gate

New UI must:

1. Use `--rd-*` tokens (no hardcoded colors except `#111` on primary button text)
2. Use `rd-*` component classes
3. Include empty, loading, and error states
4. Work in both desktop dash and mobile sheet layouts
