    Tabs.Links = {
        render() {
            const area = document.getElementById('rd-content-area');
            if (!area) return;
            DOM.clear(area);

            // Input area
            const inputArea = DOM.create('div', { className: 'rd-input-area' });
            const textarea = DOM.create('textarea', {
                id: 'rd-manual-input', className: 'rd-textarea',
                placeholder: 'Paste links, folders, magnets, or Base64...',
                onKeydown: (e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        handleManualInput();
                    }
                }
            });
            const btnRow = DOM.create('div', { style: 'display:flex; gap:8px; margin-top:8px;' });
            const unrestrictBtn = DOM.create('button', {
                id: 'rd-btn-unrestrict', className: 'rd-input-btn primary',
                textContent: 'Unrestrict', style: 'flex:2;',
                onClick: () => handleManualInput()
            });
            const pasteBtn = DOM.create('button', {
                id: 'rd-btn-paste', className: 'rd-input-btn',
                textContent: 'Paste', style: 'flex:1;',
                onClick: async () => {
                    try {
                        const text = await navigator.clipboard.readText();
                        textarea.value = text;
                    } catch (e) {
                        UI.showToast('Clipboard access denied', 'error');
                    }
                }
            });
            const clearBtn = DOM.create('button', {
                id: 'rd-btn-clear', className: 'rd-input-btn',
                textContent: 'Clear', style: 'flex:1;',
                onClick: () => {
                    if (!confirm('Clear all link history?')) return;
                    State.linkHistory = [];
                    GM_setValue('rd_link_history', '[]');
                    Tabs.Links.render();
                    UI.showToast('History Cleared');
                }
            });
            btnRow.append(unrestrictBtn, pasteBtn, clearBtn);

            // Export controls
            const exportRow = DOM.create('div', { style: 'display:flex; justify-content:flex-end; gap:8px; align-items:center; margin-top:8px;' });
            exportRow.append(buildExportControls('local'));
            exportRow.append(
                DOM.create('button', {
                    className: 'rd-input-btn', textContent: 'Copy All URLs', style: 'margin:0;',
                    onClick: (e) => {
                        const urls = State.linkHistory
                            .filter(h => h.type === 'success')
                            .map(h => h.download || h.url)
                            .filter(u => u && u !== '#');
                        if (!urls.length) { UI.showToast('No URLs to copy', 'error'); return; }
                        UI.copyToClipboard(urls.join('\n'), e.currentTarget);
                        UI.showToast('Copied ' + urls.length + ' URL' + (urls.length === 1 ? '' : 's'));
                    }
                }),
                DOM.create('button', {
                    className: 'rd-input-btn', textContent: 'Import JSON', style: 'margin:0;',
                    onClick: () => {
                        const input = DOM.create('input', { type: 'file', accept: '.json' });
                        input.addEventListener('change', () => {
                            const file = input.files[0];
                            if (!file) return;
                            importHistoryJson(file);
                        });
                        input.click();
                    }
                }),
                DOM.create('button', {
                    className: 'rd-input-btn', textContent: 'Export JSON', style: 'margin:0;',
                    onClick: () => exportHistoryJson()
                })
            );

            inputArea.append(textarea, btnRow, exportRow);

            const searchInput = DOM.create('input', {
                type: 'text', id: 'rd-search-links', className: 'rd-search-bar',
                placeholder: 'Search History...', value: State.linksHistoryFilter || '',
                style: 'margin:0; margin-top:8px;',
                onInput: (e) => {
                    State.linksHistoryFilter = e.target.value;
                    const logList = document.getElementById('rd-links-history');
                    if (logList) this._renderHistory(logList, State.linksHistoryFilter);
                }
            });

            const typeFilter = State.linksHistoryTypeFilter || 'all';
            const filterRow = DOM.create('div', { style: 'display:flex; gap:6px; margin-top:8px;' });
            [['all', 'All'], ['success', 'Success'], ['error', 'Errors']].forEach(([val, label]) => {
                const chip = DOM.create('button', {
                    className: 'rd-input-btn' + (typeFilter === val ? ' primary' : ''),
                    textContent: label,
                    style: 'flex:1; margin:0;',
                    onClick: () => {
                        State.linksHistoryTypeFilter = val;
                        filterRow.querySelectorAll('button').forEach(b => b.classList.remove('primary'));
                        chip.classList.add('primary');
                        const logList = document.getElementById('rd-links-history');
                        if (logList) this._renderHistory(logList, State.linksHistoryFilter);
                    }
                });
                filterRow.append(chip);
            });
            const retryErrorsBtn = DOM.create('button', {
                className: 'rd-input-btn', textContent: 'Retry Errors', style: 'margin:0;',
                onClick: () => retryAllErrors()
            });
            filterRow.append(retryErrorsBtn);

            // History list
            const logList = DOM.create('div', { className: 'rd-log-list', id: 'rd-links-history' });
            this._renderHistory(logList, State.linksHistoryFilter);

            area.append(inputArea, searchInput, filterRow, logList);
        },

        refresh() {
            const logList = document.getElementById('rd-links-history');
            if (logList) this._renderHistory(logList, State.linksHistoryFilter);
        },

        _getFilteredHistory(filterText) {
            let filtered = State.linkHistory;
            const typeFilter = State.linksHistoryTypeFilter || 'all';
            if (typeFilter === 'success') filtered = filtered.filter((item) => item.type === 'success');
            else if (typeFilter === 'error') filtered = filtered.filter((item) => item.type === 'error');
            if (filterText) {
                const lf = filterText.toLowerCase();
                filtered = filtered.filter((item) => {
                    const hay = [(item.name || ''), (item.url || ''), (item.msg || '')].join(' ').toLowerCase();
                    return hay.includes(lf);
                });
            }
            const reversed = [];
            for (let i = filtered.length - 1; i >= 0; i--) reversed.push(filtered[i]);
            return reversed;
        },

        _renderHistory(container, filterText) {
            const filtered = this._getFilteredHistory(filterText);
            ListRenderer.patch(container, filtered, {
                key: (item) => (item.url || item.msg || '') + '|' + (item.time || '') + '|' + item.type,
                compare: (a, b) => JSON.stringify(a) === JSON.stringify(b),
                emptyMessage: State.linkHistory.length === 0
                    ? 'No history. Paste links below or drag & drop.'
                    : 'No matching history.',
                render: (item) => this._buildHistoryItem(item)
            });
        },

        _buildHistoryItem(item) {
            if (item.type === 'error') {
                const content = [
                    DOM.create('div', { className: 'rd-item-content' }, [
                        DOM.create('div', { className: 'rd-filename', style: 'color:var(--rd-danger);', textContent: item.msg || 'Error' }),
                        DOM.create('div', { className: 'rd-meta' }, [
                            DOM.create('span', { textContent: item.time || '' }),
                            item.sourceUrl ? DOM.create('span', {
                                textContent: item.sourceUrl.length > 40 ? item.sourceUrl.slice(0, 40) + '…' : item.sourceUrl,
                                title: item.sourceUrl,
                                style: 'margin-left:8px;opacity:0.7;'
                            }) : null
                        ].filter(Boolean)),
                        item.sourceUrl ? DOM.create('div', { className: 'rd-btn-group' }, [
                            DOM.create('button', {
                                className: 'rd-action-btn', textContent: 'Retry',
                                onClick: () => retryHistoryItem(item)
                            })
                        ]) : null
                    ].filter(Boolean))
                ];
                return DOM.create('div', { className: 'rd-log-item error' }, content);
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
                    onClick: () => playMediaUrl(item.download || item.url, item.name)
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
                row.addEventListener('dblclick', () => UI.copyToClipboard(item.url));
                addMobileLongPress(row, [
                    { label: 'Copy URL', action: () => UI.copyToClipboard(item.url) },
                    { label: 'Download', action: () => window.open(item.url, '_blank') }
                ]);
            }
            return row;
        }
    };
