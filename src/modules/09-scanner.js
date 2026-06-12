const Scanner = {
    _xrayTimer: null,
    _scanTimer: null,
    _observer: null,

    init() {
        if (!State.apiKey) return;

        // Fetch hosts
        API.get('/hosts/domains').then(({ ok, data }) => {
            if (ok && Array.isArray(data)) {
                State.dynamicHosts = data;
                State.hostsUpdatedAt = Date.now();
                State.hostsFetchFailed = false;
                GM_setValue('rd_dynamic_hosts', JSON.stringify(data));
                GM_setValue('rd_hosts_updated_at', String(State.hostsUpdatedAt));
                Config.hostRegex = Config.getActiveRegex();
            } else {
                State.hostsFetchFailed = true;
            }
            if (Tabs.Settings && Tabs.Settings._updateHostsIndicator) Tabs.Settings._updateHostsIndicator();
        });
        API.get('/hosts/status').then(({ ok, data }) => {
            if (ok && data) State.liveHosts = data;
        });

        // MutationObserver
        this._observer = new MutationObserver(() => {
            if (document.hidden) return;
            clearTimeout(this._scanTimer);
            this._scanTimer = setTimeout(() => this.scanPage(), 300);
        });
        this._observer.observe(document.body, { childList: true, subtree: true });

        // SPA navigation detection
        State.lastUrl = location.href;
        setInterval(() => {
            if (location.href !== State.lastUrl) {
                State.lastUrl = location.href;
                State.scannedLinksMap.clear();
                State.processedUrls.clear();
                document.querySelectorAll('.rd-inline-icon').forEach(el => el.remove());
                document.querySelectorAll('.rd-processed').forEach(el => el.classList.remove('rd-processed'));
                UI.updateBadge(0);
                this.scanPage();
            }
        }, 1000);

        // Initial scan
        this.scanPage();

        // Selection tooltip
        this._initSelectionTooltip();
    },

    scanPage() {
        this._scanDocument(document);
        // Deep scan iframes if enabled
        if (State.settings.deepScan) {
            document.querySelectorAll('iframe').forEach(iframe => {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    if (iframeDoc) this._scanDocument(iframeDoc);
                } catch(e) { /* cross-origin, skip */ }
            });
        }
    },

    _scanDocument(doc) {
        let newFound = false;
        doc.querySelectorAll('a:not(.rd-processed)').forEach(link => {
            let url = link.href;
            let text = (link.innerText || '').trim() || url;
            if (!url) return;

            if (url.startsWith('magnet:')) {
                link.classList.add('rd-processed');
                const icon = this.injectIcon(link, '\u{1F9F2}', () => {
                    if (State.settings.openDashboardOnMagnet) UI.toggleDashboard(true);
                    addMagnet(url);
                }, url);
                this.checkMagnetCache(url, icon);
                if (State.settings.hijack) {
                    link.addEventListener('click', (e) => { e.preventDefault(); addMagnet(url); });
                }
                if (!State.scannedLinksMap.has(url)) {
                    State.scannedLinksMap.set(url, { type: 'magnet', text: text.substring(0, 45) });
                }
                newFound = true;
            } else if (Config.hostRegex && Config.hostRegex.test(url) && !link.querySelector('img')) {
                link.classList.add('rd-processed');
                // Check host status
                let hostDomain;
                try { hostDomain = new URL(url).hostname.replace('www.', ''); } catch(e) { return; }
                const hostObj = Object.values(State.liveHosts).find(h => hostDomain.includes(h.id) || hostDomain.includes((h.name || '').toLowerCase()));
                const isDown = hostObj && hostObj.status === 'down';

                if (isDown) {
                    this.injectIcon(link, '\u274C', () => UI.showToast((hostObj.name || hostDomain) + ' is offline', 'error'), url, 'error');
                } else {
                    const icon = this.injectIcon(link, '\u26A1', () => {
                        UI.openTab('links', () => unrestrictLinkOrFolder(url));
                    }, url);
                    // X-ray tooltip on hover
                    this._setupXray(icon, url);
                    // Hijack
                    if (State.settings.hijack) {
                        link.addEventListener('click', (e) => {
                            if (!e.ctrlKey && !e.metaKey) {
                                e.preventDefault();
                                UI.openTab('links', () => unrestrictLinkOrFolder(url));
                            }
                        });
                    }
                    if (!State.scannedLinksMap.has(url)) {
                        State.scannedLinksMap.set(url, { type: 'host', text: text.substring(0, 45) });
                    }
                }
                newFound = true;
            }
        });
        if (newFound) {
            UI.updateBadge(State.scannedLinksMap.size);
            if (State.currentTab === 'page' && State.isExpanded) Tabs.Page.refresh();
        }
    },

    injectIcon(target, text, handler, linkUrl, extraClass = '') {
        const icon = DOM.create('span', {
            className: 'rd-inline-icon ' + extraClass,
            textContent: text,
            title: extraClass === 'error' ? '' : 'Unrestrict (Right-click to copy)',
            onClick: (e) => { e.preventDefault(); e.stopPropagation(); handler(); },
            onContextmenu: (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (extraClass === 'error') return;
                const ogText = icon.textContent;
                icon.textContent = '\u23F3'; // hourglass
                if (text === '\u{1F9F2}') { // magnet
                    addMagnet(linkUrl, () => { icon.textContent = '\u2705'; setTimeout(() => icon.textContent = ogText, 1500); });
                } else {
                    unrestrictLinkOrFolder(linkUrl, true, null, (finalUrl) => {
                        if (finalUrl) UI.copyToClipboard(finalUrl);
                        icon.textContent = '\u{1F4CB}'; // clipboard
                        setTimeout(() => icon.textContent = ogText, 1500);
                    });
                }
            }
        });

        target.parentNode.insertBefore(icon, target.nextSibling);

        // Magnet tooltip
        if (text === '\u{1F9F2}') {
            icon.addEventListener('mouseenter', () => { if (icon.dataset.cache) this._showTooltip(icon, icon.dataset.cache); });
            icon.addEventListener('mouseleave', () => this._hideTooltip());
        }

        return icon;
    },

    checkMagnetCache(magnetLink, iconElement) {
        const hashMatch = magnetLink.match(/xt=urn:btih:([a-zA-Z0-9]+)/i);
        if (!hashMatch) return;
        const hash = hashMatch[1].toLowerCase();
        State.magnetCacheQueue.push({ hash, el: iconElement });

        clearTimeout(State.cacheCheckTimer);
        State.cacheCheckTimer = setTimeout(async () => {
            if (State.magnetCacheQueue.length === 0) return;
            const batch = [...State.magnetCacheQueue];
            State.magnetCacheQueue = [];
            const hashes = batch.map(b => b.hash).join('/');
            const { ok, data } = await API.get('/torrents/instantAvailability/' + hashes);
            if (!ok || !data) return;
            batch.forEach(item => {
                const hostData = data[item.hash];
                if (hostData && hostData.rd && hostData.rd.length > 0) {
                    item.el.classList.add('cached');
                    item.el.textContent = '\u{1F7E2} \u{1F9F2}'; // green circle + magnet
                    item.el.dataset.cache = 'Cached';
                } else {
                    item.el.classList.add('uncached');
                    item.el.textContent = '\u{1F7E1} \u{1F9F2}'; // yellow circle + magnet
                    item.el.dataset.cache = 'Uncached';
                }
            });
        }, 500);
    },

    _setupXray(icon, url) {
        let timer;
        icon.addEventListener('mouseenter', () => {
            if (icon.dataset.xray) return this._showTooltip(icon, icon.dataset.xray);
            if (State.linkCheckCache.has(url)) {
                icon.dataset.xray = State.linkCheckCache.get(url);
                return this._showTooltip(icon, icon.dataset.xray);
            }
            timer = setTimeout(async () => {
                const ogText = icon.textContent;
                icon.textContent = '\u23F3';
                const { ok, data } = await API.post('/unrestrict/check', { link: url });
                icon.textContent = ogText;
                if (ok && data && data.supported) {
                    const size = data.filesize ? formatBytes(data.filesize) : 'Unknown Size';
                    icon.dataset.xray = data.filename + ' \u2014 ' + size;
                } else {
                    icon.dataset.xray = 'Unsupported';
                }
                State.linkCheckCache.set(url, icon.dataset.xray);
                this._showTooltip(icon, icon.dataset.xray);
            }, 500);
        });
        icon.addEventListener('mouseleave', () => {
            clearTimeout(timer);
            this._hideTooltip();
        });
    },

    _showTooltip(el, text) {
        const tooltip = document.getElementById('rd-xray-tooltip');
        if (!tooltip) return;
        tooltip.textContent = text;
        const rect = el.getBoundingClientRect();
        tooltip.style.top = (rect.top + window.scrollY) + 'px';
        tooltip.style.left = (rect.left + window.scrollX + rect.width / 2) + 'px';
        tooltip.style.transform = 'translate(-50%, -100%)';
        tooltip.classList.add('visible');
    },

    _hideTooltip() {
        const tooltip = document.getElementById('rd-xray-tooltip');
        if (tooltip) tooltip.classList.remove('visible');
    },

    _initSelectionTooltip() {
        let selTimer;
        document.addEventListener('selectionchange', () => {
            if (!State.apiKey) return;
            clearTimeout(selTimer);
            selTimer = setTimeout(() => {
            const sel = window.getSelection();
            const rawText = (sel.toString() || '').trim();
            const decoded = decodeBase64Heuristic(rawText);
            const selTooltip = document.getElementById('rd-sel-tooltip');
            if (!selTooltip) return;

            if (decoded && decoded.match(/(https?:\/\/[^\s]+|magnet:\?[^\s]+)/i)) {
                try {
                    const rect = sel.getRangeAt(0).getBoundingClientRect();
                    selTooltip.style.top = (rect.top + window.scrollY) + 'px';
                    selTooltip.style.left = (rect.left + window.scrollX + rect.width / 2) + 'px';
                    selTooltip.classList.add('show');
                    selTooltip.dataset.content = decoded;
                } catch(e) {}
            } else {
                selTooltip.classList.remove('show');
            }
            }, 150);
        });

        // Click handler for selection tooltip
        document.addEventListener('click', (e) => {
            const selTooltip = document.getElementById('rd-sel-tooltip');
            if (selTooltip && e.target.closest('#rd-sel-tooltip')) {
                const content = selTooltip.dataset.content;
                if (content) {
                    UI.openTab('links', () => handleManualInput(content));
                    selTooltip.classList.remove('show');
                }
            }
        });
    }
};
