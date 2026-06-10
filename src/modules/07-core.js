// ===================== Core Functions — Link Processing =====================

    function addToHistory(item) {
        item.time = item.time || new Date().toLocaleTimeString();
        State.linkHistory.push(item);
        if (State.linkHistory.length > 500) State.linkHistory = State.linkHistory.slice(-500);
        GM_setValue('rd_link_history', JSON.stringify(State.linkHistory));
        if (item.type === 'success') State.sessionStats.processed++;
        // Update header stats counter if visible
        const statsEl = document.getElementById('rd-session-counter');
        if (statsEl) statsEl.textContent = State.sessionStats.processed + ' processed';
        if (State.currentTab === 'links' && typeof Tabs !== 'undefined' && Tabs.Links) Tabs.Links.refresh();
    }

    async function unrestrictLink(url, silent = false) {
        const { ok, data, error } = await API.post('/unrestrict/link', { link: url });
        if (!ok) {
            addToHistory({ type: 'error', msg: 'Unrestrict failed: ' + error });
            return null;
        }
        const dlUrl = data.download;
        addToHistory({
            type: 'success', name: data.filename,
            url: dlUrl, download: dlUrl,
            size: formatBytes(data.filesize)
        });
        if (!silent) {
            if (State.settings.defaultAction === 'dl') window.open(dlUrl, '_blank');
            else if (State.settings.defaultAction === 'copy') UI.copyToClipboard(dlUrl);
        }
        return dlUrl;
    }

    async function unrestrictLinkOrFolder(url, silent = false, filter = null, callback = null) {
        const { ok, data, error } = await API.post('/unrestrict/link', { link: url });
        if (ok && data && data.download) {
            const dlUrl = data.download;
            addToHistory({
                type: 'success', name: data.filename,
                url: dlUrl, download: dlUrl,
                size: formatBytes(data.filesize)
            });
            if (!silent) {
                if (State.settings.defaultAction === 'dl') window.open(dlUrl, '_blank');
                else if (State.settings.defaultAction === 'copy') UI.copyToClipboard(dlUrl);
            }
            if (callback) callback(dlUrl);
            return dlUrl;
        }
        // Try folder endpoint
        const folderRes = await API.post('/unrestrict/folder', { link: url });
        if (folderRes.ok && Array.isArray(folderRes.data)) {
            let firstUrl = null;
            for (const childUrl of folderRes.data) {
                if (filter && !filter.test(childUrl)) continue;
                const childDl = await unrestrictLink(childUrl, silent);
                if (!firstUrl && childDl) firstUrl = childDl;
            }
            if (callback && firstUrl) callback(firstUrl);
            return firstUrl;
        }
        addToHistory({ type: 'error', msg: 'Failed: ' + (error || 'Unknown error') });
        if (callback) callback(null);
        return null;
    }

    async function handleManualInput(text) {
        const textarea = document.getElementById('rd-manual-input');
        const raw = text || (textarea ? textarea.value : '');
        if (!raw.trim()) return UI.showToast('Nothing to process', 'error');

        const decoded = decodeBase64Heuristic(raw);
        const urls = decoded.match(/https?:\/\/[^\s<>"']+/gi) || [];
        const magnets = decoded.match(/magnet:\?[^\s<>"']+/gi) || [];
        const all = [...new Set([...magnets, ...urls])];

        if (all.length === 0) return UI.showToast('No links found', 'error');
        if (textarea) textarea.value = '';

        for (const link of all) {
            if (State.processedUrls.has(link)) continue;
            State.processedUrls.add(link);
            if (link.startsWith('magnet:')) addMagnet(link);
            else unrestrictLinkOrFolder(link);
        }
    }

    // --- CRUD functions ---

    async function deleteTorrent(id) {
        const { ok } = await API.del('/torrents/delete/' + id);
        if (ok) {
            State.cachedTorrents = State.cachedTorrents.filter(t => t.id !== id);
            if (State.currentTab === 'torrents' && typeof Tabs !== 'undefined') Tabs.Torrents.refresh();
            UI.showToast('Torrent deleted');
        }
    }

    async function deleteCloudItem(id) {
        const { ok } = await API.del('/downloads/delete/' + id);
        if (ok) {
            State.cachedCloud = State.cachedCloud.filter(c => c.id !== id);
            if (State.currentTab === 'cloud' && typeof Tabs !== 'undefined') Tabs.Cloud.refresh();
            UI.showToast('Removed from cloud');
        }
    }

    async function cleanupTorrents() {
        const dead = State.cachedTorrents.filter(t => t.status === 'dead' || t.status === 'error');
        if (dead.length === 0) return UI.showToast('Nothing to clean');
        await Promise.all(dead.map(t => API.del('/torrents/delete/' + t.id)));
        State.cachedTorrents = State.cachedTorrents.filter(t => t.status !== 'dead' && t.status !== 'error');
        if (State.currentTab === 'torrents' && typeof Tabs !== 'undefined') Tabs.Torrents.refresh();
        UI.showToast('Cleaned ' + dead.length + ' dead torrents');
    }

    async function convertPoints() {
        const { ok, error } = await API.post('/settings/convertPoints');
        if (ok) {
            UI.showToast('Points converted! +30 days');
            State.userProfile = null;
            State.trafficData = null;
            if (State.currentTab === 'settings' && typeof Tabs !== 'undefined') Tabs.Settings.render();
        } else {
            UI.showToast('Failed: ' + error, 'error');
        }
    }

    // --- Magnet handling ---

    async function addMagnet(magnet, callback = null) {
        if (!State.queueProcessing) UI.showToast('Sending Magnet...');
        const { ok, data, error } = await API.post('/torrents/addMagnet', { magnet: magnet });
        if (!ok) {
            addToHistory({ type: 'error', msg: 'Magnet Error: ' + error });
            return;
        }

        const torrentId = data.id;

        if (State.settings.magnetAction === 'all') {
            await API.post('/torrents/selectFiles/' + torrentId, { files: 'all' });
            addToHistory({ type: 'success', name: 'Magnet Added', url: '#', size: 'Pending' });
            if (!State.queueProcessing) UI.showToast('Magnet Added Successfully!');
            if (State.currentTab === 'torrents' && typeof Tabs !== 'undefined') Tabs.Torrents.render();
            if (callback) callback();
            return;
        }

        // Need file info for other modes
        const infoRes = await API.get('/torrents/info/' + torrentId);
        if (!infoRes.ok || !infoRes.data || !infoRes.data.files) {
            // Fallback: select all
            await API.post('/torrents/selectFiles/' + torrentId, { files: 'all' });
            addToHistory({ type: 'success', name: 'Magnet Added', url: '#', size: 'Pending' });
            if (!State.queueProcessing) UI.showToast('Magnet Added!');
            if (callback) callback();
            return;
        }

        const files = infoRes.data.files;
        const title = infoRes.data.filename || 'Torrent';

        if (State.settings.magnetAction === 'manual') {
            showTorrentSelectorModal(torrentId, files, title, callback);
            return;
        }

        if (State.settings.magnetAction === 'video') {
            const videoExts = /\.(mp4|mkv|avi|mov|webm)$/i;
            let largestId = null, maxSize = 0;
            files.forEach(f => {
                if (videoExts.test(f.path) && f.bytes > maxSize) { maxSize = f.bytes; largestId = f.id; }
            });
            if (largestId) {
                await API.post('/torrents/selectFiles/' + torrentId, { files: String(largestId) });
                addToHistory({ type: 'success', name: 'Main Video Added', url: '#', size: formatBytes(maxSize) });
                if (!State.queueProcessing) UI.showToast('Main Video Added!');
                if (State.currentTab === 'torrents' && typeof Tabs !== 'undefined') Tabs.Torrents.render();
                if (callback) callback();
            } else {
                // No video found — fallback to manual
                showTorrentSelectorModal(torrentId, files, title, callback);
            }
            return;
        }

        // Smart mode (default)
        let fileIds = 'all';
        if (State.settings.smartFilter) {
            const exts = State.settings.filterExts.split(',').map(e => e.trim().toLowerCase()).filter(e => e);
            if (exts.length > 0) {
                const extRegex = new RegExp('\\.(' + exts.join('|') + ')$', 'i');
                const validFiles = files.filter(f => !extRegex.test(f.path));
                if (validFiles.length > 0) fileIds = validFiles.map(f => f.id).join(',');
            }
        }
        await API.post('/torrents/selectFiles/' + torrentId, { files: fileIds });
        addToHistory({ type: 'success', name: 'Magnet Added', url: '#', size: 'Pending' });
        if (!State.queueProcessing) UI.showToast('Magnet Added Successfully!');
        if (State.currentTab === 'torrents' && typeof Tabs !== 'undefined') Tabs.Torrents.render();
        if (callback) callback();
    }

    // --- Torrent file selector modal ---

    function showTorrentSelectorModal(torrentId, files, title, callback) {
        const container = DOM.create('div', { style: 'display:flex;flex-direction:column;gap:10px;max-height:60vh;' });

        const headerRow = DOM.create('div', { style: 'display:flex;gap:8px;align-items:center;margin-bottom:6px;' });
        const selectAllBtn = DOM.create('button', { textContent: 'Select All', className: 'rd-input-btn' });
        const selectNoneBtn = DOM.create('button', { textContent: 'Select None', className: 'rd-input-btn' });
        headerRow.append(selectAllBtn, selectNoneBtn);
        container.append(headerRow);

        const fileList = DOM.create('div', { style: 'overflow-y:auto;max-height:50vh;display:flex;flex-direction:column;gap:4px;' });
        const checkboxes = [];

        files.forEach(f => {
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

        selectAllBtn.addEventListener('click', () => checkboxes.forEach(cb => { cb.checked = true; }));
        selectNoneBtn.addEventListener('click', () => checkboxes.forEach(cb => { cb.checked = false; }));

        const cancelBtn = DOM.create('button', { textContent: 'Cancel', className: 'rd-input-btn' });
        const startBtn = DOM.create('button', { textContent: 'Start Download', className: 'rd-input-btn primary' });
        const modal = UI.showModal(title, [container], [cancelBtn, startBtn]);

        cancelBtn.addEventListener('click', () => {
            modal.close();
            API.del('/torrents/delete/' + torrentId);
        });

        startBtn.addEventListener('click', async () => {
            const selectedIds = checkboxes.filter(cb => cb.checked).map(cb => cb.dataset.fileId);
            if (selectedIds.length === 0) {
                UI.showToast('Select at least one file', 'error');
                return;
            }
            await API.post('/torrents/selectFiles/' + torrentId, { files: selectedIds.join(',') });
            addToHistory({ type: 'success', name: title, url: '#', size: selectedIds.length + ' files' });
            UI.showToast('Torrent started with ' + selectedIds.length + ' files!');
            modal.close();
            if (State.currentTab === 'torrents' && typeof Tabs !== 'undefined') Tabs.Torrents.render();
            if (callback) callback();
        });
    }

    // --- Queue processing with parallel concurrency ---

    async function processQueue(urls, mode) {
        if (State.queueProcessing) {
            UI.showToast('Queue already running', 'error');
            return;
        }

        const concurrency = 3;
        let completed = 0;
        const total = urls.length;
        const remaining = [...urls];

        State.queueProcessing = true;
        State.queueCancel = false;
        State.queueCompleted = 0;
        State.queueTotal = total;
        UI.setQueueActive(true);
        UI.updateQueueProgress(0, total);
        UI.showToast('Processing 0/' + total + '...');

        const worker = async () => {
            while (remaining.length > 0) {
                if (State.queueCancel) break;
                const url = remaining.shift();
                if (!url) break;
                if (url.startsWith('magnet:')) {
                    await addMagnet(url);
                } else {
                    await unrestrictLinkOrFolder(url, mode === 'queue', null, (finalUrl) => {
                        if (mode === 'dl' && finalUrl) window.open(finalUrl, '_blank');
                    });
                }
                if (State.queueCancel) break;
                completed++;
                State.queueCompleted = completed;
                UI.updateQueueProgress(completed, total);
            }
        };

        const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker());
        await Promise.all(workers);

        const cancelled = State.queueCancel;
        State.queueProcessing = false;
        State.queueCancel = false;
        UI.setQueueActive(false);

        if (cancelled) {
            UI.showToast('Queue cancelled at ' + completed + '/' + total);
        } else {
            UI.showToast('Queue finished (' + total + ')');
        }
    }

    // --- M3U generation ---

    async function generateM3U(name, links) {
        UI.showToast('Generating M3U...');
        let m3u = '#EXTM3U\n';
        for (const link of links) {
            const { ok, data } = await API.post('/unrestrict/link', { link });
            if (ok && data && data.download) {
                m3u += '#EXTINF:-1,' + data.filename + '\n' + data.download + '\n';
            }
        }
        const blob = new Blob([m3u], { type: 'audio/x-mpegurl' });
        const url = URL.createObjectURL(blob);
        const a = DOM.create('a', { href: url, download: name.replace(/[^a-z0-9]/gi, '_') + '.m3u' });
        a.click();
        URL.revokeObjectURL(url);
        UI.showToast('M3U Downloaded!');
    }

    // --- Export helpers ---

    function getExportUrls(scope) {
        if (scope === 'local') return State.linkHistory.filter(h => h.type === 'success').map(h => h.url);
        if (scope === 'page') {
            return Array.from(document.querySelectorAll('.rd-page-chk:checked'))
                .map(c => { const btn = document.querySelector('.rd-page-1click[data-url="' + CSS.escape(c.value) + '"]'); return btn ? btn.dataset.dlUrl : null; })
                .filter(u => u);
        }
        if (scope === 'cloud') {
            return Array.from(document.querySelectorAll('.rd-cloud-chk:checked')).map(c => c.dataset.url);
        }
        return [];
    }

    function formatExport(urls) {
        if (!urls.length) { UI.showToast('No links to export', 'error'); return; }
        let result;
        if (State.settings.exportFormat === 'curl') result = urls.map(u => 'curl -O "' + u + '"').join('\n');
        else if (State.settings.exportFormat === 'wget') result = urls.map(u => 'wget "' + u + '"').join('\n');
        else result = urls.join('\n');
        UI.copyToClipboard(result);
    }

    function exportHistoryJson() {
        if (!State.linkHistory.length) { UI.showToast('No history to export', 'error'); return; }
        const blob = new Blob([JSON.stringify(State.linkHistory, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = DOM.create('a', { href: url, download: 'rd-link-history.json' });
        a.click();
        URL.revokeObjectURL(url);
        UI.showToast('History Exported');
    }

    function isValidHistoryItem(item) {
        if (!item || typeof item !== 'object' || !item.type) return false;
        if (item.type === 'error') return typeof item.msg === 'string';
        if (item.type === 'success') return typeof item.name === 'string' && !!(item.url || item.download);
        return false;
    }

    function importHistoryJson(file) {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result);
                if (!Array.isArray(data)) throw new Error('Expected array');
                const valid = data.filter(isValidHistoryItem);
                if (!valid.length) throw new Error('No valid items');
                State.linkHistory = State.linkHistory.concat(valid).slice(-500);
                GM_setValue('rd_link_history', JSON.stringify(State.linkHistory));
                if (State.currentTab === 'links' && typeof Tabs !== 'undefined' && Tabs.Links) Tabs.Links.render();
                UI.showToast(valid.length + ' item(s) imported');
            } catch (e) {
                UI.showToast('Invalid history file', 'error');
            }
        };
        reader.readAsText(file);
    }
