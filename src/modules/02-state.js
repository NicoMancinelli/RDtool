// State Module
    // =========================================================================

    const State = {
        apiKey: '',
        settings: {},
        currentTab: 'links',
        isExpanded: false,
        isMobile: false,
        // Data
        linkHistory: [],
        cachedTorrents: [],
        cachedCloud: [],
        scannedLinksMap: new Map(),
        dynamicHosts: [],
        hostsUpdatedAt: null,
        hostsFetchFailed: false,
        liveHosts: {},
        userProfile: null,
        trafficData: null,
        // Transient
        processedUrls: new Set(),
        completedTorrentsMemory: new Set(),
        isFirstTorrentFetch: true,
        torrentRefreshInterval: null,
        magnetCacheQueue: [],
        cacheCheckTimer: null,
        // Queue
        queueProcessing: false,
        queueCancel: false,
        queueCompleted: 0,
        queueTotal: 0,
        // Session
        sessionStats: { processed: 0 },
        lastUrl: location.href
    };

    // =========================================================================
    // State Initialization
    // =========================================================================

    State.apiKey = Config.getKey();
    State.isMobile = Config.isMobile;

    // Validate and load settings
    const savedSettings = JSON.parse(GM_getValue('rd_settings', '{}'));
    State.settings = {};
    for (const key of Object.keys(Config.defaultSettings)) {
        State.settings[key] = savedSettings.hasOwnProperty(key) ? savedSettings[key] : Config.defaultSettings[key];
    }

    // Load and validate history (cap at 500)
    try {
        const hist = JSON.parse(GM_getValue('rd_link_history', '[]'));
        State.linkHistory = Array.isArray(hist) ? hist.filter(h => h && h.type).slice(-500) : [];
    } catch(e) { State.linkHistory = []; }

    // Load dynamic hosts
    try { State.dynamicHosts = JSON.parse(GM_getValue('rd_dynamic_hosts', '[]')); } catch(e) { State.dynamicHosts = []; }
    const savedHostsAt = parseInt(GM_getValue('rd_hosts_updated_at', '0'), 10);
    if (savedHostsAt > 0) State.hostsUpdatedAt = savedHostsAt;

    // Now build the host regex
    Config.hostRegex = Config.getActiveRegex();

    // =========================================================================
