// Config Module
    // =========================================================================

    const Config = {
        BASE_HOSTS: [
            '1fichier\\.com\\/\\?[a-z0-9]{10,10}', 'rapidgator\\.net\\/file\\/[a-z0-9]{32,32}', 'mega\\.nz\\/(file|folder|#F?!)',
            'mediafire\\.com\\/(file|folder)\\/[a-z0-9]{15,15}', 'drive\\.google\\.com\\/(file|drive|folders)\\/.+',
            'youtube\\.com\\/watch\\?v\\=[a-zA-Z0-9]{11,11}', 'turbobit\\.net\\/[a-z0-9]{12,12}', 'uploaded\\.net\\/file\\/[a-z0-9]{8,8}',
            'zippyshare\\.com\\/v\\/[a-zA-Z0-9]{8,8}\\/file', 'k2s\\.cc\\/file\\/', 'keep2share\\.cc\\/file\\/',
            'nitroflare\\.com\\/view\\/[A-Z0-9]{15,15}', 'pixeldrain\\.com\\/u\\/[a-zA-Z0-9]+', 'ddownload\\.com\\/[a-zA-Z0-9]+',
            'katfile\\.com\\/[a-zA-Z0-9]+', 'gofile\\.io\\/d\\/[a-zA-Z0-9]+', 'qiwi\\.gg\\/file\\/[a-zA-Z0-9\\-]+'
        ],

        defaultSettings: {
            hijack: false,
            autoShow: true,
            magnetAction: 'smart',
            filterExts: 'nfo, txt, url, jpg, png, md, srt',
            smartFilter: false,
            autoCleanup: false,
            defaultAction: 'dl',
            extPlayer: 'browser',
            customHosts: '',
            exportFormat: 'raw',
            notificationSound: false,
            deepScan: false
        },

        isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2),

        getKey() {
            const gmKey = GM_getValue('rd_api_key', '');
            if (gmKey) return gmKey;
            const lsKey = localStorage.getItem('rd_api_key_backup');
            return lsKey || '';
        },

        saveKey(key) {
            if (!key || key.trim().length < 5) return;
            GM_setValue('rd_api_key', key.trim());
            localStorage.setItem('rd_api_key_backup', key.trim());
            State.apiKey = key.trim();
        },

        clearKey() {
            GM_setValue('rd_api_key', '');
            localStorage.removeItem('rd_api_key_backup');
            State.apiKey = '';
        },

        getActiveRegex() {
            const allHosts = [...this.BASE_HOSTS];

            // Add dynamic hosts
            if (State.dynamicHosts && State.dynamicHosts.length) {
                State.dynamicHosts.forEach(h => {
                    allHosts.push(h.replace(/\./g, '\\.'));
                });
            }

            // Add custom hosts from settings
            if (State.settings && State.settings.customHosts) {
                State.settings.customHosts.split(',').map(h => h.trim()).filter(Boolean).forEach(h => {
                    allHosts.push(h.replace(/\./g, '\\.'));
                });
            }

            return new RegExp('\\b(' + allHosts.join('|') + ')', 'i');
        },

        hostRegex: null
    };

    // =========================================================================
