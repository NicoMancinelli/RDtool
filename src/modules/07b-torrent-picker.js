// Torrent file picker — shared modal for magnets, uploads, and pending torrents
    // =========================================================================

    const TorrentPicker = {
        async open(torrentId, callback, preloadedFiles, preloadedTitle) {
            let files = preloadedFiles;
            let title = preloadedTitle || 'Select Files';

            if (!files) {
                const infoRes = await API.get('/torrents/info/' + torrentId);
                if (!infoRes.ok || !infoRes.data || !infoRes.data.files) {
                    UI.showToast(API.describeError(infoRes, 'Could not load torrent files'), 'error');
                    return;
                }
                files = infoRes.data.files;
                title = infoRes.data.filename || title;
            }

            if (State.settings.magnetAction !== 'manual' && State.settings.magnetAction !== 'video' && State.settings.magnetAction !== 'smart') {
                this._showModal(torrentId, files, title, callback);
                return;
            }

            if (State.settings.magnetAction === 'manual') {
                this._showModal(torrentId, files, title, callback);
                return;
            }

            if (State.settings.magnetAction === 'video') {
                const videoExts = /\.(mp4|mkv|avi|mov|webm)$/i;
                let largestId = null, maxSize = 0;
                files.forEach((f) => {
                    if (videoExts.test(f.path) && f.bytes > maxSize) { maxSize = f.bytes; largestId = f.id; }
                });
                if (largestId) {
                    await API.post('/torrents/selectFiles/' + torrentId, { files: String(largestId) });
                    addToHistory({ type: 'success', name: 'Main Video Added', url: '#', size: formatBytes(maxSize) });
                    if (!State.queueProcessing) UI.showToast('Main Video Added!');
                    finishMagnetAdd(callback);
                    return;
                }
            }

            if (State.settings.magnetAction === 'smart' || State.settings.magnetAction === 'video') {
                let fileIds = 'all';
                if (State.settings.smartFilter) {
                    const exts = State.settings.filterExts.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
                    if (exts.length > 0) {
                        const extRegex = new RegExp('\\.(' + exts.join('|') + ')$', 'i');
                        const validFiles = files.filter((f) => !extRegex.test(f.path));
                        if (validFiles.length > 0) fileIds = validFiles.map((f) => f.id).join(',');
                    }
                }
                await API.post('/torrents/selectFiles/' + torrentId, { files: fileIds });
                addToHistory({ type: 'success', name: title, url: '#', size: 'Pending' });
                if (!State.queueProcessing) UI.showToast('Torrent started!');
                finishMagnetAdd(callback);
                return;
            }

            this._showModal(torrentId, files, title, callback);
        },

        _showModal(torrentId, files, title, callback) {
            const container = DOM.create('div', { style: 'display:flex;flex-direction:column;gap:10px;max-height:60vh;' });

            const headerRow = DOM.create('div', { style: 'display:flex;gap:8px;align-items:center;margin-bottom:6px;' });
            const selectAllBtn = DOM.create('button', { textContent: 'Select All', className: 'rd-input-btn' });
            const selectNoneBtn = DOM.create('button', { textContent: 'Select None', className: 'rd-input-btn' });
            headerRow.append(selectAllBtn, selectNoneBtn);
            container.append(headerRow);

            const fileList = DOM.create('div', { style: 'overflow-y:auto;max-height:50vh;display:flex;flex-direction:column;gap:4px;' });
            const checkboxes = [];

            files.forEach((f) => {
                const row = DOM.create('label', { style: 'display:flex;align-items:center;gap:8px;padding:4px 6px;border-radius:var(--rd-radius-xs);cursor:pointer;font-size:13px;' });
                const cb = DOM.create('input', { type: 'checkbox', checked: true, style: 'flex-shrink:0;' });
                cb.dataset.fileId = f.id;
                checkboxes.push(cb);

                const parts = f.path.split('/');
                const fileName = parts.pop();
                const folderPrefix = parts.length > 0 ? parts.join('/') + '/' : '';

                const label = DOM.create('span');
                if (folderPrefix) label.append(DOM.create('span', { textContent: folderPrefix, style: 'opacity:0.5;' }));
                label.append(DOM.create('span', { textContent: fileName, style: 'font-weight:bold;' }));

                row.append(cb, label, DOM.create('span', {
                    textContent: formatBytes(f.bytes),
                    style: 'margin-left:auto;opacity:0.6;font-size:12px;white-space:nowrap;'
                }));
                fileList.append(row);
            });

            container.append(fileList);

            selectAllBtn.addEventListener('click', () => checkboxes.forEach((cb) => { cb.checked = true; }));
            selectNoneBtn.addEventListener('click', () => checkboxes.forEach((cb) => { cb.checked = false; }));

            const cancelBtn = DOM.create('button', { textContent: 'Cancel', className: 'rd-input-btn' });
            const startBtn = DOM.create('button', { textContent: 'Start Download', className: 'rd-input-btn primary' });
            const modal = UI.showModal(title, [container], [cancelBtn, startBtn]);

            cancelBtn.addEventListener('click', () => {
                modal.close();
                API.del('/torrents/delete/' + torrentId);
            });

            startBtn.addEventListener('click', async () => {
                const selectedIds = checkboxes.filter((cb) => cb.checked).map((cb) => cb.dataset.fileId);
                if (selectedIds.length === 0) {
                    UI.showToast('Select at least one file', 'error');
                    return;
                }
                await API.post('/torrents/selectFiles/' + torrentId, { files: selectedIds.join(',') });
                addToHistory({ type: 'success', name: title, url: '#', size: selectedIds.length + ' files' });
                UI.showToast('Torrent started with ' + selectedIds.length + ' files!');
                modal.close();
                finishMagnetAdd(callback);
            });
        }
    };

    async function uploadTorrentFile(file, callback) {
        if (!file || !file.name.endsWith('.torrent')) {
            UI.showToast('Not a .torrent file', 'error');
            return;
        }
        UI.showToast('Uploading torrent...');
        const host = await API.resolveTorrentHost();
        const endpoint = host ? '/torrents/addTorrent?host=' + encodeURIComponent(host) : '/torrents/addTorrent';
        const res = await API.upload(endpoint, file);
        if (!res.ok || !res.data || !res.data.id) {
            UI.showToast('Upload failed: ' + (res.error || 'Unknown'), 'error');
            return;
        }
        UI.showToast('Torrent uploaded — pick files');
        await TorrentPicker.open(res.data.id, callback);
    }

    async function addTorrentFromUrl(url, callback) {
        if (!url || !/\.torrent(\?|#|$)/i.test(url.split('#')[0])) {
            UI.showToast('Not a torrent URL', 'error');
            return;
        }
        UI.showToast('Fetching torrent…');
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                responseType: 'arraybuffer',
                onload: async (resp) => {
                    if (resp.status >= 400) {
                        UI.showToast('Could not fetch torrent (HTTP ' + resp.status + ')', 'error');
                        resolve(false);
                        return;
                    }
                    let name = 'download.torrent';
                    try {
                        const path = new URL(url).pathname;
                        const base = path.split('/').pop();
                        if (base) name = base.includes('.') ? base : base + '.torrent';
                    } catch (_) { /* keep default */ }
                    const file = new File([resp.response], name, { type: 'application/x-bittorrent' });
                    await uploadTorrentFile(file, callback);
                    resolve(true);
                },
                onerror: () => {
                    UI.showToast('Could not fetch torrent', 'error');
                    resolve(false);
                },
                ontimeout: () => {
                    UI.showToast('Torrent fetch timed out', 'error');
                    resolve(false);
                }
            });
        });
    }
