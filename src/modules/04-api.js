// API Module
    // =========================================================================

    const API = {
        _queue: [],
        _activeCount: 0,
        get _maxPerSec() {
            return Math.max(1, parseInt(State.settings.apiRateLimit, 10) || 4);
        },
        _BASE: 'https://api.real-debrid.com/rest/1.0',

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
            if (!State.apiKey) return Promise.resolve({ ok: false, error: 'No API Key' });

            return this._enqueue(() => new Promise((resolve) => {
                const url = this._BASE + endpoint;
                const headers = { 'Authorization': 'Bearer ' + State.apiKey };
                let body = undefined;

                if (method === 'POST' && data) {
                    headers['Content-Type'] = 'application/x-www-form-urlencoded';
                    body = Object.keys(data).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(data[k])).join('&');
                }

                GM_xmlhttpRequest({
                    method: method,
                    url: url,
                    headers: headers,
                    data: body,
                    onload: (resp) => {
                        const status = resp.status;

                        // Auth errors
                        if (status === 401 || status === 403) {
                            Config.clearKey();
                            return resolve({ ok: false, error: 'Auth Error' });
                        }

                        // Rate limit — retry once
                        if (status === 429 && !_retried) {
                            const retryAfter = parseInt(resp.responseHeaders?.match(/retry-after:\s*(\d+)/i)?.[1]) || 5;
                            return setTimeout(() => {
                                this.request(method, endpoint, data, true).then(resolve);
                            }, retryAfter * 1000);
                        }

                        // Service unavailable — retry once after 2s
                        if (status === 503 && !_retried) {
                            return setTimeout(() => {
                                this.request(method, endpoint, data, true).then(resolve);
                            }, 2000);
                        }

                        // Other errors
                        if (status >= 400) {
                            return resolve({ ok: false, error: 'API: ' + status });
                        }

                        // Success — parse JSON (handle empty responses from DELETE etc.)
                        const text = (resp.responseText || '').trim();
                        if (!text) {
                            resolve({ ok: true, data: null });
                        } else {
                            try {
                                resolve({ ok: true, data: JSON.parse(text) });
                            } catch(e) {
                                resolve({ ok: false, error: 'Parse Error' });
                            }
                        }
                    },
                    onerror: () => {
                        resolve({ ok: false, error: 'Network Error' });
                    }
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

        upload(endpoint, file) {
            if (!State.apiKey) return Promise.resolve({ ok: false, error: 'No API Key' });

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

                    GM_xmlhttpRequest({
                        method: 'PUT',
                        url: this._BASE + endpoint,
                        headers: {
                            'Authorization': 'Bearer ' + State.apiKey,
                            'Content-Type': 'multipart/form-data; boundary=' + boundary
                        },
                        data: body.buffer,
                        onload: (resp) => {
                            const status = resp.status;

                            if (status === 401 || status === 403) {
                                Config.clearKey();
                                return resolve({ ok: false, error: 'Auth Error' });
                            }

                            if (status >= 400) {
                                return resolve({ ok: false, error: 'API: ' + status });
                            }

                            const text = (resp.responseText || '').trim();
                            if (!text) {
                                resolve({ ok: true, data: null });
                            } else {
                                try {
                                    resolve({ ok: true, data: JSON.parse(text) });
                                } catch(e) {
                                    resolve({ ok: false, error: 'Parse Error' });
                                }
                            }
                        },
                        onerror: () => {
                            resolve({ ok: false, error: 'Network Error' });
                        }
                    });
                };
                reader.onerror = () => {
                    resolve({ ok: false, error: 'File Read Error' });
                };
                reader.readAsArrayBuffer(file);
            }));
        }
    };
