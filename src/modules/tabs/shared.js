    function makeDeselectAllBtn(checkboxSelector, selectAllChk) {
        return DOM.create('button', {
            className: 'rd-input-btn', textContent: 'None', style: 'margin:0;',
            onClick: () => {
                document.querySelectorAll(checkboxSelector).forEach(cb => { cb.checked = false; });
                if (selectAllChk) { selectAllChk.checked = false; selectAllChk.indeterminate = false; }
                UI.showToast('Selection cleared');
            }
        });
    }

    function makeInvertBtn(checkboxSelector, selectAllChk) {
        return DOM.create('button', {
            className: 'rd-input-btn', textContent: 'Invert', style: 'margin:0;',
            onClick: () => {
                const boxes = document.querySelectorAll(checkboxSelector);
                let checked = 0;
                boxes.forEach(cb => { cb.checked = !cb.checked; if (cb.checked) checked++; });
                if (selectAllChk) {
                    selectAllChk.checked = checked === boxes.length;
                    selectAllChk.indeterminate = checked > 0 && checked < boxes.length;
                }
                UI.showToast('Inverted (' + checked + ' selected)');
            }
        });
    }

    function makeCopyUrlsBtn(getUrls) {
        return DOM.create('button', {
            className: 'rd-input-btn', textContent: 'Copy URLs', style: 'margin:0;',
            onClick: (e) => {
                const urls = getUrls();
                if (!urls.length) { UI.showToast('No URLs to copy', 'error'); return; }
                UI.copyToClipboard(urls.join('\n'), e.currentTarget);
                UI.showToast('Copied ' + urls.length + ' URL' + (urls.length === 1 ? '' : 's'));
            }
        });
    }

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

    function isPageLinkUncached(url) {
        const cached = State.pageLinkCache.get(url);
        if (cached === 'cached') return false;
        if (cached === 'uncached') return true;
        if (url.startsWith('magnet:')) {
            for (const link of document.querySelectorAll('a.rd-processed')) {
                if ((link.href || '') !== url) continue;
                const icon = link.nextElementSibling;
                if (icon && icon.classList.contains('rd-inline-icon')) {
                    return icon.classList.contains('uncached') || !icon.classList.contains('cached');
                }
                return true;
            }
        }
        return cached !== 'cached';
    }

    function getPageLinkBadge(url, linkType) {
        if (linkType === 'magnet') {
            const cached = State.pageLinkCache.get(url);
            if (cached === 'cached') return { text: 'Cached', color: 'var(--rd-success)' };
            if (cached === 'uncached') return { text: 'Uncached', color: 'var(--rd-warning)' };
            return { text: 'Magnet', color: 'var(--rd-text-secondary)' };
        }
        const status = State.pageLinkCache.get(url);
        if (status === 'cached') return { text: 'Cached', color: 'var(--rd-success)' };
        if (status === 'uncached') return { text: 'Uncached', color: 'var(--rd-warning)' };
        if (status === 'down') return { text: 'Host down', color: 'var(--rd-danger)' };
        return { text: 'Unknown', color: 'var(--rd-text-secondary)' };
    }
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
