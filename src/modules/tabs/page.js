    Tabs.Page = {
        render() {
            const area = document.getElementById('rd-content-area');
            if (!area) return;
            DOM.clear(area);
            API.get('/hosts/status').then(({ ok, data }) => { if (ok && data) State.liveHosts = data; });
            this.batchCheckLinks();

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

            const selectUncachedBtn = DOM.create('button', {
                className: 'rd-input-btn', textContent: 'Select Uncached', style: 'margin:0;',
                onClick: () => {
                    let count = 0;
                    document.querySelectorAll('.rd-page-chk').forEach(cb => {
                        cb.checked = isPageLinkUncached(cb.value);
                        if (cb.checked) count++;
                    });
                    selectAllChk.checked = false;
                    selectAllChk.indeterminate = count > 0 && count < document.querySelectorAll('.rd-page-chk').length;
                    UI.showToast(count ? 'Selected ' + count + ' uncached' : 'No uncached links found', count ? 'success' : 'error');
                }
            });
            const invertSelBtn = DOM.create('button', {
                className: 'rd-input-btn', textContent: 'Invert', style: 'margin:0;',
                onClick: () => {
                    const boxes = document.querySelectorAll('.rd-page-chk');
                    let checked = 0;
                    boxes.forEach(cb => { cb.checked = !cb.checked; if (cb.checked) checked++; });
                    selectAllChk.checked = checked === boxes.length;
                    selectAllChk.indeterminate = checked > 0 && checked < boxes.length;
                    UI.showToast('Inverted selection (' + checked + ' selected)');
                }
            });

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
                    UI.openTab('links', () => processQueue(sel, 'queue'));
                }
            });

            leftGroup.append(
                selectAllLabel,
                makeDeselectAllBtn('.rd-page-chk', selectAllChk),
                selectUncachedBtn,
                invertSelBtn,
                makeCopyUrlsBtn(() => Array.from(document.querySelectorAll('.rd-page-chk:checked')).map(c => c.value).filter(u => u)),
                dlSelBtn,
                queueBtn,
                queueStatus
            );
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
                if (State.pageCollapsedDomains.has(domain)) groupContent.style.display = 'none';
                groupHeader.addEventListener('click', (e) => {
                    if (e.target === groupChk) return;
                    const hiding = groupContent.style.display !== 'none';
                    groupContent.style.display = hiding ? 'none' : 'flex';
                    if (hiding) State.pageCollapsedDomains.add(domain);
                    else State.pageCollapsedDomains.delete(domain);
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
                            UI.openTab('links', () => {
                                if (link.url.startsWith('magnet:')) addMagnet(link.url);
                                else unrestrictLinkOrFolder(link.url);
                            });
                        }
                    });

                    const badge = getPageLinkBadge(link.url, link.type);
                    const item = DOM.create('div', { className: 'rd-log-item' }, [
                        chk,
                        DOM.create('div', { className: 'rd-item-content' }, [
                            DOM.create('div', { className: 'rd-filename', title: link.url, textContent: icon + ' ' + link.text }),
                            DOM.create('div', { style: 'display:flex; gap:8px; align-items:center;' }, [
                                DOM.create('span', {
                                    textContent: badge.text,
                                    style: 'font-size:9px; font-weight:600; color:' + badge.color + ';'
                                }),
                                DOM.create('span', {
                                    style: 'font-size:10px; color:var(--rd-text-secondary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;',
                                    textContent: link.url
                                })
                            ]),
                            DOM.create('div', { className: 'rd-btn-group' }, [oneClickBtn, queueItemBtn])
                        ])
                    ]);
                    addMobileLongPress(item, [
                        { label: '1-Click', action: () => oneClickBtn.click() },
                        { label: 'Queue', action: () => queueItemBtn.click() },
                        { label: 'Copy URL', action: () => UI.copyToClipboard(link.url) }
                    ]);
                    groupContent.append(item);
                }

                logList.append(groupHeader, groupContent);
            }

            area.append(controlBar, logList);
        },

        refresh() {
            this.render();
        },

        async batchCheckLinks() {
            const hostUrls = [];
            for (const [url, data] of State.scannedLinksMap.entries()) {
                if (data.type === 'host' && !State.pageLinkCache.has(url)) hostUrls.push(url);
            }
            for (const url of hostUrls.slice(0, 50)) {
                if (State.linkCheckCache.has(url)) {
                    const info = State.linkCheckCache.get(url);
                    State.pageLinkCache.set(url, info.includes('Unsupported') ? 'uncached' : 'cached');
                    continue;
                }
                const { ok, data } = await API.post('/unrestrict/check', { link: url });
                if (ok && data) {
                    State.pageLinkCache.set(url, data.supported ? 'cached' : 'uncached');
                    if (data.filename) {
                        State.linkCheckCache.set(url, data.filename + ' \u2014 ' + (data.filesize ? formatBytes(data.filesize) : 'Unknown'));
                    }
                }
            }
            if (State.currentTab === 'page' && State.isExpanded) {
                const area = document.getElementById('rd-content-area');
                if (area && area.querySelector('.rd-page-chk')) this.render();
            }
        }
    };

