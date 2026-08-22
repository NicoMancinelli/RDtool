const Scanner = {
    _xrayTimer: null,
    _scanTimer: null,
    _pageRefreshTimer: null,
    _observer: null,
    _linksScannedThisPass: 0,
    _HOST_RE: /^(?:https?|magnet):\/\/([^/]+)/i,

    // Releases the MutationObserver. Currently a no-op at runtime (Tampermonkey
    // owns the page lifecycle), but exposed for future HMR / SPA-unmount paths.
    destroy() {
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }
        if (this._scanTimer) { clearTimeout(this._scanTimer); this._scanTimer = null; }
    },

    init() {
        if (!State.apiKey) return;

        // Fetch hosts (parallel — independent calls, no data dependency)
        const useApiRegex = State.settings.useApiHostRegex;
        Promise.all([
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
                Scanner._updateHostPageButton();
            }),
            API.get('/hosts/status').then(({ ok, data }) => {
                if (ok && data) State.liveHosts = data;
            }),
            useApiRegex ? API.getHostsRegex().then(({ ok, data }) => {
                if (ok && data) {
                    const compiled = Config.compileApiHostRegex(data);
                    if (compiled) {
                        State.apiHostRegex = compiled;
                        Config.hostRegex = Config.getActiveRegex();
                    }
                }
                Scanner._updateHostPageButton();
            }) : Promise.resolve(),
            useApiRegex ? API.getHostsRegexFolder().then(({ ok, data }) => {
                if (ok && data) {
                    // Folder regex is informational / future use; accept array or {regex}.
                    const compiled = Config.compileApiHostRegex(data);
                    if (compiled) State.apiHostRegexFolder = compiled;
                    else if (data && data.regex) State.apiHostRegexFolder = data.regex;
                }
            }) : Promise.resolve()
        ]).catch(() => { /* individual failures already handled above */ });

        // MutationObserver — page-lifetime observer. Single registration in init(),
        // paired with destroy() for symmetry. Currently never destroyed (Tampermonkey
        // owns the page lifecycle), but the ref is kept so a future HMR / SPA
        // route-switch path can disconnect without re-grepping — see HER-117.
        this._observer = new MutationObserver(() => {
            if (document.hidden) return;
            clearTimeout(this._scanTimer);
            this._scanTimer = setTimeout(() => this.scanPage(), 300);
        });
        if (document.body) {
            this._observer.observe(document.body, { childList: true, subtree: true });
        }

        // SPA navigation detection — history monkey-patch can throw on
        // restricted / opaque origins; fall back to polling alone.
        State.lastUrl = location.href;
        const onNav = () => {
            if (location.href === State.lastUrl) return;
            State.lastUrl = location.href;
            State.scannedLinksMap.clear();
            State.processedUrls.clear();
            State.pageCollapsedDomains.clear();
            document.querySelectorAll('.rd-inline-icon').forEach(el => el.remove());
            document.querySelectorAll('.rd-processed').forEach(el => el.classList.remove('rd-processed'));
            Scanner.removeHostPageButton();
            UI.updateBadge(0);
            this.scanPage();
            this._updateHostPageButton();
        };
        window.addEventListener('popstate', onNav);
        window.addEventListener('hashchange', onNav);
        try {
            const origPush = history.pushState;
            const origReplace = history.replaceState;
            history.pushState = function() { origPush.apply(this, arguments); onNav(); };
            history.replaceState = function() { origReplace.apply(this, arguments); onNav(); };
        } catch (e) {
            console.warn('[RD Suite] SPA history hooks unavailable:', e);
        }
        setInterval(onNav, 2000);

        // Initial scan
        this.scanPage();
        this._updateHostPageButton();

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
        const maxPerPass = Math.max(20, parseInt(State.settings.maxLinksPerScan, 10) || 150);
        this._linksScannedThisPass = 0;
        const links = doc.querySelectorAll('a:not(.rd-processed)');
        let pageUrlNoHash = '';
        try {
            pageUrlNoHash = ((doc.defaultView || window).location.href || '').split('#')[0];
        } catch (_) { /* opaque origin */ }
        for (let i = 0; i < links.length; i++) {
            if (this._linksScannedThisPass >= maxPerPass) break;
            const link = links[i];
            this._linksScannedThisPass++;

            // Use the raw attribute — link.href resolves "#" to the current
            // page URL, which on host file pages matches /file/… and paints ⚡
            // on every Free/Premium/Download button.
            const rawHref = link.getAttribute('href');
            if (!Scanner.isScannableHref(rawHref)) continue;

            let url = link.href;
            let text = (link.innerText || '').trim() || url;
            if (!url) continue;
            if (!/^(https?:|magnet:)/i.test(url)) continue;

            // Same-document links (logo → current file, empty href, etc.)
            if (pageUrlNoHash && url.split('#')[0] === pageUrlNoHash) continue;

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
                const hostMatch = url.match(Scanner._HOST_RE);
                if (!hostMatch) continue;
                const hostDomain = hostMatch[1].replace(/^www\./, '');
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
        }
        if (newFound) {
            UI.updateBadge(State.scannedLinksMap.size);
            if (State.currentTab === 'page' && State.isExpanded) {
                clearTimeout(this._pageRefreshTimer);
                this._pageRefreshTimer = setTimeout(() => Tabs.Page.refresh(), 400);
            }
        }
    },

    /** Current page URL without hash fragment. */
    getPageUrl() {
        try {
            return (location.href || '').split('#')[0];
        } catch (_) {
            return '';
        }
    },

    /** True when the open tab is itself a supported host file link. */
    isHostFilePageUrl(url) {
        if (!url || !Config.hostRegex) return false;
        const clean = url.split('#')[0];
        if (!/^https?:/i.test(clean)) return false;
        return Config.hostRegex.test(clean);
    },

    /** One fixed download control on host file pages (e.g. Rapidgator /file/…). */
    _updateHostPageButton() {
        if (!State.apiKey) {
            this.removeHostPageButton();
            return;
        }
        const url = this.getPageUrl();
        if (!this.isHostFilePageUrl(url)) {
            this.removeHostPageButton();
            return;
        }

        const hostMatch = url.match(Scanner._HOST_RE);
        const hostDomain = hostMatch ? hostMatch[1].replace(/^www\./, '') : '';
        const hostObj = hostDomain
            ? Object.values(State.liveHosts).find(h => hostDomain.includes(h.id) || hostDomain.includes((h.name || '').toLowerCase()))
            : null;
        const isDown = hostObj && hostObj.status === 'down';

        let btn = document.getElementById('rd-host-dl-btn');
        if (!btn) {
            btn = DOM.create('button', {
                id: 'rd-host-dl-btn',
                className: 'rd-host-dl-btn',
                type: 'button',
                title: 'Unrestrict this file with Real-Debrid',
                onClick: (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    Scanner._onHostPageDownloadClick();
                }
            }, [
                DOM.create('span', { className: 'rd-host-dl-icon', textContent: '\u26A1' }),
                DOM.create('span', { className: 'rd-host-dl-label', textContent: 'Download via RD' })
            ]);
            document.body.appendChild(btn);
        }

        btn.classList.toggle('rd-offline', !!isDown);
        btn.disabled = !!isDown || btn.classList.contains('rd-busy');
        btn.title = isDown
            ? ((hostObj && hostObj.name) || hostDomain) + ' is offline'
            : 'Unrestrict this file with Real-Debrid';
    },

    async _onHostPageDownloadClick() {
        const btn = document.getElementById('rd-host-dl-btn');
        const url = this.getPageUrl();
        if (!url || (btn && (btn.disabled || btn.classList.contains('rd-busy')))) return;

        const label = btn && btn.querySelector('.rd-host-dl-label');
        if (btn) {
            btn.classList.add('rd-busy');
            btn.disabled = true;
            if (label) label.textContent = 'Working\u2026';
        }

        try {
            await unrestrictLinkOrFolder(url);
        } finally {
            if (btn) {
                btn.classList.remove('rd-busy');
                btn.disabled = false;
                if (label) label.textContent = 'Download via RD';
                this._updateHostPageButton();
            }
        }
    },

    removeHostPageButton() {
        const btn = document.getElementById('rd-host-dl-btn');
        if (btn) btn.remove();
    },

    /** Raw href attribute is scannable (not # / javascript: / empty). */
    isScannableHref(rawHref) {
        if (rawHref == null) return false;
        const href = String(rawHref).trim();
        if (!href || href === '#') return false;
        if (href.charAt(0) === '#') return false;
        if (/^(javascript|mailto|tel|data|blob):/i.test(href)) return false;
        return true;
    },

    injectIcon(target, text, handler, linkUrl, extraClass = '') {
        const icon = DOM.create('span', {
            className: 'rd-inline-icon ' + extraClass,
            textContent: text,
            dataset: { linkUrl: linkUrl || '' },
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

        if (State.isMobile && extraClass !== 'error' && linkUrl) {
            addMobileLongPress(icon, [{
                label: 'File info',
                action: async () => {
                    if (linkUrl.startsWith('magnet:')) {
                        UI.showToast(icon.dataset.cache || 'Checking cache...');
                        return;
                    }
                    let info = State.linkCheckCache.get(linkUrl);
                    if (!info) {
                        const { ok, data } = await API.post('/unrestrict/check', { link: linkUrl });
                        if (ok && data && data.supported) {
                            info = data.filename + ' \u2014 ' + (data.filesize ? formatBytes(data.filesize) : 'Unknown');
                            State.linkCheckCache.set(linkUrl, info);
                            State.pageLinkCache.set(linkUrl, 'cached');
                        } else {
                            info = 'Unsupported or uncached';
                            State.pageLinkCache.set(linkUrl, 'uncached');
                        }
                    }
                    UI.showModal('Link Info', [DOM.create('div', { textContent: info, style: 'font-size:13px;' })], []);
                }
            }]);
        }

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
        State.magnetCacheQueue.push({ hash, el: iconElement, magnet: magnetLink });

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
                const magnetUrl = item.magnet || item.el.dataset.linkUrl || '';
                if (hostData && hostData.rd && hostData.rd.length > 0) {
                    item.el.classList.add('cached');
                    item.el.textContent = '\u{1F7E2} \u{1F9F2}';
                    item.el.dataset.cache = 'Cached';
                    if (magnetUrl) State.pageLinkCache.set(magnetUrl, 'cached');
                } else {
                    item.el.classList.add('uncached');
                    item.el.textContent = '\u{1F7E1} \u{1F9F2}';
                    item.el.dataset.cache = 'Uncached';
                    if (magnetUrl) State.pageLinkCache.set(magnetUrl, 'uncached');
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
