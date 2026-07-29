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
            const refreshBtn = DOM.create('button', {
                className: 'rd-input-btn', textContent: 'Refresh', style: 'margin:0;',
                onClick: () => this._fetchTorrents(true)
            });
            leftGroup.append(
                selectAllLabel,
                makeDeselectAllBtn('.rd-torrent-chk', selectAllChk),
                makeInvertBtn('.rd-torrent-chk', selectAllChk),
                refreshBtn,
                makeCopyUrlsBtn(() => {
                    const selIds = new Set(Array.from(document.querySelectorAll('.rd-torrent-chk:checked')).map(c => c.value));
                    const urls = [];
                    for (const t of State.cachedTorrents) {
                        if (!selIds.has(String(t.id))) continue;
                        if (t.status !== 'downloaded' || !t.links?.length) continue;
                        t.links.forEach(u => { if (u && u !== '#') urls.push(u); });
                    }
                    return urls;
                }),
                delSelBtn
            );

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
            const statusFilter = State.torrentStatusFilter || 'all';
            const statusRow = DOM.create('div', { style: 'display:flex; gap:6px; margin-top:8px; flex-wrap:wrap;' });
            [['all', 'All'], ['active', 'Active'], ['done', 'Done'], ['error', 'Errors']].forEach(([val, label]) => {
                statusRow.append(DOM.create('button', {
                    className: 'rd-input-btn' + (statusFilter === val ? ' primary' : ''),
                    textContent: label, style: 'margin:0; flex:1; min-width:60px;',
                    onClick: () => {
                        State.torrentStatusFilter = val;
                        this.render();
                    }
                }));
            });
            const addPanel = DOM.create('div', { style: 'display:flex; gap:6px; margin-top:8px; flex-wrap:wrap;' });
            const magnetInput = DOM.create('input', {
                type: 'text', className: 'rd-search-bar', placeholder: 'Paste magnet link...',
                style: 'margin:0; flex:1; min-width:140px;'
            });
            const addMagnetBtn = DOM.create('button', {
                className: 'rd-input-btn primary', textContent: 'Add Magnet', style: 'margin:0;',
                onClick: () => {
                    const m = magnetInput.value.trim();
                    if (!m.startsWith('magnet:')) return UI.showToast('Invalid magnet', 'error');
                    addMagnet(m);
                    magnetInput.value = '';
                }
            });
            const torrentFileInput = DOM.create('input', { type: 'file', accept: '.torrent', style: 'display:none;' });
            torrentFileInput.addEventListener('change', () => {
                const file = torrentFileInput.files[0];
                if (file) uploadTorrentFile(file);
                torrentFileInput.value = '';
            });
            const uploadBtn = DOM.create('button', {
                className: 'rd-input-btn', textContent: 'Upload .torrent', style: 'margin:0;',
                onClick: () => torrentFileInput.click()
            });
            const deleteAllBtn = DOM.create('button', {
                className: 'rd-input-btn danger', textContent: 'Delete All', style: 'margin:0;',
                onClick: () => {
                    if (prompt('Type DELETE ALL to remove every torrent') === 'DELETE ALL') deleteAllTorrentItems();
                }
            });
            addPanel.append(magnetInput, addMagnetBtn, uploadBtn, deleteAllBtn, torrentFileInput);

            controlBar.append(topRow, addPanel, searchInput, statusRow);

            const listContainer = DOM.create('div', { id: 'rd-torrent-list-container', className: 'rd-log-list' });
            area.append(controlBar, listContainer);
            addPullToRefresh(listContainer, () => this._fetchTorrents(true));
            this._renderList('');
            this._fetchActiveCount();
            this.startPolling();
        },

        async _fetchActiveCount() {
            const res = await API.getTorrentsActiveCount();
            if (res.ok && typeof res.data === 'number') {
                State.activeTorrentCount = res.data;
                UI.updateHeaderQuota();
            }
        },

        refresh() {
            const searchInput = document.getElementById('rd-search-torrents');
            const filter = searchInput ? searchInput.value : '';
            this._renderList(filter);
        },

        _getFilteredTorrents(filterText) {
            let filtered = State.cachedTorrents;
            const statusFilter = State.torrentStatusFilter || 'all';
            if (statusFilter === 'active') {
                filtered = filtered.filter((t) => t.status !== 'downloaded' && t.status !== 'dead' && t.status !== 'error');
            } else if (statusFilter === 'done') {
                filtered = filtered.filter((t) => t.status === 'downloaded');
            } else if (statusFilter === 'error') {
                filtered = filtered.filter((t) => t.status === 'dead' || t.status === 'error');
            }
            if (filterText) {
                const lf = filterText.toLowerCase();
                filtered = filtered.filter((t) => t.filename.toLowerCase().includes(lf));
            }
            return filtered;
        },

        _renderList(filterText) {
            const container = document.getElementById('rd-torrent-list-container');
            if (!container) return;
            const filtered = this._getFilteredTorrents(filterText);
            ListRenderer.patch(container, filtered, {
                key: (t) => t.id,
                compare: ListRenderer.torrentCompare,
                emptyMessage: State.cachedTorrents.length === 0 ? 'No active torrents.' : 'No matching torrents.',
                render: (t) => this._buildTorrentItem(t)
            });
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

            const actionChildren = [];
            if (t.status === 'waiting_files_selection') {
                actionChildren.push(DOM.create('span', {
                    className: 'rd-dl-badge', textContent: 'Pick Files',
                    style: 'background:var(--rd-accent);',
                    onClick: () => TorrentPicker.open(t.id)
                }));
            }
            if (isDone && t.links && t.links.length > 0) {
                actionChildren.push(DOM.create('span', {
                    className: 'rd-dl-badge', textContent: 'Play',
                    onClick: () => playTorrentVideos(t)
                }));
                if (t.links.length === 1) {
                    actionChildren.push(DOM.create('span', {
                        className: 'rd-dl-badge', textContent: '1 File',
                        dataset: { link: t.links[0] },
                        onClick: () => { UI.openTab(Config.TAB_KEYS.LINKS, () => unrestrictLink(t.links[0], false)); }
                    }));
                } else {
                    actionChildren.push(DOM.create('span', {
                        className: 'rd-dl-badge m3u', textContent: 'M3U',
                        onClick: () => generateM3U(t.filename, t.links)
                    }));
                    actionChildren.push(DOM.create('span', {
                        className: 'rd-dl-badge', textContent: 'All (' + t.links.length + ')',
                        onClick: () => { UI.openTab('links', () => processQueue([...t.links], 'queue')); }
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

            const row = DOM.create('div', { className: 'rd-log-item' + (isDone ? ' success' : '') }, [
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
            addMobileLongPress(row, [
                { label: 'Delete', action: () => deleteTorrent(t.id) },
                ...(isDone && t.links?.length ? [{ label: 'Play', action: () => playTorrentVideos(t) }] : []),
                ...(t.status === 'waiting_files_selection' ? [{ label: 'Pick Files', action: () => TorrentPicker.open(t.id) }] : [])
            ]);
            return row;
        },

        startPolling() {
            this.stopPolling();
            if (State.apiKey && !document.hidden) {
                this._fetchTorrents(true);
                const pollMs = Math.max(3, parseInt(State.settings.torrentPollInterval, 10) || 4) * 1000;
                this._pollingInterval = setInterval(() => {
                    if (document.hidden) return;
                    this._fetchTorrents(false);
                }, pollMs);
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
                        UI.notify('RD Download Ready', t.filename);
                    }
                }
            });
            State.isFirstTorrentFetch = false;

            // Cache for offline
            GM_setValue('rd_cached_torrents', JSON.stringify(State.cachedTorrents));

            this.refresh();
        }
    };
