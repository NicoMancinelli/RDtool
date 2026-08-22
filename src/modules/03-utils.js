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

    /** Parse // @version from userscript source text. */
    function parseUserscriptVersion(text) {
        if (!text || typeof text !== 'string') return null;
        const m = text.match(/^\/\/\s*@version\s+(\S+)/m);
        return m ? m[1] : null;
    }

    /** Compare dotted version strings; returns 1 if a>b, -1 if a<b, 0 if equal. */
    function compareVersions(a, b) {
        const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
        const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
        const len = Math.max(pa.length, pb.length);
        for (let i = 0; i < len; i++) {
            const da = pa[i] || 0;
            const db = pb[i] || 0;
            if (da > db) return 1;
            if (da < db) return -1;
        }
        return 0;
    }

    const Updates = {
        _fetchScript() {
            return new Promise((resolve) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: Config.UPDATE_URL + '?t=' + Date.now(),
                    onload: (resp) => {
                        if (resp.status >= 400) {
                            return resolve({ ok: false, error: 'HTTP ' + resp.status });
                        }
                        const version = parseUserscriptVersion(resp.responseText);
                        if (!version) return resolve({ ok: false, error: 'Could not parse version' });
                        resolve({ ok: true, version });
                    },
                    onerror: () => resolve({ ok: false, error: 'Network error' }),
                    ontimeout: () => resolve({ ok: false, error: 'Request timed out' })
                });
            });
        },

        async check() {
            State.updateInfo.checking = true;
            State.updateInfo.error = null;
            this._refreshSettingsUI();
            const res = await this._fetchScript();
            State.updateInfo.checking = false;
            State.updateInfo.checkedAt = Date.now();
            GM_setValue('rd_last_update_check', String(State.updateInfo.checkedAt));
            if (!res.ok) {
                State.updateInfo.error = res.error;
                this._refreshSettingsUI();
                return res;
            }
            State.updateInfo.latest = res.version;
            GM_setValue('rd_latest_version', res.version);
            State.updateInfo.updateAvailable = compareVersions(res.version, Config.VERSION) > 0;
            this._refreshSettingsUI();
            this._refreshHeaderBadge();
            return res;
        },

        applyUpdate() {
            const url = Config.UPDATE_URL;
            if (typeof GM_openInTab === 'function') {
                GM_openInTab(url, { active: true, insert: true });
            } else {
                window.open(url, '_blank', 'noopener');
            }
            UI.showToast('Confirm the install prompt in your userscript manager');
        },

        maybeCheckOnStartup() {
            const last = parseInt(GM_getValue('rd_last_update_check', '0'), 10);
            if (Date.now() - last < 86400000) return;
            this.check().then((res) => {
                if (res.ok && State.updateInfo.updateAvailable) {
                    UI.showToast('RD Suite v' + res.version + ' is available — open Settings to update');
                }
            }).catch(() => {});
        },

        _refreshSettingsUI() {
            if (Tabs.Settings && Tabs.Settings._refreshUpdatesSection) {
                Tabs.Settings._refreshUpdatesSection();
            }
        },

        _refreshHeaderBadge() {
            const badge = document.getElementById('rd-version-badge');
            if (!badge) return;
            const up = State.updateInfo.updateAvailable;
            badge.textContent = 'v' + Config.VERSION + (up ? ' ↑' : '');
            badge.style.color = up ? 'var(--rd-warning)' : 'var(--rd-text-secondary)';
            badge.title = up && State.updateInfo.latest
                ? 'v' + State.updateInfo.latest + ' available — open Settings to update'
                : '';
        }
    };

    // =========================================================================
