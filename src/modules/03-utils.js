// Utility Functions
    // =========================================================================

    function saveSettings() {
        State.settings._settingsVersion = Config.SETTINGS_VERSION;
        GM_setValue('rd_settings', JSON.stringify(State.settings));
    }

    function migrateSettings(raw) {
        const settings = {};
        for (const key of Object.keys(Config.defaultSettings)) {
            settings[key] = raw && Object.prototype.hasOwnProperty.call(raw, key) ? raw[key] : Config.defaultSettings[key];
        }
        return settings;
    }

    function isBrowserNativeMedia(filename, url) {
        const name = filename || url || '';
        return /\.(mp4|webm|mov|mp3|flac|wav|ogg|jpg|jpeg|png|webp|gif)(\?|$)/i.test(name);
    }

    function extractRdLinkId(url, downloadId) {
        if (downloadId) return String(downloadId);
        if (!url) return null;
        const m = url.match(/real-debrid\.com\/d\/([A-Z0-9]+)/i) || url.match(/\/d\/([A-Z0-9]+)/i);
        return m ? m[1] : null;
    }

    async function resolvePlayableUrl(url, filename, downloadId) {
        if (State.settings.extPlayer !== 'browser') {
            return { url: getStreamUrl(url), mode: 'external' };
        }
        if (isBrowserNativeMedia(filename, url)) {
            return { url, mode: 'direct' };
        }
        const id = extractRdLinkId(url, downloadId);
        if (!id) return { url, mode: 'direct' };
        const res = await API.getStreamingTranscode(id);
        if (res.ok && res.data && typeof res.data === 'object') {
            const streamUrl = res.data.mp4 || res.data.apple || res.data.dash ||
                Object.values(res.data).find((v) => typeof v === 'string' && v.startsWith('http'));
            if (streamUrl) return { url: streamUrl, mode: 'transcode' };
        }
        if (State.settings.extPlayer !== 'browser') {
            return { url: getStreamUrl(url), mode: 'external' };
        }
        return { url, mode: 'direct' };
    }

    async function playMediaUrl(url, filename, downloadId, playlist) {
        const resolved = await resolvePlayableUrl(url, filename, downloadId);
        if (resolved.mode === 'external') {
            window.open(resolved.url, '_self');
            return;
        }
        if (typeof Media !== 'undefined') {
            Media.open(resolved.url, filename, playlist, resolved.mode);
        }
    }

    function formatRelativeTime(ts) {
        if (!ts) return '';
        const sec = Math.floor((Date.now() - ts) / 1000);
        if (sec < 60) return 'just now';
        const min = Math.floor(sec / 60);
        if (min < 60) return min + 'm ago';
        const hr = Math.floor(min / 60);
        if (hr < 24) return hr + 'h ago';
        const day = Math.floor(hr / 24);
        if (day < 7) return day + 'd ago';
        return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    function formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function decodeBase64Heuristic(text) {
        const b64Regex = /([A-Za-z0-9+\/]{30,}={0,2})/g;
        return text.replace(b64Regex, (match) => {
            try {
                const decoded = atob(match);
                if (/^https?:\/\//i.test(decoded) || /^magnet:\?/i.test(decoded)) return decoded;
            } catch(e) {}
            return match;
        });
    }

    function getStreamUrl(url) {
        if (State.settings.extPlayer === 'vlc') return 'vlc://' + url;
        if (State.settings.extPlayer === 'iina') return 'iina://weblink?url=' + url;
        if (State.settings.extPlayer === 'infuse') return 'infuse://x-callback-url/play?url=' + encodeURIComponent(url);
        return url;
    }

    // =========================================================================
