// Config Module
// =========================================================================

const Config = {
  VERSION: "42.1",
  SETTINGS_VERSION: 2,
  UPDATE_URL:
    "https://github.com/NicoMancinelli/RDtool/raw/main/dist/real-debrid-suite.user.js",

  // Tab identifiers — single source of truth to avoid typo bugs in Tabs.* lookups.
  TAB_KEYS: Object.freeze({
    CLOUD: "cloud",
    LINKS: "links",
    PAGE: "page",
    SETTINGS: "settings",
    TORRENTS: "torrents",
  }),

  BASE_HOSTS: [
    "1fichier\\.com\\/\\?[a-z0-9]{10,10}",
    "rapidgator\\.net\\/file\\/[a-z0-9]{32,32}",
    "mega\\.nz\\/(file|folder|#F?!)",
    "mediafire\\.com\\/(file|folder)\\/[a-z0-9]{15,15}",
    "drive\\.google\\.com\\/(file|drive|folders)\\/.+",
    "youtube\\.com\\/watch\\?v\\=[a-zA-Z0-9]{11,11}",
    "turbobit\\.net\\/[a-z0-9]{12,12}",
    "uploaded\\.net\\/file\\/[a-z0-9]{8,8}",
    "zippyshare\\.com\\/v\\/[a-zA-Z0-9]{8,8}\\/file",
    "k2s\\.cc\\/file\\/",
    "keep2share\\.cc\\/file\\/",
    "nitroflare\\.com\\/view\\/[A-Z0-9]{15,15}",
    "pixeldrain\\.com\\/u\\/[a-zA-Z0-9]+",
    "ddownload\\.com\\/[a-zA-Z0-9]+",
    "katfile\\.com\\/[a-zA-Z0-9]+",
    "gofile\\.io\\/d\\/[a-zA-Z0-9]+",
    "qiwi\\.gg\\/file\\/[a-zA-Z0-9\\-]+",
  ],

  defaultSettings: {
    hijack: false,
    magnetAction: "smart",
    filterExts: "nfo, txt, url, jpg, png, md, srt",
    smartFilter: false,
    autoCleanup: false,
    defaultAction: "dl",
    extPlayer: "browser",
    customHosts: "",
    exportFormat: "raw",
    notificationSound: false,
    notifyOnQueueComplete: true,
    deepScan: false,
    dedupeHistory: true,
    toggleShortcut: "alt+r",
    rememberLastTab: true,
    rememberDashboardOpen: false,
    switchToTorrentsOnMagnet: false,
    openDashboardOnMagnet: false,
    torrentPollInterval: "4",
    queueConcurrency: "3",
    cloudLimit: "100",
    useUnrestrictCache: true,
    apiRateLimit: "4",
    maxLinksPerScan: "150",
    useApiHostRegex: true,
    hostPageDownloadButton: true,
    inlinePageIcons: true,
    blockInvalidDownloads: true,
  },

  isMobile:
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints && navigator.maxTouchPoints > 2),

  getKey() {
    const gmKey = GM_getValue("rd_api_key", "");
    if (gmKey) return gmKey;
    const lsKey = localStorage.getItem("rd_api_key_backup");
    return lsKey || "";
  },

  saveKey(key) {
    if (!key || key.trim().length < 5) return;
    GM_setValue("rd_api_key", key.trim());
    localStorage.setItem("rd_api_key_backup", key.trim());
    State.apiKey = key.trim();
  },

  clearKey() {
    GM_setValue("rd_api_key", "");
    localStorage.removeItem("rd_api_key_backup");
    State.apiKey = "";
  },

  getActiveRegex() {
    if (State.settings.useApiHostRegex && State.apiHostRegex) {
      if (State.apiHostRegex instanceof RegExp) return State.apiHostRegex;
      try {
        return new RegExp(State.apiHostRegex, "i");
      } catch (e) {
        /* fall through */
      }
    }

    const allHosts = [...this.BASE_HOSTS];
    const baseSource = this.BASE_HOSTS.join("\n");

    if (State.dynamicHosts && State.dynamicHosts.length) {
      State.dynamicHosts.forEach((h) => {
        if (!h || typeof h !== "string") return;
        const escaped = h.replace(/\./g, "\\.");
        // BASE_HOSTS already has a path-aware pattern for this domain (e.g.
        // rapidgator.net/file/…). OR-ing the bare domain would match every
        // nav/login/article link on the host and spam ⚡ icons.
        if (baseSource.includes(escaped)) return;
        // Unknown host: require a non-trivial path so bare homepage URLs are skipped.
        allHosts.push(escaped + "\\/[^\\s\"'<>#?]{2,}");
      });
    }

    if (State.settings && State.settings.customHosts) {
      State.settings.customHosts
        .split(",")
        .map((h) => h.trim())
        .filter(Boolean)
        .forEach((h) => {
          const escaped = h.replace(/\./g, "\\.");
          // Custom entries may be full path patterns or bare domains.
          if (h.includes("/")) {
            allHosts.push(escaped);
          } else {
            allHosts.push(escaped + "\\/[^\\s\"'<>#?]{2,}");
          }
        });
    }

    return new RegExp("\\b(" + allHosts.join("|") + ")", "i");
  },

  /**
   * Real-Debrid /hosts/regex returns an array of `/pattern/` strings (not
   * `{ regex: "..." }`). Compile them into one RegExp, or null on failure.
   */
  compileApiHostRegex(data) {
    let list = [];
    if (Array.isArray(data)) {
      list = data;
    } else if (data && typeof data === "object" && data.regex) {
      list = Array.isArray(data.regex) ? data.regex : [data.regex];
    } else if (typeof data === "string") {
      list = [data];
    }
    const bodies = list
      .map((p) => {
        if (typeof p !== "string") return null;
        let s = p.trim();
        if (s.startsWith("/")) {
          const last = s.lastIndexOf("/");
          if (last > 0) s = s.slice(1, last);
        }
        return s || null;
      })
      .filter(Boolean);
    if (!bodies.length) return null;
    try {
      return new RegExp("(?:" + bodies.join("|") + ")", "i");
    } catch (e) {
      return null;
    }
  },

  hostRegex: null,

  parseShortcut(str) {
    const parts = (str || "")
      .toLowerCase()
      .split("+")
      .map((s) => s.trim())
      .filter(Boolean);
    const modifiers = { alt: false, ctrl: false, shift: false, meta: false };
    let key = "";
    for (const part of parts) {
      if (part === "alt") modifiers.alt = true;
      else if (part === "ctrl" || part === "control") modifiers.ctrl = true;
      else if (part === "shift") modifiers.shift = true;
      else if (part === "meta" || part === "cmd" || part === "command")
        modifiers.meta = true;
      else key = part;
    }
    return { modifiers, key };
  },

  matchesShortcut(e, shortcutStr) {
    const { modifiers, key } = this.parseShortcut(shortcutStr);
    if (!key) return false;
    if (e.altKey !== modifiers.alt) return false;
    if (e.ctrlKey !== modifiers.ctrl) return false;
    if (e.shiftKey !== modifiers.shift) return false;
    if (e.metaKey !== modifiers.meta) return false;
    return e.key.toLowerCase() === key;
  },
};

// =========================================================================
