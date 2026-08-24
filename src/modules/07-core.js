// ===================== Core Functions — Link Processing =====================

    function addToHistory(item) {
        item.time = item.time || new Date().toLocaleTimeString();
        if (State.settings.dedupeHistory && item.type === 'success') {
            const urlKey = item.download || item.url;
            if (urlKey && urlKey !== '#') {
                State.linkHistory = State.linkHistory.filter(h => {
                    if (h.type !== 'success') return true;
                    const existing = h.download || h.url;
                    return !existing || existing === '#' || existing !== urlKey;
                });
            }
        }
        State.linkHistory.push(item);
        if (State.linkHistory.length > 500) State.linkHistory = State.linkHistory.slice(-500);
        GM_setValue('rd_link_history', JSON.stringify(State.linkHistory));
        if (item.type === 'success') State.sessionStats.processed++;
        // Update header stats counter if visible
        const statsEl = document.getElementById('rd-session-counter');
        if (statsEl) statsEl.textContent = State.sessionStats.processed + ' processed';
        if (State.currentTab === Config.TAB_KEYS.LINKS && Tabs.Links) Tabs.Links.refresh();
    }

    async function unrestrictLink(url, silent = false) {
        if (State.settings.useUnrestrictCache && State.unrestrictCache.has(url)) {
            const cached = State.unrestrictCache.get(url);
            addToHistory({
                type: 'success', name: cached.name,
                url: cached.url, download: cached.url,
                size: cached.size
            });
            if (!silent) applyDefaultAction(cached.url);
            return cached.url;
        }

        const res = await API.post('/unrestrict/link', { link: url });
        if (!res.ok) {
            addToHistory({ type: 'error', msg: API.describeError(res, 'Unrestrict failed'), sourceUrl: url });
            return null;
        }
        const dlUrl = res.data.download;
        const entry = {
            name: res.data.filename,
            url: dlUrl,
            size: formatBytes(res.data.filesize)
        };
        if (State.settings.useUnrestrictCache) State.unrestrictCache.set(url, entry);
        addToHistory({
            type: 'success', name: entry.name,
            url: dlUrl, download: dlUrl,
            size: entry.size
        });
        if (!silent) applyDefaultAction(dlUrl);
        return dlUrl;
    }

    function applyDefaultAction(url) {
        if (State.settings.defaultAction === 'dl') window.open(url, '_blank');
        else if (State.settings.defaultAction === 'copy') UI.copyToClipboard(url);
    }

    async function unrestrictLinkOrFolder(url, silent = false, filter = null, callback = null) {
        const res = await API.post('/unrestrict/link', { link: url });
        if (res.ok && res.data && res.data.download) {
            const dlUrl = res.data.download;
            addToHistory({
                type: 'success', name: res.data.filename,
                url: dlUrl, download: dlUrl,
                size: formatBytes(res.data.filesize)
            });
            if (!silent) applyDefaultAction(dlUrl);
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
        // Both endpoints failed — the direct-link attempt carries the
        // meaningful diagnosis (the folder fallback is just a retry shape).
        addToHistory({ type: 'error', msg: API.describeError(res, 'Could not unrestrict this link'), sourceUrl: url });
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
            if (State.currentTab === Config.TAB_KEYS.TORRENTS) Tabs.Torrents.refresh();
            UI.showToast('Torrent deleted');
        }
    }

    async function deleteCloudItem(id) {
        const { ok } = await API.del('/downloads/delete/' + id);
        if (ok) {
            State.cachedCloud = State.cachedCloud.filter(c => c.id !== id);
            if (State.currentTab === Config.TAB_KEYS.CLOUD) Tabs.Cloud.refresh();
            UI.showToast('Removed from cloud');
        }
    }

    async function cleanupTorrents() {
        const dead = State.cachedTorrents.filter(t => t.status === 'dead' || t.status === 'error');
        if (dead.length === 0) return UI.showToast('Nothing to clean');
        await Promise.all(dead.map(t => API.del('/torrents/delete/' + t.id)));
        State.cachedTorrents = State.cachedTorrents.filter(t => t.status !== 'dead' && t.status !== 'error');
        if (State.currentTab === Config.TAB_KEYS.TORRENTS) Tabs.Torrents.refresh();
        UI.showToast('Cleaned ' + dead.length + ' dead torrents');
    }

    async function convertPoints() {
        const res = await API.post('/settings/convertPoints');
        if (res.ok) {
            UI.showToast('Points converted! +30 days');
            State.userProfile = null;
            State.trafficData = null;
            if (State.currentTab === Config.TAB_KEYS.SETTINGS) Tabs.Settings.render();
        } else {
            UI.showToast(API.describeError(res, 'Points conversion failed'), 'error');
        }
    }

    // --- Magnet handling ---

    function finishMagnetAdd(callback) {
        if (State.settings.switchToTorrentsOnMagnet) {
            if (!State.isExpanded) {
                if (State.settings.rememberLastTab) GM_setValue('rd_last_tab', Config.TAB_KEYS.TORRENTS);
                State.currentTab = Config.TAB_KEYS.TORRENTS;
                UI.toggleDashboard(true);
            } else if (State.currentTab !== Config.TAB_KEYS.TORRENTS) {
                UI.switchTab(Config.TAB_KEYS.TORRENTS);
            } else if (Tabs.Torrents) {
                Tabs.Torrents.render();
            }
        } else if (State.currentTab === Config.TAB_KEYS.TORRENTS) {
            Tabs.Torrents.render();
        }
        if (callback) callback();
    }

    async function addMagnet(magnet, callback = null) {
        if (!State.queueProcessing) UI.showToast('Sending Magnet...');
        const host = await API.resolveTorrentHost();
        const endpoint = host ? '/torrents/addMagnet?host=' + encodeURIComponent(host) : '/torrents/addMagnet';
        const magnetRes = await API.post(endpoint, { magnet: magnet });
        if (!magnetRes.ok) {
            addToHistory({ type: 'error', msg: 'Magnet Error — ' + API.describeError(magnetRes, 'Magnet failed'), sourceUrl: magnet });
            return;
        }

        const torrentId = magnetRes.data.id;

        if (State.settings.magnetAction === 'all') {
            await API.post('/torrents/selectFiles/' + torrentId, { files: 'all' });
            addToHistory({ type: 'success', name: 'Magnet Added', url: '#', size: 'Pending' });
            if (!State.queueProcessing) UI.showToast('Magnet Added Successfully!');
            finishMagnetAdd(callback);
            return;
        }

        // Need file info for other modes
        const infoRes = await API.get('/torrents/info/' + torrentId);
        if (!infoRes.ok || !infoRes.data || !infoRes.data.files) {
            // Fallback: select all
            await API.post('/torrents/selectFiles/' + torrentId, { files: 'all' });
            addToHistory({ type: 'success', name: 'Magnet Added', url: '#', size: 'Pending' });
            if (!State.queueProcessing) UI.showToast('Magnet Added!');
            finishMagnetAdd(callback);
            return;
        }

        const files = infoRes.data.files;
        const title = infoRes.data.filename || 'Torrent';

        await TorrentPicker.open(torrentId, callback, files, title);
    }

    async function playTorrentVideos(torrent) {
        if (!torrent.links || !torrent.links.length) {
            UI.showToast('No files ready to play', 'error');
            return;
        }
        const videoExts = /\.(mp4|mkv|avi|mov|webm|mp3|flac|wav)$/i;
        const mediaLinks = torrent.links.filter((u) => videoExts.test(u));
        if (!mediaLinks.length) {
            UI.showToast('No playable media in torrent', 'error');
            return;
        }
        UI.showToast('Preparing playlist...');
        const playlist = [];
        for (const link of mediaLinks) {
            const name = link.split('/').pop() || torrent.filename;
            const resolved = await resolvePlayableUrl(link, name);
            playlist.push({ url: resolved.url, filename: name, mode: resolved.mode });
        }
        if (playlist.length && typeof Media !== 'undefined') {
            const subtitles = (typeof Subtitles !== 'undefined')
                ? Subtitles.pickSubtitleFiles(torrent.links)
                : [];
            Media.open(playlist[0].url, playlist[0].filename, playlist, playlist[0].mode, subtitles);
        }
    }

    async function deleteAllCloudItems() {
        const res = await API.deleteAllDownloads();
        if (res.ok) {
            State.cachedCloud = [];
            GM_setValue('rd_cached_cloud', '[]');
            if (State.currentTab === Config.TAB_KEYS.CLOUD) Tabs.Cloud.render();
            UI.showToast('All cloud items deleted');
        } else {
            UI.showToast(API.describeError(res, 'Delete failed'), 'error');
        }
    }

    async function deleteAllTorrentItems() {
        const torrentDeleteRes = await API.deleteAllTorrents();
        if (torrentDeleteRes.ok) {
            State.cachedTorrents = [];
            GM_setValue('rd_cached_torrents', '[]');
            if (State.currentTab === Config.TAB_KEYS.TORRENTS) Tabs.Torrents.render();
            UI.showToast('All torrents deleted');
        } else {
            UI.showToast(API.describeError(torrentDeleteRes, 'Delete failed'), 'error');
        }
    }

    async function renameCloudItem(id, newName) {
        const res = await API.renameDownload(id, newName);
        if (res.ok) {
            const item = State.cachedCloud.find((c) => c.id === id);
            if (item) item.filename = newName;
            if (State.currentTab === Config.TAB_KEYS.CLOUD) Tabs.Cloud.refresh();
            UI.showToast('Renamed');
        } else {
            UI.showToast(API.describeError(res, 'Rename failed'), 'error');
        }
    }

    // --- Queue processing with parallel concurrency ---

    async function processQueue(urls, mode) {
        if (State.queueProcessing) {
            UI.showToast('Queue already running', 'error');
            return;
        }

        const concurrency = Math.max(1, parseInt(State.settings.queueConcurrency, 10) || 3);
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
            if (State.settings.notifyOnQueueComplete) {
                UI.notify('RD Queue Complete', 'Processed ' + total + ' items');
            }
        }
    }

    // --- M3U generation ---

    async function generateM3U(name, links) {
        UI.showToast('Generating M3U...');
        let m3u = '#EXTM3U\n';
        const pending = [...links];
        const lines = [];
        const worker = async () => {
            while (pending.length) {
                const link = pending.shift();
                if (!link) break;
                const { ok, data } = await API.post('/unrestrict/link', { link });
                if (ok && data && data.download) {
                    lines.push('#EXTINF:-1,' + data.filename + '\n' + data.download);
                }
            }
        };
        const pool = Math.min(2, links.length);
        await Promise.all(Array.from({ length: pool }, () => worker()));
        m3u += lines.join('\n') + (lines.length ? '\n' : '');
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

    async function retryHistoryItem(item) {
        const url = item && item.sourceUrl;
        if (!url) return UI.showToast('No source URL to retry', 'error');
        UI.showToast('Retrying...');
        if (url.startsWith('magnet:')) await addMagnet(url);
        else await unrestrictLinkOrFolder(url);
    }

    async function retryAllErrors() {
        const retryable = State.linkHistory.filter(h => h.type === 'error' && h.sourceUrl);
        if (!retryable.length) return UI.showToast('No retryable errors', 'error');
        UI.showToast('Retrying ' + retryable.length + ' item(s)...');
        for (const item of retryable) {
            if (item.sourceUrl.startsWith('magnet:')) await addMagnet(item.sourceUrl);
            else await unrestrictLinkOrFolder(item.sourceUrl, true);
        }
        UI.showToast('Retry complete');
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
                if (State.currentTab === Config.TAB_KEYS.LINKS && Tabs.Links) Tabs.Links.render();
                UI.showToast(valid.length + ' item(s) imported');
            } catch (e) {
                UI.showToast('Invalid history file', 'error');
            }
        };
        reader.readAsText(file);
    }
