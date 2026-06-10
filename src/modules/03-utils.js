// Utility Functions
    // =========================================================================

    function saveSettings() { GM_setValue('rd_settings', JSON.stringify(State.settings)); }

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
