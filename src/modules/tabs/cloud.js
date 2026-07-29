    Tabs.Cloud = {
        render() {
            const area = document.getElementById('rd-content-area');
            if (!area) return;
            DOM.clear(area);
            State.cloudPage = 1;
            area.append(DOM.create('div', { style: 'text-align:center; padding:16px; color:var(--rd-text-secondary);', textContent: 'Loading…' }));
            this._fetchCloud(true);
        },

        refresh() {
            const searchInput = document.getElementById('rd-search-cloud');
            const filter = searchInput ? searchInput.value : '';
            this._renderList(filter);
        },

        async _fetchCloud(reset) {
            const limit = parseInt(State.settings.cloudLimit, 10) || 100;
            if (reset) State.cloudPage = 1;
            const page = State.cloudPage || 1;
            const { ok, data, error } = await API.getDownloadsPage(limit, page);
            if (State.currentTab !== Config.TAB_KEYS.CLOUD) return;
            if (!ok) {
                if (loadOfflineData('rd_cached_cloud', 'cachedCloud')) {
                    this._renderBase();
                } else {
                    const area = document.getElementById('rd-content-area');
                    if (area) { DOM.clear(area); area.append(DOM.create('div', { style: 'padding:16px; color:var(--rd-danger);', textContent: 'Error: ' + error })); }
                }
                return;
            }
            const batch = data || [];
            if (reset || page === 1) {
                State.cachedCloud = batch;
            } else {
                const existingIds = new Set(State.cachedCloud.map((c) => c.id));
                batch.forEach((item) => { if (!existingIds.has(item.id)) State.cachedCloud.push(item); });
            }
            State.cloudHasMore = batch.length >= limit;
            GM_setValue('rd_cached_cloud', JSON.stringify(State.cachedCloud));
            this._renderBase();
        },

        async _loadMore() {
            State.cloudPage = (State.cloudPage || 1) + 1;
            UI.showToast('Loading more...');
            await this._fetchCloud(false);
        },

        _renderBase() {
            const area = document.getElementById('rd-content-area');
            if (!area) return;
            DOM.clear(area);

            const controlBar = DOM.create('div', { className: 'rd-control-bar', style: 'flex-direction:column; align-items:stretch;' });
            const topRow = DOM.create('div', { style: 'display:flex; justify-content:space-between; align-items:center; width:100%; flex-wrap:wrap; gap:8px;' });

            const leftGroup = DOM.create('div', { className: 'rd-control-group' });
            const selectAllLabel = DOM.create('label', { style: 'display:flex; align-items:center; gap:5px; font-size:12px; cursor:pointer; font-weight:600;' });
            const selectAllChk = DOM.create('input', { type: 'checkbox', id: 'rd-cloud-chk-all', className: 'rd-checkbox' });
            selectAllChk.addEventListener('change', () => document.querySelectorAll('.rd-cloud-chk').forEach((c) => { c.checked = selectAllChk.checked; }));
            selectAllLabel.append(selectAllChk, DOM.text('All'));

            const delSelBtn = DOM.create('button', {
                className: 'rd-input-btn danger', textContent: 'Delete', style: 'margin:0;',
                onClick: () => {
                    const sel = Array.from(document.querySelectorAll('.rd-cloud-chk:checked')).map((c) => c.value);
                    if (!sel.length) return;
                    if (confirm('Delete ' + sel.length + ' files from cloud?')) {
                        sel.forEach((id) => deleteCloudItem(id));
                    }
                }
            });
            const cloudRefreshBtn = DOM.create('button', {
                className: 'rd-input-btn', textContent: 'Refresh', style: 'margin:0;',
                onClick: () => this.render()
            });
            const deleteAllBtn = DOM.create('button', {
                className: 'rd-input-btn danger', textContent: 'Delete All', style: 'margin:0;',
                onClick: () => {
                    if (prompt('Type DELETE ALL to wipe cloud history') === 'DELETE ALL') deleteAllCloudItems();
                }
            });
            leftGroup.append(
                selectAllLabel,
                makeDeselectAllBtn('.rd-cloud-chk', selectAllChk),
                makeInvertBtn('.rd-cloud-chk', selectAllChk),
                cloudRefreshBtn,
                makeCopyUrlsBtn(() => Array.from(document.querySelectorAll('.rd-cloud-chk:checked')).map((c) => c.dataset.url).filter((u) => u && u !== '#')),
                delSelBtn,
                deleteAllBtn
            );
            topRow.append(leftGroup, buildExportControls('cloud'));

            const bottomRow = DOM.create('div', { style: 'display:flex; gap:6px; align-items:center; margin-top:8px;' });
            const searchInput = DOM.create('input', {
                type: 'text', id: 'rd-search-cloud', className: 'rd-search-bar',
                placeholder: 'Search Cloud...', style: 'margin:0; flex:1;',
                onInput: () => this._renderList(searchInput.value)
            });
            const sortSelect = DOM.create('select', { id: 'rd-cloud-sort', className: 'rd-select', style: 'padding:6px; margin:0;' });
            ['newest:Newest', 'oldest:Oldest', 'largest:Largest', 'smallest:Smallest'].forEach((opt) => {
                const [val, label] = opt.split(':');
                sortSelect.append(DOM.create('option', { value: val, textContent: label }));
            });
            sortSelect.addEventListener('change', () => this._renderList(searchInput.value));
            bottomRow.append(searchInput, sortSelect);

            controlBar.append(topRow, bottomRow);

            const listContainer = DOM.create('div', { id: 'rd-cloud-list-container', className: 'rd-log-list' });
            const loadMoreBtn = DOM.create('button', {
                id: 'rd-cloud-load-more',
                className: 'rd-input-btn',
                textContent: 'Load More',
                style: 'width:100%; margin-top:8px; display:' + (State.cloudHasMore ? 'block' : 'none') + ';',
                onClick: () => this._loadMore()
            });
            area.append(controlBar, listContainer, loadMoreBtn);
            addPullToRefresh(listContainer, () => this.render());
            this._renderList('');
        },

        _getFilteredCloud(filterText) {
            let filtered = [...State.cachedCloud];
            if (filterText) {
                const lf = filterText.toLowerCase();
                filtered = filtered.filter((item) => item.filename.toLowerCase().includes(lf));
            }
            const sortMode = document.getElementById('rd-cloud-sort')?.value || 'newest';
            filtered.sort((a, b) => {
                if (sortMode === 'newest') return new Date(b.generated) - new Date(a.generated);
                if (sortMode === 'oldest') return new Date(a.generated) - new Date(b.generated);
                if (sortMode === 'largest') return b.filesize - a.filesize;
                return a.filesize - b.filesize;
            });
            return filtered;
        },

        _renderList(filterText) {
            const container = document.getElementById('rd-cloud-list-container');
            if (!container) return;
            const filtered = this._getFilteredCloud(filterText);
            ListRenderer.patch(container, filtered, {
                key: (item) => item.id,
                compare: ListRenderer.cloudCompare,
                emptyMessage: 'Cloud history empty.',
                render: (item) => this._buildCloudItem(item)
            });
            const loadMore = document.getElementById('rd-cloud-load-more');
            if (loadMore) loadMore.style.display = State.cloudHasMore ? 'block' : 'none';
        },

        _buildCloudItem(item) {
            const isMedia = /\.(mp4|mkv|avi|mov|mp3|flac|wav|jpg|png|webp)$/i.test(item.filename);
            const btns = [
                DOM.create('button', { className: 'rd-action-btn', textContent: 'DL', onClick: () => window.open(item.download, '_blank') }),
                DOM.create('button', { className: 'rd-action-btn', textContent: 'URL', onClick: () => UI.copyToClipboard(item.download) }),
                DOM.create('button', {
                    className: 'rd-action-btn', textContent: 'Rename',
                    onClick: () => {
                        const newName = prompt('New filename:', item.filename);
                        if (newName && newName !== item.filename) renameCloudItem(item.id, newName);
                    }
                })
            ];
            if (isMedia) {
                btns.push(DOM.create('button', {
                    className: 'rd-action-btn', textContent: 'Play',
                    onClick: () => playMediaUrl(item.download, item.filename, item.id)
                }));
            }

            const chk = DOM.create('input', { type: 'checkbox', className: 'rd-cloud-chk rd-checkbox', value: item.id, dataset: { url: item.download } });
            const delBtn = DOM.create('span', {
                style: 'color:var(--rd-danger); cursor:pointer; padding:0 4px; font-size:16px; font-weight:bold;',
                textContent: '\u2715',
                onClick: () => deleteCloudItem(item.id)
            });

            const row = DOM.create('div', { className: 'rd-log-item success' }, [
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
            ]);
            addMobileLongPress(row, [
                { label: 'Copy URL', action: () => UI.copyToClipboard(item.download) },
                { label: 'Download', action: () => window.open(item.download, '_blank') },
                ...(isMedia ? [{ label: 'Play', action: () => playMediaUrl(item.download, item.filename, item.id) }] : []),
                { label: 'Delete', action: () => deleteCloudItem(item.id) }
            ]);
            return row;
        }
    };
