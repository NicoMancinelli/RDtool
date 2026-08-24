// API Module
    // =========================================================================

    const API = {
        _queue: [],
        _activeCount: 0,
        get _maxPerSec() {
            return Math.max(1, parseInt(State.settings.apiRateLimit, 10) || 4);
        },
        _BASE: 'https://api.real-debrid.com/rest/1.0',

        // --- Typed error model (v42.0) -----------------------------------
        // Every failure resolves { ok:false, error:<short string>,
        // errorType:<category> }. Categories drive deterministic user
        // messaging via API.describeError(); the legacy `error` string is
        // kept so existing call sites keep working.
        //
        //   auth       401/403 — key cleared, user must re-enter it
        //   rate_limit 429 after retry budget exhausted
        //   server     5xx
        //   http       other >=400
        //   network    GM_xmlhttpRequest transport failure
        //   parse      response was not JSON
        //   nokey      no API key configured at call time
        //   file       local FileReader failure before upload

        _error(errorType, message) {
            return { ok: false, errorType: errorType, error: message };
        },

        _classifyStatus(status) {
            if (status === 401 || status === 403) return 'auth';
            if (status === 429) return 'rate_limit';
            if (status >= 500) return 'server';
            return 'http';
        },

        /** Deterministic, user-facing sentence for a failed result. */
        describeError(res, fallback) {
            const type = res && res.errorType;
            const MESSAGES = {
                auth: 'Session expired — re-enter your Real-Debrid API key',
                rate_limit: 'Rate limited by Real-Debrid — try again shortly',
                server: 'Real-Debrid is temporarily unavailable — try again soon',
                http: res && res.error ? String(res.error) : '',
                network: 'Network error — check your connection',
                parse: 'Unexpected response from Real-Debrid',
                nokey: 'Add your Real-Debrid API key in Settings',
                file: 'Could not read the selected file'
            };
            return (type && MESSAGES[type]) || (res && res.error) || fallback || 'Request failed';
        },

        /** Shared GM_xmlhttpRequest onload/onerror pipeline for JSON endpoints. */
        _responseHandler(resolve, retryFn) {
            const finish = (result) => resolve(result);
            const onload = (resp) => {
                const status = resp.status;

                if (status === 401 || status === 403) {
                    Config.clearKey();
                    return finish(API._error('auth', 'Auth Error'));
                }

                // Rate limit — retry once after Retry-After (default 5s)
                if (status === 429 && retryFn) {
                    const retryAfter = parseInt(resp.responseHeaders?.match(/retry-after:\s*(\d+)/i)?.[1]) || 5;
                    return setTimeout(() => { retryFn().then(finish); }, retryAfter * 1000);
                }

                // Service unavailable — retry once after 2s
                if (status === 503 && retryFn) {
                    return setTimeout(() => { retryFn().then(finish); }, 2000);
                }

                if (status >= 400) {
                    return finish(API._error(status >= 500 ? 'server' : 'http', 'API: ' + status));
                }

                // Success — parse JSON (handle empty responses from DELETE etc.)
                const text = (resp.responseText || '').trim();
                if (!text) {
                    finish({ ok: true, data: null });
                } else {
                    try {
                        finish({ ok: true, data: JSON.parse(text) });
                    } catch (e) {
                        finish(API._error('parse', 'Parse Error'));
                    }
                }
            };
            return {
                onload: onload,
                onerror: () => finish(API._error('network', 'Network Error'))
            };
        },

        _enqueue(fn) {
            return new Promise((resolve, reject) => {
                this._queue.push(() => fn().then(resolve, reject));
                this._drain();
            });
        },

        _drain() {
            while (this._activeCount < this._maxPerSec && this._queue.length) {
                const task = this._queue.shift();
                this._activeCount++;
                const started = Date.now();
                task().finally(() => {
                    const elapsed = Date.now() - started;
                    const wait = Math.max(0, 250 - elapsed);
                    setTimeout(() => {
                        this._activeCount--;
                        this._drain();
                    }, wait);
                });
            }
        },

        request(method, endpoint, data, _retried) {
            if (!State.apiKey) return Promise.resolve(API._error('nokey', 'No API Key'));

            return this._enqueue(() => new Promise((resolve) => {
                const url = this._BASE + endpoint;
                const headers = { 'Authorization': 'Bearer ' + State.apiKey };
                let body = undefined;

                if ((method === 'POST' || method === 'PUT') && data) {
                    headers['Content-Type'] = 'application/x-www-form-urlencoded';
                    body = Object.keys(data).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(data[k])).join('&');
                }

                const handlers = API._responseHandler(resolve, _retried
                    ? null
                    : () => API.request(method, endpoint, data, true));

                GM_xmlhttpRequest({
                    method: method,
                    url: url,
                    headers: headers,
                    data: body,
                    onload: handlers.onload,
                    onerror: handlers.onerror
                });
            }));
        },

        get(endpoint) {
            return this.request('GET', endpoint);
        },

        post(endpoint, data) {
            return this.request('POST', endpoint, data);
        },

        del(endpoint) {
            return this.request('DELETE', endpoint);
        },

        put(endpoint, data) {
            return this.request('PUT', endpoint, data);
        },

        _torrentHostCache: null,

        async resolveTorrentHost() {
            if (this._torrentHostCache) return this._torrentHostCache;
            const res = await this.getTorrentsAvailableHosts();
            if (res.ok && res.data) {
                const hosts = Object.keys(res.data);
                this._torrentHostCache = hosts[0] || '';
            } else {
                this._torrentHostCache = '';
            }
            return this._torrentHostCache;
        },

        getStreamingTranscode(id) {
            return this.get('/streaming/transcode/' + id);
        },

        getStreamingMediaInfos(id) {
            return this.get('/streaming/mediaInfos/' + id);
        },

        getHostsRegex() {
            return this.get('/hosts/regex');
        },

        getHostsRegexFolder() {
            return this.get('/hosts/regexFolder');
        },

        getTorrentsActiveCount() {
            return this.get('/torrents/activeCount');
        },

        getTorrentsAvailableHosts() {
            return this.get('/torrents/availableHosts');
        },

        deleteAllDownloads() {
            return this.del('/downloads/deleteAll');
        },

        deleteAllTorrents() {
            return this.del('/torrents/deleteAll');
        },

        getDownloadsPage(limit, page) {
            const l = limit || 100;
            const p = page || 1;
            return this.get('/downloads?limit=' + l + '&page=' + p);
        },

        renameDownload(id, newFilename) {
            return this.put('/downloads/rename/' + id, { newFilename: newFilename });
        },

        getTrafficDetails() {
            return this.get('/traffic/details');
        },

        upload(endpoint, file, _retried) {
            if (!State.apiKey) return Promise.resolve(API._error('nokey', 'No API Key'));

            return this._enqueue(() => new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const arrayBuffer = reader.result;
                    const uint8 = new Uint8Array(arrayBuffer);
                    const boundary = '----RDSuite' + Date.now().toString(36) + Math.random().toString(36).slice(2);
                    const encoder = new TextEncoder();

                    // Build multipart body
                    const header = '--' + boundary + '\r\n' +
                        'Content-Disposition: form-data; name="file"; filename="' + file.name + '"\r\n' +
                        'Content-Type: application/octet-stream\r\n\r\n';
                    const footer = '\r\n--' + boundary + '--\r\n';

                    const headerBytes = encoder.encode(header);
                    const footerBytes = encoder.encode(footer);

                    // Combine into single Uint8Array
                    const body = new Uint8Array(headerBytes.length + uint8.length + footerBytes.length);
                    body.set(headerBytes, 0);
                    body.set(uint8, headerBytes.length);
                    body.set(footerBytes, headerBytes.length + uint8.length);

                    const handlers = API._responseHandler(resolve, _retried
                        ? null
                        : () => API.upload(endpoint, file, true));

                    GM_xmlhttpRequest({
                        method: 'PUT',
                        url: this._BASE + endpoint,
                        headers: {
                            'Authorization': 'Bearer ' + State.apiKey,
                            'Content-Type': 'multipart/form-data; boundary=' + boundary
                        },
                        data: body.buffer,
                        onload: handlers.onload,
                        onerror: handlers.onerror
                    });
                };
                reader.onerror = () => {
                    resolve(API._error('file', 'File Read Error'));
                };
                reader.readAsArrayBuffer(file);
            }));
        }
    };
