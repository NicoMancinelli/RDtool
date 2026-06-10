// ===================== Tabs (Links + Page) =====================

    const Tabs = {};

    Tabs.Links = {
        render() {
            const area = document.getElementById('rd-content-area');
            if (!area) return;
            DOM.clear(area);

            // Input area
            const inputArea = DOM.create('div', { className: 'rd-input-area' });
            const textarea = DOM.create('textarea', {
                id: 'rd-manual-input', className: 'rd-textarea',
                placeholder: 'Paste links, folders, magnets, or Base64...'
            });
            const btnRow = DOM.create('div', { style: 'display:flex; gap:8px; margin-top:8px;' });
            const unrestrictBtn = DOM.create('button', {
                id: 'rd-btn-unrestrict', className: 'rd-input-btn primary',
                textContent: 'Unrestrict', style: 'flex:2;',
                onClick: () => handleManualInput()
            });
            const clearBtn = DOM.create('button', {
                id: 'rd-btn-clear', className: 'rd-input-btn',
                textContent: 'Clear', style: 'flex:1;',
                onClick: () => { State.linkHistory = []; GM_setValue('rd_link_history', '[]'); Tabs.Links.render(); UI.showToast('History Cleared'); }
            });
            btnRow.append(unrestrictBtn, clearBtn);

            // Export controls
            const exportRow = DOM.create('div', { style: 'display:flex; justify-content:flex-end; gap:8px; align-items:center; margin-top:8px;' });
            exportRow.append(buildExportControls('local'));
            exportRow.append(DOM.create('button', {
                className: 'rd-input-btn', textContent: 'Export JSON', style: 'margin:0;',
                onClick: () => exportHistoryJson()
            }));

            inputArea.append(textarea, btnRow, exportRow);

            // History list
            const logList = DOM.create('div', { className: 'rd-log-list', id: 'rd-links-history' });
            this._renderHistory(logList);

            area.append(inputArea, logList);
        },

        refresh() {
            const logList = document.getElementById('rd-links-history');
            if (logList) this._renderHistory(logList);
        },

        _renderHistory(container) {
            DOM.clear(container);
            if (State.linkHistory.length === 0) {
                container.append(DOM.create('div', {
                    style: 'text-align:center; padding:30px 16px; color:var(--rd-text-secondary);',
                    textContent: 'No history. Paste links below or drag & drop.'
                }));
                return;
            }
            // Render in reverse chronological order
            for (let i = State.linkHistory.length - 1; i >= 0; i--) {
                const item = State.linkHistory[i];
                container.append(this._buildHistoryItem(item));
            }
        },

        _buildHistoryItem(item) {
            if (item.type === 'error') {
                const errEl = DOM.create('div', { className: 'rd-log-item error' }, [
                    DOM.create('div', { className: 'rd-item-content' }, [
                        DOM.create('div', { className: 'rd-filename', style: 'color:var(--rd-danger);', textContent: item.msg || 'Error' }),
                        DOM.create('div', { className: 'rd-meta', textContent: item.time || '' })
                    ])
                ]);
                return errEl;
            }
            const isMedia = /\.(mp4|mkv|avi|mov|mp3|flac|wav|jpg|png|webp)$/i.test(item.name || '');
            const btns = [
                DOM.create('button', { className: 'rd-action-btn', textContent: 'DL', onClick: () => window.open(item.url, '_blank') }),
                DOM.create('button', { className: 'rd-action-btn rd-copy-btn', textContent: 'URL', dataset: { url: item.url }, onClick: () => UI.copyToClipboard(item.url) })
            ];
            if (isMedia) {
                btns.push(DOM.create('button', {
                    className: 'rd-action-btn rd-play-btn', textContent: 'Play',
                    dataset: { url: item.download || item.url, name: item.name },
                    onClick: () => {
                        if (State.settings.extPlayer === 'browser' && typeof Media !== 'undefined') Media.open(item.download || item.url, item.name);
                        else window.open(getStreamUrl(item.download || item.url), '_self');
                    }
                }));
            }
            const row = DOM.create('div', { className: 'rd-log-item success' }, [
                DOM.create('div', { className: 'rd-item-content' }, [
                    DOM.create('div', { className: 'rd-filename', title: item.name, textContent: item.name || 'Unknown' }),
                    DOM.create('div', { className: 'rd-meta' }, [
                        DOM.create('span', { textContent: item.size || '' }),
                        DOM.create('span', { textContent: item.time || '' })
                    ]),
                    DOM.create('div', { className: 'rd-btn-group' }, btns)
                ])
            ]);
            if (item.url && item.url !== '#') {
                addMobileLongPress(row, [
                    { label: 'Copy URL', action: () => UI.copyToClipboard(item.url) },
                    { label: 'Download', action: () => window.open(item.url, '_blank') }
                ]);
            }
            return row;
        }
    };

    function buildExportControls(scope) {
        const wrapper = DOM.create('div', { style: 'display:flex; gap:6px; align-items:center;' });
        const select = DOM.create('select', { id: 'rd-export-format-' + scope, className: 'rd-select', style: 'padding:5px 8px;' });
        ['raw:Plain Text', 'curl:cURL', 'wget:Wget'].forEach(opt => {
            const [val, label] = opt.split(':');
            const option = DOM.create('option', { value: val, textContent: label });
            if (State.settings.exportFormat === val) option.selected = true;
            select.append(option);
        });
        select.addEventListener('change', () => { State.settings.exportFormat = select.value; saveSettings(); });
        const exportBtn = DOM.create('button', {
            className: 'rd-input-btn primary', textContent: 'Export', style: 'margin:0;',
            onClick: () => formatExport(getExportUrls(scope))
        });
        wrapper.append(select, exportBtn);
        return wrapper;
    }

    Tabs.Page = {
        render() {
            const area = document.getElementById('rd-content-area');
            if (!area) return;
            DOM.clear(area);

            if (State.scannedLinksMap.size === 0) {
                area.append(DOM.create('div', {
                    style: 'text-align:center; padding:30px 16px; color:var(--rd-text-secondary);',
                    textContent: 'No supported links detected on this page.'
                }));
                return;
            }

            // Control bar
            const controlBar = DOM.create('div', { className: 'rd-control-bar' });
            const leftGroup = DOM.create('div', { className: 'rd-control-group' });

            const selectAllLabel = DOM.create('label', { style: 'display:flex; align-items:center; gap:5px; font-size:12px; cursor:pointer; font-weight:600;' });
            const selectAllChk = DOM.create('input', { type: 'checkbox', id: 'rd-page-chk-all', className: 'rd-checkbox' });
            selectAllChk.checked = true;
            selectAllChk.addEventListener('change', () => { document.querySelectorAll('.rd-page-chk').forEach(c => c.checked = selectAllChk.checked); });
            selectAllLabel.append(selectAllChk, DOM.text('All'));

            const dlSelBtn = DOM.create('button', {
                className: 'rd-input-btn primary', textContent: 'DL Selected', style: 'margin:0;',
                onClick: () => {
                    const sel = Array.from(document.querySelectorAll('.rd-page-chk:checked')).map(c => c.value);
                    if (!sel.length) return UI.showToast('None selected!', 'error');
                    UI.showToast('Starting ' + sel.length + ' downloads...');
                    processQueue(sel, 'dl');
                }
            });
            const queueStatus = DOM.create('span', {
                id: 'rd-page-queue-status',
                className: 'rd-queue-status',
                style: 'font-size:11px;color:var(--rd-accent);font-weight:600;display:none;'
            });
            const queueBtn = DOM.create('button', {
                className: 'rd-input-btn', textContent: 'Queue', style: 'margin:0; background:var(--rd-accent); color:var(--rd-bg-base); border:none;',
                onClick: () => {
                    const sel = Array.from(document.querySelectorAll('.rd-page-chk:checked')).map(c => c.value);
                    if (!sel.length) return UI.showToast('None selected!', 'error');
                    queueStatus.textContent = sel.length + ' queued';
                    queueStatus.style.display = '';
                    queueBtn.textContent = 'Queued ' + sel.length;
                    UI.showToast('Queued ' + sel.length + ' items');
                    State.currentTab = 'links';
                    UI.renderDashboard();
                    processQueue(sel, 'queue');
                }
            });

            leftGroup.append(selectAllLabel, dlSelBtn, queueBtn, queueStatus);
            controlBar.append(leftGroup, buildExportControls('page'));

            // Group links by domain
            const groups = new Map();
            for (const [url, data] of State.scannedLinksMap.entries()) {
                let domain;
                try { domain = data.type === 'magnet' ? 'Magnets' : new URL(url).hostname.replace('www.', ''); } catch(e) { domain = 'Other'; }
                if (!groups.has(domain)) groups.set(domain, []);
                groups.get(domain).push({ url, ...data });
            }

            const logList = DOM.create('div', { className: 'rd-log-list' });
            for (const [domain, links] of groups.entries()) {
                // Domain header (collapsible)
                const groupHeader = DOM.create('div', {
                    style: 'display:flex; align-items:center; gap:8px; padding:6px 0; cursor:pointer; font-weight:600; font-size:11px; color:var(--rd-text-secondary);',
                });
                const groupChk = DOM.create('input', { type: 'checkbox', className: 'rd-checkbox' });
                groupChk.checked = true;
                const groupLabel = DOM.create('span', { textContent: domain + ' (' + links.length + ')' });
                const groupContent = DOM.create('div', { style: 'display:flex; flex-direction:column; gap:6px;' });

                groupChk.addEventListener('change', () => {
                    groupContent.querySelectorAll('.rd-page-chk').forEach(c => c.checked = groupChk.checked);
                });
                groupHeader.addEventListener('click', (e) => {
                    if (e.target === groupChk) return;
                    groupContent.style.display = groupContent.style.display === 'none' ? 'flex' : 'none';
                });
                groupHeader.append(groupChk, groupLabel);

                // Links in group
                for (const link of links) {
                    const icon = link.type === 'magnet' ? '\u{1F9F2}' : '\u{1F517}'; // magnet or link emoji
                    const chk = DOM.create('input', { type: 'checkbox', className: 'rd-page-chk rd-checkbox', value: link.url });
                    chk.checked = true;

                    const oneClickBtn = DOM.create('button', {
                        className: 'rd-action-btn rd-page-1click', textContent: '1-Click',
                        dataset: { url: link.url },
                        style: 'background:var(--rd-success); color:var(--rd-bg-base);',
                        onClick: async function() {
                            if (this.disabled) return;
                            this.disabled = true;
                            this.textContent = '...';
                            if (link.url.startsWith('magnet:')) {
                                await addMagnet(link.url);
                                this.textContent = '\u2705';
                            } else {
                                await unrestrictLinkOrFolder(link.url, true, null, (finalUrl) => {
                                    this.dataset.dlUrl = finalUrl;
                                    if (finalUrl) window.open(finalUrl, '_blank');
                                    this.textContent = '\u2705';
                                });
                            }
                        }
                    });
                    const queueItemBtn = DOM.create('button', {
                        className: 'rd-action-btn rd-page-unrestrict', textContent: 'Queue',
                        dataset: { url: link.url },
                        onClick: () => {
                            State.currentTab = 'links';
                            UI.renderDashboard();
                            if (link.url.startsWith('magnet:')) addMagnet(link.url);
                            else unrestrictLinkOrFolder(link.url);
                        }
                    });

                    const item = DOM.create('div', { className: 'rd-log-item' }, [
                        chk,
                        DOM.create('div', { className: 'rd-item-content' }, [
                            DOM.create('div', { className: 'rd-filename', title: link.url, textContent: icon + ' ' + link.text }),
                            DOM.create('div', { style: 'font-size:10px; color:var(--rd-text-secondary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;', textContent: link.url }),
                            DOM.create('div', { className: 'rd-btn-group' }, [oneClickBtn, queueItemBtn])
                        ])
                    ]);
                    groupContent.append(item);
                }

                logList.append(groupHeader, groupContent);
            }

            area.append(controlBar, logList);
        },

        refresh() {
            this.render(); // Page tab always fully rebuilds
        }
    };

    Tabs.Torrents = {
        _pollingInterval: null,

        render() {
            const area = document.getElementById('rd-content-area');
            if (!area) return;
            DOM.clear(area);

            // Control bar
            const controlBar = DOM.create('div', { className: 'rd-control-bar', style: 'flex-direction:column; align-items:stretch;' });
            const topRow = DOM.create('div', { style: 'display:flex; justify-content:space-between; align-items:center; width:100%;' });

            const leftGroup = DOM.create('div', { className: 'rd-control-group' });
            const selectAllLabel = DOM.create('label', { style: 'display:flex; align-items:center; gap:5px; font-size:12px; cursor:pointer; font-weight:600;' });
            const selectAllChk = DOM.create('input', { type: 'checkbox', id: 'rd-torrent-chk-all', className: 'rd-checkbox' });
            selectAllChk.addEventListener('change', () => document.querySelectorAll('.rd-torrent-chk').forEach(c => c.checked = selectAllChk.checked));
            selectAllLabel.append(selectAllChk, DOM.text('All'));

            const delSelBtn = DOM.create('button', {
                className: 'rd-input-btn danger', textContent: 'Delete', style: 'margin:0;',
                onClick: () => {
                    const sel = Array.from(document.querySelectorAll('.rd-torrent-chk:checked')).map(c => c.value);
                    if (!sel.length) return;
                    if (confirm('Delete ' + sel.length + ' torrents?')) {
                        sel.forEach(id => deleteTorrent(id));
                    }
                }
            });
            leftGroup.append(selectAllLabel, delSelBtn);

            const cleanBtn = DOM.create('button', {
                className: 'rd-input-btn', textContent: 'Clean Dead', style: 'margin:0;',
                onClick: () => cleanupTorrents()
            });
            topRow.append(leftGroup, cleanBtn);

            const searchInput = DOM.create('input', {
                type: 'text', id: 'rd-search-torrents', className: 'rd-search-bar',
                placeholder: 'Search Torrents...', style: 'margin:0; margin-top:8px;',
                onInput: (e) => this._renderList(e.target.value)
            });
            controlBar.append(topRow, searchInput);

            const listContainer = DOM.create('div', { id: 'rd-torrent-list-container', className: 'rd-log-list' });
            area.append(controlBar, listContainer);
            addPullToRefresh(listContainer, () => this._fetchTorrents(true));
            this._renderList('');
            this.startPolling();
        },

        refresh() {
            const searchInput = document.getElementById('rd-search-torrents');
            const filter = searchInput ? searchInput.value : '';
            this._renderList(filter);
        },

        _renderList(filterText) {
            const container = document.getElementById('rd-torrent-list-container');
            if (!container) return;
            DOM.clear(container);

            if (State.cachedTorrents.length === 0) {
                container.append(DOM.create('div', { style: 'text-align:center; padding:30px 16px; color:var(--rd-text-secondary);', textContent: 'No active torrents.' }));
                return;
            }

            let filtered = State.cachedTorrents;
            if (filterText) {
                const lf = filterText.toLowerCase();
                filtered = filtered.filter(t => t.filename.toLowerCase().includes(lf));
            }

            for (const t of filtered) {
                container.append(this._buildTorrentItem(t));
            }
        },

        _buildTorrentItem(t) {
            const isDone = t.status === 'downloaded';
            const isError = t.status === 'error' || t.status === 'dead';
            const color = isDone ? 'var(--rd-success)' : (isError ? 'var(--rd-danger)' : 'var(--rd-warning)');
            const progWidth = isDone ? 100 : (t.progress || 0);
            const totalGB = formatBytes(t.bytes || 0);
            const dlBytes = (t.bytes || 0) * ((t.progress || 0) / 100);

            // Metrics (speed + ETA)
            const metricsChildren = [];
            if (!isDone && t.speed > 0) {
                const speedMB = (t.speed / 1024 / 1024).toFixed(1) + ' MB/s';
                const bytesLeft = (t.bytes || 0) - dlBytes;
                const secLeft = bytesLeft / t.speed;
                const eta = secLeft > 0 ? Math.floor(secLeft / 60) + 'm ' + Math.floor(secLeft % 60) + 's' : '';
                metricsChildren.push(DOM.create('div', {
                    style: 'font-size:10px; color:var(--rd-text-secondary); margin-top:2px;',
                    textContent: '\u2B07 ' + speedMB + (eta ? ' | ETA ' + eta : '')
                }));
            }

            // Action buttons
            const actionChildren = [];
            if (isDone && t.links && t.links.length > 0) {
                if (t.links.length === 1) {
                    actionChildren.push(DOM.create('span', {
                        className: 'rd-dl-badge', textContent: '1 File',
                        dataset: { link: t.links[0] },
                        onClick: () => { State.currentTab = 'links'; UI.renderDashboard(); unrestrictLink(t.links[0], false); }
                    }));
                } else {
                    actionChildren.push(DOM.create('span', {
                        className: 'rd-dl-badge m3u', textContent: 'M3U',
                        onClick: () => generateM3U(t.filename, t.links)
                    }));
                    actionChildren.push(DOM.create('span', {
                        className: 'rd-dl-badge', textContent: 'All (' + t.links.length + ')',
                        onClick: () => { State.currentTab = 'links'; UI.renderDashboard(); processQueue([...t.links], 'queue'); }
                    }));
                }
            }
            actionChildren.push(DOM.create('span', {
                style: 'color:var(--rd-danger); font-weight:bold; font-size:18px; padding:0 4px; cursor:pointer;',
                textContent: '\u2715',
                onClick: () => deleteTorrent(t.id)
            }));

            const chk = DOM.create('input', { type: 'checkbox', className: 'rd-torrent-chk rd-checkbox', value: t.id });

            // Progress bar
            const progressTrack = DOM.create('div', { className: 'rd-progress-track' });
            const progressFill = DOM.create('div', { className: 'rd-progress-fill', style: 'width:' + progWidth + '%; background:' + color + ';' });
            progressTrack.append(progressFill);

            return DOM.create('div', { className: 'rd-log-item' + (isDone ? ' success' : '') }, [
                chk,
                DOM.create('div', { className: 'rd-item-content' }, [
                    DOM.create('div', { className: 'rd-filename', title: t.filename, style: 'color:' + color + ';', textContent: t.filename }),
                    DOM.create('div', { className: 'rd-meta' }, [
                        DOM.create('span', { textContent: t.status }),
                        DOM.create('span', { textContent: isDone ? totalGB : formatBytes(dlBytes) + ' / ' + totalGB })
                    ]),
                    ...metricsChildren,
                    progressTrack
                ]),
                DOM.create('div', { className: 'rd-item-actions', style: 'flex-direction:column;' }, actionChildren)
            ]);
        },

        startPolling() {
            this.stopPolling();
            if (State.apiKey && !document.hidden) {
                this._fetchTorrents(true);
                this._pollingInterval = setInterval(() => this._fetchTorrents(false), 4000);
            }
        },

        stopPolling() {
            if (this._pollingInterval) { clearInterval(this._pollingInterval); this._pollingInterval = null; }
        },

        async _fetchTorrents(forceRender) {
            if (State.currentTab !== 'torrents') return;
            const { ok, data } = await API.get('/torrents');
            if (!ok || !data) {
                loadOfflineData('rd_cached_torrents', 'cachedTorrents');
                this.refresh();
                return;
            }

            State.cachedTorrents = data;

            // Auto cleanup
            if (State.settings.autoCleanup) {
                const toDelete = data.filter(t => t.status === 'dead' || t.status === 'error');
                if (toDelete.length > 0) {
                    toDelete.forEach(t => API.del('/torrents/delete/' + t.id));
                    State.cachedTorrents = data.filter(t => t.status !== 'dead' && t.status !== 'error');
                }
            }

            // Detect newly completed torrents
            State.cachedTorrents.forEach(t => {
                if (t.status === 'downloaded' && !State.completedTorrentsMemory.has(t.id)) {
                    State.completedTorrentsMemory.add(t.id);
                    if (!State.isFirstTorrentFetch) {
                        GM_notification({ title: 'RD Download Ready', text: t.filename, timeout: 4000 });
                        if (typeof playNotificationChime === 'function') playNotificationChime();
                    }
                }
            });
            State.isFirstTorrentFetch = false;

            // Cache for offline
            GM_setValue('rd_cached_torrents', JSON.stringify(State.cachedTorrents));

            this.refresh();
        }
    };

    Tabs.Cloud = {
        render() {
            const area = document.getElementById('rd-content-area');
            if (!area) return;
            DOM.clear(area);
            area.append(DOM.create('div', { style: 'text-align:center; padding:16px; color:var(--rd-text-secondary);', textContent: 'Loading…' }));
            this._fetchCloud();
        },

        refresh() {
            const searchInput = document.getElementById('rd-search-cloud');
            const filter = searchInput ? searchInput.value : '';
            this._renderList(filter);
        },

        async _fetchCloud() {
            const { ok, data, error } = await API.get('/downloads?limit=100');
            if (State.currentTab !== 'cloud') return;
            if (!ok) {
                if (loadOfflineData('rd_cached_cloud', 'cachedCloud')) {
                    this._renderBase();
                } else {
                    const area = document.getElementById('rd-content-area');
                    if (area) { DOM.clear(area); area.append(DOM.create('div', { style: 'padding:16px; color:var(--rd-danger);', textContent: 'Error: ' + error })); }
                }
                return;
            }
            State.cachedCloud = data || [];
            GM_setValue('rd_cached_cloud', JSON.stringify(State.cachedCloud));
            this._renderBase();
        },

        _renderBase() {
            const area = document.getElementById('rd-content-area');
            if (!area) return;
            DOM.clear(area);

            if (State.cachedCloud.length === 0) {
                area.append(DOM.create('div', { style: 'text-align:center; padding:30px 16px; color:var(--rd-text-secondary);', textContent: 'Cloud history empty.' }));
                return;
            }

            // Control bar
            const controlBar = DOM.create('div', { className: 'rd-control-bar', style: 'flex-direction:column; align-items:stretch;' });
            const topRow = DOM.create('div', { style: 'display:flex; justify-content:space-between; align-items:center; width:100%;' });

            const leftGroup = DOM.create('div', { className: 'rd-control-group' });
            const selectAllLabel = DOM.create('label', { style: 'display:flex; align-items:center; gap:5px; font-size:12px; cursor:pointer; font-weight:600;' });
            const selectAllChk = DOM.create('input', { type: 'checkbox', id: 'rd-cloud-chk-all', className: 'rd-checkbox' });
            selectAllChk.addEventListener('change', () => document.querySelectorAll('.rd-cloud-chk').forEach(c => c.checked = selectAllChk.checked));
            selectAllLabel.append(selectAllChk, DOM.text('All'));

            const delSelBtn = DOM.create('button', {
                className: 'rd-input-btn danger', textContent: 'Delete', style: 'margin:0;',
                onClick: () => {
                    const sel = Array.from(document.querySelectorAll('.rd-cloud-chk:checked')).map(c => c.value);
                    if (!sel.length) return;
                    if (confirm('Delete ' + sel.length + ' files from cloud?')) {
                        sel.forEach(id => deleteCloudItem(id));
                    }
                }
            });
            leftGroup.append(selectAllLabel, delSelBtn);
            topRow.append(leftGroup, buildExportControls('cloud'));

            const bottomRow = DOM.create('div', { style: 'display:flex; gap:6px; align-items:center; margin-top:8px;' });
            const searchInput = DOM.create('input', {
                type: 'text', id: 'rd-search-cloud', className: 'rd-search-bar',
                placeholder: 'Search Cloud...', style: 'margin:0; flex:1;',
                onInput: () => this._renderList(searchInput.value)
            });
            const sortSelect = DOM.create('select', { id: 'rd-cloud-sort', className: 'rd-select', style: 'padding:6px; margin:0;' });
            ['newest:Newest', 'oldest:Oldest', 'largest:Largest', 'smallest:Smallest'].forEach(opt => {
                const [val, label] = opt.split(':');
                sortSelect.append(DOM.create('option', { value: val, textContent: label }));
            });
            sortSelect.addEventListener('change', () => this._renderList(searchInput.value));
            bottomRow.append(searchInput, sortSelect);

            controlBar.append(topRow, bottomRow);

            const listContainer = DOM.create('div', { id: 'rd-cloud-list-container', className: 'rd-log-list' });
            area.append(controlBar, listContainer);
            addPullToRefresh(listContainer, () => this._fetchCloud());
            this._renderList('');
        },

        _renderList(filterText) {
            const container = document.getElementById('rd-cloud-list-container');
            if (!container) return;
            DOM.clear(container);

            let filtered = [...State.cachedCloud];
            if (filterText) {
                const lf = filterText.toLowerCase();
                filtered = filtered.filter(item => item.filename.toLowerCase().includes(lf));
            }

            const sortMode = document.getElementById('rd-cloud-sort')?.value || 'newest';
            filtered.sort((a, b) => {
                if (sortMode === 'newest') return new Date(b.generated) - new Date(a.generated);
                if (sortMode === 'oldest') return new Date(a.generated) - new Date(b.generated);
                if (sortMode === 'largest') return b.filesize - a.filesize;
                return a.filesize - b.filesize;
            });

            for (const item of filtered) {
                const isMedia = /\.(mp4|mkv|avi|mov|mp3|flac|wav|jpg|png|webp)$/i.test(item.filename);
                const btns = [
                    DOM.create('button', { className: 'rd-action-btn', textContent: 'DL', onClick: () => window.open(item.download, '_blank') }),
                    DOM.create('button', { className: 'rd-action-btn', textContent: 'URL', onClick: () => UI.copyToClipboard(item.download) })
                ];
                if (isMedia) {
                    btns.push(DOM.create('button', {
                        className: 'rd-action-btn', textContent: 'Play',
                        onClick: () => {
                            if (State.settings.extPlayer === 'browser' && typeof Media !== 'undefined') Media.open(item.download, item.filename);
                            else window.open(getStreamUrl(item.download), '_self');
                        }
                    }));
                }

                const chk = DOM.create('input', { type: 'checkbox', className: 'rd-cloud-chk rd-checkbox', value: item.id, dataset: { url: item.download } });
                const delBtn = DOM.create('span', {
                    style: 'color:var(--rd-danger); cursor:pointer; padding:0 4px; font-size:16px; font-weight:bold;',
                    textContent: '\u2715',
                    onClick: () => deleteCloudItem(item.id)
                });

                container.append(DOM.create('div', { className: 'rd-log-item success' }, [
                    chk,
                    DOM.create('div', { className: 'rd-item-content' }, [
                        DOM.create('div', { style: 'display:flex; justify-content:space-between; align-items:flex-start;' }, [
                            DOM.create('div', { className: 'rd-filename', title: item.filename, style: 'flex:1;', textContent: item.filename }),
                            delBtn
                        ]),
                        DOM.create('div', { className: 'rd-meta' }, [
                            DOM.create('span', { textContent: formatBytes(item.filesize) }),
                            DOM.create('span', { textContent: new Date(item.generated).toLocaleDateString() })
                        ]),
                        DOM.create('div', { className: 'rd-btn-group' }, btns)
                    ])
                ]));
            }
        }
    };

    function playNotificationChime() {
        if (!State.settings.notificationSound) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
        } catch(e) {}
    }

    Tabs.Settings = {
        render() {
            const area = document.getElementById('rd-content-area');
            if (!area) return;
            DOM.clear(area);

            // Show loading while fetching
            area.append(DOM.create('div', { style: 'text-align:center; padding:16px; color:var(--rd-text-secondary);', textContent: 'Loading…' }));

            // Fetch user + traffic data if not cached
            if (State.userProfile && State.trafficData) {
                this._renderView(area);
            } else {
                this._fetchAndRender(area);
            }
        },

        refresh() { this.render(); },

        async _fetchAndRender(area) {
            const userRes = await API.get('/user');
            if (State.currentTab !== 'settings') return;
            if (!userRes.ok) { DOM.clear(area); area.append(DOM.create('div', { style: 'padding:16px; color:var(--rd-danger);', textContent: 'Failed to load account info' })); return; }
            State.userProfile = userRes.data;

            const trafficRes = await API.get('/traffic');
            if (State.currentTab !== 'settings') return;
            if (trafficRes.ok) State.trafficData = trafficRes.data;

            this._renderView(area);
        },

        _renderView(area) {
            DOM.clear(area);
            const user = State.userProfile;
            const traffic = State.trafficData;
            if (!user) return;

            const wrapper = DOM.create('div', { style: 'padding:16px;' });

            // --- Account Card ---
            const card = DOM.create('div', { style: 'background:var(--rd-bg-glass); border-radius:var(--rd-radius-md); padding:16px; margin-bottom:16px; border:1px solid var(--rd-glass-border); box-shadow:var(--rd-shadow-sm);' });

            const cardTop = DOM.create('div', { style: 'display:flex; justify-content:space-between; align-items:center;' });
            const userInfo = DOM.create('div');
            userInfo.append(
                DOM.create('div', { style: 'font-size:16px; font-weight:bold;', textContent: user.username }),
                DOM.create('div', { style: 'color:var(--rd-text-secondary); font-size:12px; margin-top:2px;', textContent: user.email })
            );
            const daysLeft = user.expiration ? Math.max(0, Math.ceil((new Date(user.expiration) - new Date()) / 86400000)) : 0;
            const statusInfo = DOM.create('div', { style: 'text-align:right;' });
            statusInfo.append(
                DOM.create('div', { style: 'font-size:14px; font-weight:bold; color:' + (daysLeft > 0 ? 'var(--rd-success)' : 'var(--rd-danger)') + ';', textContent: user.type.toUpperCase() }),
                DOM.create('div', { style: 'font-size:11px; color:var(--rd-text-secondary); margin-top:2px;', textContent: daysLeft + ' Days Left' })
            );
            cardTop.append(userInfo, statusInfo);
            card.append(cardTop);

            // Points
            card.append(DOM.create('div', { style: 'font-size:12px; color:var(--rd-text-secondary); margin-top:8px;', textContent: 'Fidelity Points: ' + user.points }));
            card.append(this._buildHostsIndicator());
            if (user.points >= 1000) {
                card.append(DOM.create('button', {
                    className: 'rd-action-btn', textContent: 'Convert 1000 Points to 30 Days',
                    style: 'background:var(--rd-warning); color:var(--rd-bg-base); margin-top:10px; width:100%; padding:8px; font-size:12px; font-weight:bold;',
                    onClick: () => convertPoints()
                }));
            }

            // Traffic quotas
            if (traffic) {
                const quotaEntries = Object.entries(traffic).filter(([, d]) => d.limit && d.limit > 0);
                if (quotaEntries.length > 0) {
                    const quotaSection = DOM.create('div', { style: 'margin-top:14px; border-top:1px solid var(--rd-glass-border); padding-top:12px;' });
                    quotaSection.append(DOM.create('div', { style: 'font-weight:bold; margin-bottom:10px; font-size:12px;', textContent: 'Daily Host Quotas' }));
                    for (const [host, d] of quotaEntries) {
                        const pct = ((d.limit - d.left) / d.limit) * 100;
                        const usedGB = ((d.limit - d.left) / 1073741824).toFixed(1);
                        const limitGB = (d.limit / 1073741824).toFixed(1);
                        const row = DOM.create('div', { style: 'margin-bottom:8px; font-size:11px;' });
                        row.append(
                            DOM.create('div', { style: 'display:flex; justify-content:space-between; margin-bottom:3px; color:var(--rd-text-secondary);' }, [
                                DOM.create('span', { textContent: host }),
                                DOM.create('span', { textContent: usedGB + ' / ' + limitGB + ' GB' })
                            ]),
                            DOM.create('div', { className: 'rd-progress-track' }, [
                                DOM.create('div', { className: 'rd-progress-fill', style: 'width:' + pct + '%; background:var(--rd-accent);' })
                            ])
                        );
                        quotaSection.append(row);
                    }
                    card.append(quotaSection);
                }
            }
            wrapper.append(card);

            // --- Preferences ---
            wrapper.append(DOM.create('div', { style: 'font-size:14px; font-weight:bold; margin-bottom:8px; color:var(--rd-success);', textContent: 'Preferences' }));

            // Toggle settings
            const toggleSettings = [
                { key: 'hijack', label: 'Hijack Native Links', desc: 'Clicking host links auto-routes to RD' },
                { key: 'autoShow', label: 'Auto-Show Dashboard' },
                { key: 'autoCleanup', label: 'Auto-Clean Dead Torrents' },
                { key: 'smartFilter', label: 'Smart Extension Filter' },
                { key: 'notificationSound', label: 'Notification Sound' },
                { key: 'deepScan', label: 'Deep Scan (iframes)', desc: 'Scan links inside iframes — slower' }
            ];
            for (const setting of toggleSettings) {
                wrapper.append(this._buildToggleRow(setting));
            }

            // Dropdown settings
            wrapper.append(this._buildSelectRow('Magnet Add Action', 'magnetAction', [
                ['smart', 'Smart Filter (Auto)'], ['video', 'Largest Video Only'], ['all', 'Download All'], ['manual', 'Manual Selection']
            ]));
            wrapper.append(this._buildSelectRow('Video Player', 'extPlayer', [
                ['browser', 'Web Player'], ['vlc', 'VLC App'], ['iina', 'IINA (Mac)'], ['infuse', 'Infuse (Apple)']
            ]));
            wrapper.append(this._buildSelectRow('Default File Action', 'defaultAction', [
                ['dl', 'Download File'], ['copy', 'Copy to Clipboard'], ['list', 'Add to List Only']
            ]));
            wrapper.append(this._buildSelectRow('Export Format', 'exportFormat', [
                ['raw', 'Plain Text'], ['curl', 'cURL'], ['wget', 'Wget']
            ]));

            // Text inputs
            wrapper.append(this._buildTextRow('Dashboard Toggle Shortcut', 'toggleShortcut', State.settings.toggleShortcut));
            wrapper.append(this._buildTextRow('Smart Filter Extensions', 'filterExts', State.settings.filterExts));
            wrapper.append(this._buildTextRow('Custom Hosts (comma separated)', 'customHosts', State.settings.customHosts, () => { Config.hostRegex = Config.getActiveRegex(); }));

            // Import/Export
            wrapper.append(DOM.create('div', { style: 'font-size:14px; font-weight:bold; margin:16px 0 8px; color:var(--rd-accent);', textContent: 'Backup' }));
            const backupRow = DOM.create('div', { style: 'display:flex; gap:8px;' });
            backupRow.append(
                DOM.create('button', { className: 'rd-input-btn', textContent: 'Export Settings', style: 'flex:1;', onClick: () => this._exportSettings() }),
                DOM.create('button', { className: 'rd-input-btn', textContent: 'Import Settings', style: 'flex:1;', onClick: () => this._importSettings() })
            );
            wrapper.append(backupRow);

            // Logout
            wrapper.append(DOM.create('button', {
                className: 'rd-action-btn', textContent: 'Log Out',
                style: 'background:var(--rd-danger); color:var(--rd-bg-base); padding:10px; width:100%; font-size:13px; font-weight:bold; margin-top:24px;',
                onClick: () => { if (confirm('Logout?')) { Config.clearKey(); location.reload(); } }
            }));

            area.append(wrapper);
        },

        _getHostsIndicatorText() {
            const n = State.dynamicHosts?.length || 0;
            let text = 'Hosts: ' + n + ' supported';
            if (State.hostsUpdatedAt) text += ' · updated ' + formatRelativeTime(State.hostsUpdatedAt);
            if (State.hostsFetchFailed) text += ' · refresh failed';
            return text;
        },

        _buildHostsIndicator() {
            return DOM.create('div', {
                id: 'rd-hosts-indicator',
                className: 'rd-account-row',
                style: 'padding:6px 0 0; border:none; font-size:11px; color:' + (State.hostsFetchFailed ? 'var(--rd-warning)' : 'var(--rd-text-secondary)') + ';',
                textContent: this._getHostsIndicatorText()
            });
        },

        _updateHostsIndicator() {
            const el = document.getElementById('rd-hosts-indicator');
            if (!el) return;
            el.textContent = this._getHostsIndicatorText();
            el.style.color = State.hostsFetchFailed ? 'var(--rd-warning)' : 'var(--rd-text-secondary)';
        },

        _buildToggleRow({ key, label, desc }) {
            const row = DOM.create('div', { className: 'rd-account-row', style: 'display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--rd-glass-border); font-size:12px;' });
            const labelEl = DOM.create('span');
            labelEl.append(DOM.text(label));
            if (desc) labelEl.append(DOM.create('br'), DOM.create('span', { style: 'font-size:10px; color:var(--rd-text-secondary); font-weight:normal;', textContent: desc }));

            const toggle = DOM.create('label', { className: 'rd-toggle' });
            const input = DOM.create('input', { type: 'checkbox' });
            input.checked = !!State.settings[key];
            input.addEventListener('change', () => { State.settings[key] = input.checked; saveSettings(); UI.showToast('Settings Saved'); });
            const slider = DOM.create('span', { className: 'rd-slider' });
            toggle.append(input, slider);

            row.append(labelEl, toggle);
            return row;
        },

        _buildSelectRow(label, key, options) {
            const row = DOM.create('div', { className: 'rd-account-row', style: 'display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--rd-glass-border); font-size:12px;' });
            row.append(DOM.create('span', { textContent: label }));
            const select = DOM.create('select', { className: 'rd-select' });
            for (const [val, text] of options) {
                const opt = DOM.create('option', { value: val, textContent: text });
                if (State.settings[key] === val) opt.selected = true;
                select.append(opt);
            }
            select.addEventListener('change', () => { State.settings[key] = select.value; saveSettings(); UI.showToast(label + ' Updated'); });
            row.append(select);
            return row;
        },

        _buildTextRow(label, key, value, onChange) {
            const row = DOM.create('div', { style: 'display:flex; flex-direction:column; align-items:flex-start; gap:6px; padding:12px 0; border-bottom:1px solid var(--rd-glass-border); font-size:12px;' });
            row.append(DOM.create('span', { textContent: label }));
            const input = DOM.create('input', { type: 'text', className: 'rd-search-bar', value: value || '' });
            input.addEventListener('input', () => { State.settings[key] = input.value; saveSettings(); if (onChange) onChange(); });
            row.append(input);
            return row;
        },

        _exportSettings() {
            const data = { settings: State.settings, apiKey: State.apiKey };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = DOM.create('a', { href: url, download: 'rd-settings-backup.json' });
            a.click();
            URL.revokeObjectURL(url);
            UI.showToast('Settings Exported');
        },

        _importSettings() {
            const input = DOM.create('input', { type: 'file', accept: '.json' });
            input.addEventListener('change', () => {
                const file = input.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const data = JSON.parse(reader.result);
                        if (!data.settings) throw new Error('Invalid format');
                        if (!confirm('Import these settings? This will overwrite your current settings.')) return;
                        // Validate and apply
                        for (const key of Object.keys(Config.defaultSettings)) {
                            if (data.settings.hasOwnProperty(key)) State.settings[key] = data.settings[key];
                        }
                        saveSettings();
                        if (data.apiKey) Config.saveKey(data.apiKey);
                        UI.showToast('Settings Imported!');
                        setTimeout(() => location.reload(), 800);
                    } catch(e) {
                        UI.showToast('Invalid settings file', 'error');
                    }
                };
                reader.readAsText(file);
            });
            input.click();
        }
    };
