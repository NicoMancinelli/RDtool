// --- Step 2: UI Module ---
    const LIGHTNING_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>';

    function isTypingInField(target) {
        if (!target || !target.tagName) return false;
        const tag = target.tagName.toUpperCase();
        return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
    }

    function formatShortcut(str) {
        return (str || '').split('+').map((part) => {
            const p = part.trim().toLowerCase();
            if (p === 'alt') return 'Alt';
            if (p === 'ctrl' || p === 'control') return 'Ctrl';
            if (p === 'shift') return 'Shift';
            if (p === 'meta' || p === 'cmd' || p === 'command') return 'Cmd';
            return p.length === 1 ? p.toUpperCase() : p.charAt(0).toUpperCase() + p.slice(1);
        }).join('+');
    }

    const UI = {
        // Listeners installed by init() and torn down by destroy(). Page-lifetime
        // for now (userscript runs in document context until navigation reload),
        // but we keep refs so future hot-reload or SPA-unmount paths can release
        // them without re-grepping the file.
        _globalKeydownHandler: null,
        _visibilityChangeHandler: null,
        _containerListeners: [],

        destroy() {
            // Releases every listener installed by init(). Currently unused at
            // runtime (Tampermonkey page lifecycle owns disposal), but exposed so
            // future HMR / SPA route-switch paths can call it without leaving
            // orphaned listeners — see HER-117.
            if (this._globalKeydownHandler) {
                document.removeEventListener('keydown', this._globalKeydownHandler);
                this._globalKeydownHandler = null;
            }
            if (this._visibilityChangeHandler) {
                document.removeEventListener('visibilitychange', this._visibilityChangeHandler);
                this._visibilityChangeHandler = null;
            }
            this._containerListeners.forEach(({ target, type, handler, options }) => {
                target.removeEventListener(type, handler, options);
            });
            this._containerListeners = [];
        },

        // Registers a listener on a DOM target and remembers the (target, type,
        // handler, options) tuple so destroy() can remove it later. Use this for
        // any listener installed by init() that isn't on document.
        _trackContainerListener(target, type, handler, options) {
            target.addEventListener(type, handler, options);
            this._containerListeners.push({ target, type, handler, options });
        },

        init() {
            // Main container
            const container = DOM.create('div', { id: 'rd-ui-container' });
            document.body.appendChild(container);

            // Toast container
            const toastContainer = DOM.create('div', { id: 'rd-toast-container' });
            document.body.appendChild(toastContainer);

            // Selection tooltip
            const selTooltip = DOM.create('div', { id: 'rd-sel-tooltip', textContent: 'Process Link' });
            document.body.appendChild(selTooltip);

            // X-ray tooltip
            const xrayTooltip = DOM.create('div', { id: 'rd-xray-tooltip' });
            document.body.appendChild(xrayTooltip);

            if (!State.apiKey) {
                UI.renderSetup();
            } else {
                UI.renderFAB();
                if (State.settings.rememberDashboardOpen && GM_getValue('rd_dashboard_open', false)) {
                    UI.toggleDashboard(true);
                }
            }

            // --- Step 3: Event delegation ---
            // HER-117: every listener installed here is registered through the
            // _trackContainerListener / named-handler helpers so UI.destroy()
            // can release them without re-grepping the source.

            const onContainerClick = (e) => {
                // If FAB is showing (not expanded) and has API key, open dashboard
                if (!State.isExpanded && State.apiKey) {
                    const fab = container.querySelector('.rd-desktop-fab, .rd-mobile-fab');
                    if (fab && (fab === e.target || fab.contains(e.target))) {
                        UI.toggleDashboard(true);
                        return;
                    }
                }
            };
            UI._trackContainerListener(container, 'click', onContainerClick);

            // Global keydown — page-lifetime listener. Ref is kept on UI so
            // destroy() can remove it if a future hot-reload or SPA-unmount
            // path ever needs to. Single registration: UI.init() is called once
            // per script load.
            UI._globalKeydownHandler = (e) => {
                if (e.key === 'Escape') {
                    // Cascade: modal -> fullscreen -> media -> dashboard
                    const modal = document.querySelector('.rd-modal-overlay');
                    if (modal) { modal.remove(); return; }
                    const fullscreen = document.querySelector('#rd-media-window.rd-fullscreen');
                    if (fullscreen) { fullscreen.classList.remove('rd-fullscreen'); return; }
                    const media = document.querySelector('#rd-media-window');
                    if (media) { media.remove(); return; }
                    if (State.isExpanded) { UI.toggleDashboard(false); return; }
                }
                if (Config.matchesShortcut(e, State.settings.toggleShortcut)) {
                    e.preventDefault();
                    UI.toggleDashboard(!State.isExpanded);
                }
                if (State.isExpanded && e.key === '?' && !isTypingInField(e.target)) {
                    e.preventDefault();
                    UI.showShortcutsModal();
                }
            };
            document.addEventListener('keydown', UI._globalKeydownHandler);

            // Visibility change — pause/resume torrent polling
            UI._visibilityChangeHandler = () => {
                if (document.hidden) {
                    if (State.torrentRefreshInterval) {
                        clearInterval(State.torrentRefreshInterval);
                        State.torrentRefreshInterval = null;
                    }
                } else {
                    if (State.isExpanded && State.currentTab === Config.TAB_KEYS.TORRENTS && Tabs.Torrents && Tabs.Torrents.startPolling) {
                        Tabs.Torrents.startPolling();
                    }
                }
            };
            document.addEventListener('visibilitychange', UI._visibilityChangeHandler);

            // Drag and drop on container
            const onDragOver = (e) => {
                e.preventDefault();
                e.stopPropagation();
                container.classList.add('rd-drag-active');
            };
            const onDragLeave = (e) => {
                e.preventDefault();
                container.classList.remove('rd-drag-active');
            };
            const onDrop = (e) => {
                e.preventDefault();
                e.stopPropagation();
                container.classList.remove('rd-drag-active');

                // Check for .torrent files
                if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
                    for (const file of e.dataTransfer.files) {
                        if (file.name.endsWith('.torrent')) {
                            uploadTorrentFile(file);
                        }
                    }
                    return;
                }

                // Check for text data (links)
                const text = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text');
                if (text && typeof handleManualInput === 'function') {
                    handleManualInput(text);
                } else if (text) {
                    UI.showToast('Dropped text received (handler not ready)');
                }
            };
            UI._trackContainerListener(container, 'dragover', onDragOver);
            UI._trackContainerListener(container, 'dragleave', onDragLeave);
            UI._trackContainerListener(container, 'drop', onDrop);
        },

        renderFAB() {
            const container = document.getElementById('rd-ui-container');
            if (!container) return;
            DOM.clear(container);

            const fabClass = State.isMobile ? 'rd-mobile-fab' : 'rd-desktop-fab';
            const badge = DOM.create('span', { className: 'rd-badge', id: 'rd-fab-badge', textContent: '0' });
            const queueBadge = DOM.create('span', {
                className: 'rd-badge rd-queue-badge',
                id: 'rd-fab-queue-badge',
                textContent: ''
            });
            const fabAttrs = { className: fabClass, style: 'position:relative;' };
            if (!State.isMobile) {
                fabAttrs.title = 'RD Suite (' + formatShortcut(State.settings.toggleShortcut) + ')';
            }
            const fab = DOM.create('div', fabAttrs, [
                DOM.create('span', { htmlContent: LIGHTNING_SVG }),
                badge,
                queueBadge
            ]);

            container.appendChild(fab);

            const count = State.scannedLinksMap.size;
            UI.updateFabVisibility();
            UI.updateBadge(count);
            if (State.queueProcessing) UI.updateQueueProgress(State.queueCompleted, State.queueTotal);
        },

        renderSetup() {
            const container = document.getElementById('rd-ui-container');
            if (!container) return;
            DOM.clear(container);

            // Position container center
            container.style.cssText = 'position:fixed;z-index:999999;top:50%;left:50%;transform:translate(-50%,-50%);';

            const input = DOM.create('input', {
                type: 'text',
                placeholder: 'Paste your API key here...',
                className: 'rd-textarea',
                style: 'height:auto;padding:10px;font-family:monospace;font-size:13px;'
            });

            const card = DOM.create('div', {
                style: 'background:var(--rd-bg-base);border:1px solid var(--rd-glass-border);border-radius:var(--rd-radius-lg);padding:24px;width:340px;display:flex;flex-direction:column;gap:14px;box-shadow:var(--rd-shadow);'
            }, [
                DOM.create('div', { style: 'font-size:16px;font-weight:bold;color:var(--rd-text-primary);', textContent: 'Setup Required' }),
                DOM.create('div', { style: 'font-size:12px;color:var(--rd-text-secondary);line-height:1.5;', textContent: 'Enter your Real-Debrid API key to get started.' }),
                input,
                DOM.create('button', {
                    className: 'rd-input-btn primary',
                    textContent: 'Save Key',
                    style: 'padding:10px;font-size:13px;',
                    onClick: async () => {
                        const key = input.value.trim();
                        if (key.length < 5) {
                            UI.showToast('Key too short', 'error');
                            return;
                        }
                        const prevKey = State.apiKey;
                        Config.saveKey(key);
                        const userRes = await API.get('/user');
                        if (!userRes.ok) {
                            Config.clearKey();
                            if (prevKey) Config.saveKey(prevKey);
                            UI.showToast('Invalid API key — check and try again', 'error');
                            return;
                        }
                        UI.showToast('API key saved! Reloading...');
                        setTimeout(() => location.reload(), 800);
                    }
                }),
                DOM.create('a', {
                    href: 'https://real-debrid.com/apitoken',
                    target: '_blank',
                    style: 'color:var(--rd-accent);font-size:11px;text-align:center;text-decoration:none;',
                    textContent: 'Get Token Here'
                })
            ]);

            container.appendChild(card);
        },

        switchTab(key) {
            const valid = Object.values(Config.TAB_KEYS);
            if (!valid.includes(key)) return;

            if (State.currentTab === Config.TAB_KEYS.TORRENTS && key !== Config.TAB_KEYS.TORRENTS && Tabs.Torrents && Tabs.Torrents.stopPolling) {
                Tabs.Torrents.stopPolling();
            }

            State.currentTab = key;
            if (State.settings.rememberLastTab) GM_setValue('rd_last_tab', key);

            const tabsEl = document.querySelector('.rd-tabs');
            if (tabsEl) {
                tabsEl.querySelectorAll('.rd-tab').forEach(tb => {
                    tb.classList.toggle('active', tb.dataset.tab === key);
                });
            }

            if (key === Config.TAB_KEYS.TORRENTS && Tabs.Torrents && Tabs.Torrents.startPolling) {
                Tabs.Torrents.startPolling();
            }

            const capKey = key.charAt(0).toUpperCase() + key.slice(1);
            if (Tabs[capKey] && Tabs[capKey].render) {
                Tabs[capKey].render();
            }
        },

        openTab(key, after) {
            if (!State.isExpanded) {
                State.currentTab = key;
                this.toggleDashboard(true);
            } else if (State.currentTab !== key) {
                this.switchTab(key);
            }
            if (after) after();
        },

        toggleDashboard(show) {
            const container = document.getElementById('rd-ui-container');
            if (!container) return;

            if (show) {
                State.isExpanded = true;
                if (typeof Scanner !== 'undefined' && Scanner.removePageActionBar) Scanner.removePageActionBar();
                if (State.settings.rememberDashboardOpen) GM_setValue('rd_dashboard_open', true);
                if (State.settings.rememberLastTab) {
                    const lastTab = GM_getValue('rd_last_tab', Config.TAB_KEYS.LINKS);
                    if (Object.values(Config.TAB_KEYS).includes(lastTab)) {
                        State.currentTab = lastTab;
                    }
                }
                // Reset container inline style in case setup changed it
                container.style.cssText = '';
                container.classList.remove('rd-hidden');
                const dashClass = State.isMobile ? 'rd-mobile-sheet' : 'rd-desktop-dash';
                container.className = dashClass;
                UI.renderDashboard();
                addMobileSheetBehavior(container);

                // Start torrent polling if on torrents tab
                if (State.currentTab === Config.TAB_KEYS.TORRENTS && Tabs.Torrents && Tabs.Torrents.startPolling) {
                    Tabs.Torrents.startPolling();
                }
            } else {
                State.isExpanded = false;
                if (State.settings.rememberDashboardOpen) GM_setValue('rd_dashboard_open', false);
                container.className = '';
                container.style.cssText = '';

                // Stop torrent polling
                if (Tabs.Torrents && Tabs.Torrents.stopPolling) {
                    Tabs.Torrents.stopPolling();
                }

                UI.renderFAB();
                UI.updateBadge(State.scannedLinksMap.size);
                if (typeof Scanner !== 'undefined' && Scanner._updatePageActionBar) Scanner._updatePageActionBar();
            }
        },

        renderDashboard() {
            const container = document.getElementById('rd-ui-container');
            if (!container) return;
            DOM.clear(container);

            // Header
            const header = DOM.create('div', { className: 'rd-header' }, [
                DOM.create('div', { style: 'display:flex;align-items:center;gap:8px;' }, [
                    DOM.create('span', { htmlContent: LIGHTNING_SVG, style: 'display:flex;color:var(--rd-accent);' }),
                    DOM.create('span', { textContent: 'RD Suite', style: 'font-weight:bold;font-size:14px;color:var(--rd-text-primary);' }),
                    DOM.create('span', {
                        id: 'rd-version-badge',
                        textContent: 'v' + Config.VERSION + (State.updateInfo.updateAvailable ? ' ↑' : ''),
                        title: State.updateInfo.updateAvailable && State.updateInfo.latest
                            ? 'v' + State.updateInfo.latest + ' available — open Settings to update'
                            : '',
                        style: 'background:var(--rd-bg-glass);padding:2px 8px;border-radius:10px;font-size:9px;color:' +
                            (State.updateInfo.updateAvailable ? 'var(--rd-warning)' : 'var(--rd-text-secondary)') +
                            ';border:1px solid var(--rd-glass-border);'
                    }),
                    DOM.create('span', {
                        textContent: State.sessionStats.processed + ' processed',
                        style: 'font-size:10px;color:var(--rd-text-secondary);margin-left:4px;',
                        id: 'rd-session-counter'
                    }),
                    DOM.create('span', {
                        id: 'rd-header-quota',
                        style: 'font-size:9px;color:var(--rd-accent);background:var(--rd-bg-glass);padding:2px 8px;border-radius:10px;border:1px solid var(--rd-glass-border);',
                        textContent: ''
                    }),
                    DOM.create('span', {
                        id: 'rd-queue-progress',
                        className: 'rd-queue-status',
                        style: State.queueProcessing ? '' : 'display:none;',
                        textContent: State.queueProcessing ? 'Processing ' + State.queueCompleted + '/' + State.queueTotal + '...' : ''
                    }),
                    DOM.create('button', {
                        id: 'rd-queue-cancel',
                        className: 'rd-input-btn',
                        textContent: 'Cancel',
                        style: State.queueProcessing ? 'margin:0;padding:2px 8px;font-size:10px;' : 'display:none;',
                        onClick: () => {
                            State.queueCancel = true;
                            UI.showToast('Cancelling queue...');
                        }
                    })
                ]),
                DOM.create('div', { style: 'display:flex;align-items:center;gap:4px;' }, [
                    DOM.create('button', {
                        className: 'rd-input-btn',
                        textContent: '?',
                        title: 'Keyboard shortcuts',
                        style: 'margin:0;padding:2px 8px;font-size:12px;min-width:28px;',
                        onClick: () => UI.showShortcutsModal()
                    }),
                    DOM.create('span', {
                        textContent: '\u2715',
                        style: 'cursor:pointer;color:var(--rd-text-secondary);font-size:16px;padding:4px 8px;',
                        className: 'rd-close-btn',
                        onClick: () => UI.toggleDashboard(false)
                    })
                ])
            ]);

            // Tabs
            const tabDefs = [
                { key: Config.TAB_KEYS.LINKS, label: 'Links' },
                { key: Config.TAB_KEYS.PAGE, label: 'Page', badge: true },
                { key: Config.TAB_KEYS.TORRENTS, label: 'Torrents' },
                { key: Config.TAB_KEYS.CLOUD, label: 'Cloud' },
                { key: Config.TAB_KEYS.SETTINGS, label: 'Settings' }
            ];

            const tabs = DOM.create('div', { className: 'rd-tabs' });
            tabDefs.forEach(t => {
                const tabChildren = [DOM.text(t.label)];
                if (t.badge) {
                    const count = State.scannedLinksMap.size;
                    tabChildren.push(DOM.create('span', {
                        id: 'rd-tab-badge-' + t.key,
                        textContent: count > 0 ? ' (' + count + ')' : '',
                        style: 'color:var(--rd-accent);font-size:10px;'
                    }));
                }
                const tab = DOM.create('div', {
                    className: 'rd-tab' + (State.currentTab === t.key ? ' active' : ''),
                    dataset: { tab: t.key },
                    onClick: () => UI.switchTab(t.key)
                }, tabChildren);
                tabs.appendChild(tab);
            });

            // Content area
            const contentArea = DOM.create('div', { className: 'rd-content', id: 'rd-content-area' });

            container.appendChild(header);
            container.appendChild(tabs);
            container.appendChild(contentArea);

            UI.fetchAccountSummary();
            UI.updateHeaderQuota();

            const capKey = State.currentTab.charAt(0).toUpperCase() + State.currentTab.slice(1);
            if (Tabs[capKey] && Tabs[capKey].render) {
                Tabs[capKey].render();
            } else {
                contentArea.appendChild(DOM.create('div', {
                    style: 'padding:40px;text-align:center;color:var(--rd-text-secondary);font-size:12px;',
                    textContent: 'Tab "' + capKey + '" not loaded yet.'
                }));
            }
        },

        async fetchAccountSummary() {
            if (!State.apiKey) return;
            const userRes = await API.get('/user');
            if (userRes.ok) State.userProfile = userRes.data;
            const trafficRes = await API.get('/traffic');
            if (trafficRes.ok) State.trafficData = trafficRes.data;
            const countRes = await API.getTorrentsActiveCount();
            if (countRes.ok && typeof countRes.data === 'number') State.activeTorrentCount = countRes.data;
            UI.updateHeaderQuota();
        },

        updateHeaderQuota() {
            const el = document.getElementById('rd-header-quota');
            if (!el) return;
            const parts = [];
            if (State.userProfile && State.userProfile.expiration) {
                const daysLeft = Math.max(0, Math.ceil((new Date(State.userProfile.expiration) - new Date()) / 86400000));
                parts.push(daysLeft + 'd left');
            }
            if (State.trafficData) {
                const quotas = Object.entries(State.trafficData).filter(([, d]) => d.limit && d.limit > 0);
                if (quotas.length) {
                    const [, d] = quotas[0];
                    const pct = Math.round(((d.limit - d.left) / d.limit) * 100);
                    parts.push('Quota ' + pct + '%');
                    if (pct >= 90) UI.showToast('Daily quota almost exhausted', 'error');
                }
            }
            if (typeof State.activeTorrentCount === 'number') {
                parts.push(State.activeTorrentCount + ' active');
            }
            el.textContent = parts.join(' · ');
            el.style.display = parts.length ? '' : 'none';
        },

        showToast(msg, type = 'info') {
            const toastContainer = document.getElementById('rd-toast-container');
            if (!toastContainer) return;

            const toast = DOM.create('div', {
                className: 'rd-toast' + (type === 'error' ? ' error' : ''),
                textContent: msg
            });
            toastContainer.appendChild(toast);

            setTimeout(() => {
                toast.style.animation = 'toastOut 0.3s ease forwards';
                setTimeout(() => {
                    if (toast.parentNode) toast.parentNode.removeChild(toast);
                }, 300);
            }, 3000);
        },

        // System notification + optional chime. Wraps GM_notification so callers don't repeat the pattern.
        notify(title, text, timeout = 4000) {
            try { GM_notification({ title, text, timeout }); } catch (_) { /* GM_notification may be disabled */ }
            if (State.settings.notificationSound && typeof playNotificationChime === 'function') playNotificationChime();
        },

        showShortcutsModal() {
            if (document.querySelector('.rd-modal-overlay')) return;

            const shortcutRow = (keys, desc) => DOM.create('div', {
                style: 'display:flex;justify-content:space-between;gap:16px;padding:6px 0;border-bottom:1px solid var(--rd-glass-border);font-size:12px;'
            }, [
                DOM.create('span', { textContent: keys, style: 'color:var(--rd-text-primary);font-family:monospace;white-space:nowrap;' }),
                DOM.create('span', { textContent: desc, style: 'color:var(--rd-text-secondary);text-align:right;' })
            ]);

            const section = (title, rows) => {
                const wrap = DOM.create('div', { style: 'margin-bottom:12px;' });
                wrap.appendChild(DOM.create('div', {
                    textContent: title,
                    style: 'font-size:11px;font-weight:bold;color:var(--rd-text-secondary);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;'
                }));
                rows.forEach((row) => wrap.appendChild(row));
                return wrap;
            };

            const content = DOM.create('div', { style: 'display:flex;flex-direction:column;' }, [
                section('General', [
                    shortcutRow(formatShortcut(State.settings.toggleShortcut), 'Toggle dashboard'),
                    shortcutRow('Esc', 'Close (modal \u2192 fullscreen \u2192 media \u2192 dashboard)'),
                    shortcutRow('?', 'Show this help')
                ]),
                section('Links', [
                    shortcutRow('Ctrl+Enter / Cmd+Enter', 'Unrestrict')
                ]),
                section('Media player', [
                    shortcutRow('Space', 'Play / pause'),
                    shortcutRow('\u2190 / \u2192', 'Seek \u00b110s'),
                    shortcutRow('\u2191 / \u2193', 'Volume \u00b110%'),
                    shortcutRow('F', 'Toggle fullscreen'),
                    shortcutRow('P', 'Picture-in-picture'),
                    shortcutRow('M', 'Mute'),
                    shortcutRow('Esc', 'Exit fullscreen or close player')
                ])
            ]);

            let modalRef;
            const closeBtn = DOM.create('button', {
                className: 'rd-input-btn',
                textContent: 'Close',
                style: 'margin:0;',
                onClick: () => modalRef && modalRef.close()
            });
            modalRef = UI.showModal('Keyboard Shortcuts', [content], [closeBtn]);
        },

        showModal(title, contentElements, footerElements) {
            const closeBtn = DOM.create('span', {
                textContent: '\u2715',
                style: 'cursor:pointer;color:var(--rd-text-secondary);font-size:16px;padding:4px;'
            });

            const modalHeader = DOM.create('div', { className: 'rd-modal-header' }, [
                DOM.create('span', { textContent: title }),
                closeBtn
            ]);

            const modalContent = DOM.create('div', { className: 'rd-modal-content' }, contentElements || []);
            const modalFooter = DOM.create('div', { className: 'rd-modal-footer' }, footerElements || []);

            const modal = DOM.create('div', { className: 'rd-modal' }, [
                modalHeader,
                modalContent,
                modalFooter
            ]);

            const overlay = DOM.create('div', { className: 'rd-modal-overlay' }, [modal]);

            function close() {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                document.removeEventListener('keydown', escHandler);
            }

            function escHandler(e) {
                if (e.key === 'Escape') {
                    close();
                }
            }

            closeBtn.addEventListener('click', close);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close();
            });
            document.addEventListener('keydown', escHandler);

            document.body.appendChild(overlay);

            return { overlay, modal, close };
        },

        updateFabVisibility() {
            const container = document.getElementById('rd-ui-container');
            if (!container || !State.apiKey || State.isExpanded) return;
            if (document.getElementById('rd-page-action-bar')) {
                container.classList.add('rd-hidden');
                return;
            }
            const show = typeof Scanner !== 'undefined'
                && Scanner.hasPageActionableContent
                && Scanner.hasPageActionableContent();
            container.classList.toggle('rd-hidden', !show);
        },

        updateBadge(count) {
            // FAB badge
            const fabBadge = document.getElementById('rd-fab-badge');
            if (fabBadge) {
                fabBadge.textContent = count > 99 ? '99+' : String(count);
                fabBadge.classList.toggle('visible', count > 0);
            }

            // Tab badge (Page tab)
            const tabBadge = document.getElementById('rd-tab-badge-page');
            if (tabBadge) {
                tabBadge.textContent = count > 0 ? ' (' + count + ')' : '';
            }

            UI.updateFabVisibility();
        },

        setQueueActive(active) {
            const progEl = document.getElementById('rd-queue-progress');
            const cancelBtn = document.getElementById('rd-queue-cancel');
            const queueBadge = document.getElementById('rd-fab-queue-badge');
            if (progEl) progEl.style.display = active ? '' : 'none';
            if (cancelBtn) cancelBtn.style.display = active ? '' : 'none';
            if (queueBadge) queueBadge.classList.toggle('visible', active);
            if (!active && queueBadge) queueBadge.textContent = '';
        },

        updateQueueProgress(completed, total) {
            const label = 'Processing ' + completed + '/' + total + '...';
            const progEl = document.getElementById('rd-queue-progress');
            if (progEl) {
                progEl.textContent = label;
                progEl.style.display = '';
            }
            const cancelBtn = document.getElementById('rd-queue-cancel');
            if (cancelBtn) cancelBtn.style.display = '';
            const queueBadge = document.getElementById('rd-fab-queue-badge');
            if (queueBadge) {
                queueBadge.textContent = completed + '/' + total;
                queueBadge.classList.add('visible');
            }
        },

        copyToClipboard(text, btnElement) {
            const doCopy = () => {
                if (btnElement) {
                    const original = btnElement.textContent;
                    btnElement.textContent = '\u2714';
                    setTimeout(() => { btnElement.textContent = original; }, 1500);
                } else {
                    UI.showToast('Copied');
                }
            };

            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(doCopy).catch(() => {
                        GM_setClipboard(text);
                        doCopy();
                    });
                } else {
                    GM_setClipboard(text);
                    doCopy();
                }
            } catch(e) {
                GM_setClipboard(text);
                doCopy();
            }
        }
    };
