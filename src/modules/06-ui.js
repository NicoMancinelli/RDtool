// --- Step 2: UI Module ---
    const LIGHTNING_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>';

    const UI = {
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
            }

            // --- Step 3: Event delegation ---
            // Click delegation on container
            container.addEventListener('click', (e) => {
                // If FAB is showing (not expanded) and has API key, open dashboard
                if (!State.isExpanded && State.apiKey) {
                    const fab = container.querySelector('.rd-desktop-fab, .rd-mobile-fab');
                    if (fab && (fab === e.target || fab.contains(e.target))) {
                        UI.toggleDashboard(true);
                        return;
                    }
                }
            });

            // Global keydown
            document.addEventListener('keydown', (e) => {
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
            });

            // Visibility change — pause/resume torrent polling
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    if (State.torrentRefreshInterval) {
                        clearInterval(State.torrentRefreshInterval);
                        State.torrentRefreshInterval = null;
                    }
                } else {
                    if (State.isExpanded && State.currentTab === 'torrents' && typeof Tabs !== 'undefined' && Tabs.Torrents && Tabs.Torrents.startPolling) {
                        Tabs.Torrents.startPolling();
                    }
                }
            });

            // Drag and drop on container
            container.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                container.classList.add('rd-drag-active');
            });
            container.addEventListener('dragleave', (e) => {
                e.preventDefault();
                container.classList.remove('rd-drag-active');
            });
            container.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                container.classList.remove('rd-drag-active');

                // Check for .torrent files
                if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
                    for (const file of e.dataTransfer.files) {
                        if (file.name.endsWith('.torrent')) {
                            API.upload('/torrents/addTorrent', file).then(res => {
                                if (res.ok) {
                                    UI.showToast('Torrent uploaded: ' + file.name);
                                } else {
                                    UI.showToast('Upload failed: ' + (res.error || 'Unknown'), 'error');
                                }
                            });
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
            });
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
            const fab = DOM.create('div', { className: fabClass, style: 'position:relative;' }, [
                DOM.create('span', { htmlContent: LIGHTNING_SVG }),
                badge,
                queueBadge
            ]);

            container.appendChild(fab);

            // Auto-show logic
            const count = State.scannedLinksMap.size;
            if (count === 0 && State.settings.autoShow) {
                container.classList.add('rd-hidden');
            } else {
                container.classList.remove('rd-hidden');
            }

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
                    onClick: () => {
                        const key = input.value.trim();
                        if (key.length < 5) {
                            UI.showToast('Key too short', 'error');
                            return;
                        }
                        Config.saveKey(key);
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

        toggleDashboard(show) {
            const container = document.getElementById('rd-ui-container');
            if (!container) return;

            if (show) {
                State.isExpanded = true;
                // Reset container inline style in case setup changed it
                container.style.cssText = '';
                container.classList.remove('rd-hidden');
                const dashClass = State.isMobile ? 'rd-mobile-sheet' : 'rd-desktop-dash';
                container.className = dashClass;
                UI.renderDashboard();
                addMobileSheetBehavior(container);

                // Start torrent polling if on torrents tab
                if (State.currentTab === 'torrents' && typeof Tabs !== 'undefined' && Tabs.Torrents && Tabs.Torrents.startPolling) {
                    Tabs.Torrents.startPolling();
                }
            } else {
                State.isExpanded = false;
                container.className = '';
                container.style.cssText = '';

                // Stop torrent polling
                if (typeof Tabs !== 'undefined' && Tabs.Torrents && Tabs.Torrents.stopPolling) {
                    Tabs.Torrents.stopPolling();
                }

                UI.renderFAB();
                UI.updateBadge(State.scannedLinksMap.size);
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
                        textContent: 'v38.2',
                        style: 'background:var(--rd-bg-glass);padding:2px 8px;border-radius:10px;font-size:9px;color:var(--rd-text-secondary);border:1px solid var(--rd-glass-border);'
                    }),
                    DOM.create('span', {
                        textContent: State.sessionStats.processed + ' processed',
                        style: 'font-size:10px;color:var(--rd-text-secondary);margin-left:4px;',
                        id: 'rd-session-counter'
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
                DOM.create('span', {
                    textContent: '\u2715',
                    style: 'cursor:pointer;color:var(--rd-text-secondary);font-size:16px;padding:4px 8px;',
                    className: 'rd-close-btn',
                    onClick: () => UI.toggleDashboard(false)
                })
            ]);

            // Tabs
            const tabDefs = [
                { key: 'links', label: 'Links' },
                { key: 'page', label: 'Page', badge: true },
                { key: 'torrents', label: 'Torrents' },
                { key: 'cloud', label: 'Cloud' },
                { key: 'settings', label: 'Settings' }
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
                    onClick: () => {
                        // Stop torrent polling when leaving torrents tab
                        if (State.currentTab === 'torrents' && t.key !== 'torrents' && typeof Tabs !== 'undefined' && Tabs.Torrents && Tabs.Torrents.stopPolling) {
                            Tabs.Torrents.stopPolling();
                        }

                        State.currentTab = t.key;

                        // Update active class on all tabs
                        tabs.querySelectorAll('.rd-tab').forEach(tb => tb.classList.remove('active'));
                        tab.classList.add('active');

                        // Start torrent polling when entering torrents tab
                        if (t.key === 'torrents' && typeof Tabs !== 'undefined' && Tabs.Torrents && Tabs.Torrents.startPolling) {
                            Tabs.Torrents.startPolling();
                        }

                        // Render tab content
                        const capKey = t.key.charAt(0).toUpperCase() + t.key.slice(1);
                        if (typeof Tabs !== 'undefined' && Tabs[capKey] && Tabs[capKey].render) {
                            Tabs[capKey].render();
                        } else {
                            const content = document.getElementById('rd-content-area');
                            if (content) {
                                DOM.clear(content);
                                content.appendChild(DOM.create('div', {
                                    style: 'padding:40px;text-align:center;color:var(--rd-text-secondary);font-size:12px;',
                                    textContent: 'Tab "' + capKey + '" not loaded yet.'
                                }));
                            }
                        }
                    }
                }, tabChildren);
                tabs.appendChild(tab);
            });

            // Content area
            const contentArea = DOM.create('div', { className: 'rd-content', id: 'rd-content-area' });

            container.appendChild(header);
            container.appendChild(tabs);
            container.appendChild(contentArea);

            // Render current tab content
            const capKey = State.currentTab.charAt(0).toUpperCase() + State.currentTab.slice(1);
            if (typeof Tabs !== 'undefined' && Tabs[capKey] && Tabs[capKey].render) {
                Tabs[capKey].render();
            } else {
                contentArea.appendChild(DOM.create('div', {
                    style: 'padding:40px;text-align:center;color:var(--rd-text-secondary);font-size:12px;',
                    textContent: 'Tab "' + capKey + '" not loaded yet.'
                }));
            }
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

            // Auto-show FAB
            const container = document.getElementById('rd-ui-container');
            if (!State.isExpanded && container && State.settings.autoShow && count > 0) {
                container.classList.remove('rd-hidden');
            }
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
