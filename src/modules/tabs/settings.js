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

            if (!State.trafficDetails) {
                wrapper.append(DOM.create('button', {
                    className: 'rd-input-btn', textContent: 'Load Traffic Details', style: 'width:100%; margin-bottom:12px;',
                    onClick: async () => {
                        const res = await API.getTrafficDetails();
                        if (res.ok) {
                            State.trafficDetails = res.data;
                            this.render();
                        } else {
                            UI.showToast('Could not load traffic details', 'error');
                        }
                    }
                }));
            } else if (State.trafficDetails && typeof State.trafficDetails === 'object') {
                const detailsSection = DOM.create('div', { style: 'margin-bottom:16px; font-size:11px; color:var(--rd-text-secondary);' });
                detailsSection.append(DOM.create('div', { style: 'font-weight:bold; margin-bottom:6px; color:var(--rd-text-primary);', textContent: 'Traffic Details' }));
                Object.entries(State.trafficDetails).slice(0, 8).forEach(([host, d]) => {
                    detailsSection.append(DOM.create('div', { textContent: host + ': ' + formatBytes(d.bytes || 0) }));
                });
                wrapper.append(detailsSection);
            }

            // --- Preferences ---
            wrapper.append(DOM.create('div', { style: 'font-size:14px; font-weight:bold; margin-bottom:8px; color:var(--rd-success);', textContent: 'Preferences' }));

            // Toggle settings
            const toggleSettings = [
                { key: 'hijack', label: 'Hijack Native Links', desc: 'Clicking host links auto-routes to RD' },
                { key: 'autoShow', label: 'Auto-Show Dashboard' },
                { key: 'rememberLastTab', label: 'Remember Last Tab' },
                { key: 'rememberDashboardOpen', label: 'Remember Dashboard Open', desc: 'Restore dashboard open/closed state across page loads' },
                { key: 'switchToTorrentsOnMagnet', label: 'Switch to Torrents on Magnet', desc: 'Open Torrents tab after a magnet is added successfully' },
                { key: 'openDashboardOnMagnet', label: 'Open Dashboard on Page Magnet', desc: 'Show dashboard when adding a magnet via the inline page icon' },
                { key: 'autoCleanup', label: 'Auto-Clean Dead Torrents' },
                { key: 'smartFilter', label: 'Smart Extension Filter' },
                { key: 'notificationSound', label: 'Notification Sound' },
                { key: 'notifyOnQueueComplete', label: 'Notify on Queue Complete' },
                { key: 'deepScan', label: 'Deep Scan (iframes)', desc: 'Scan links inside iframes — slower' },
                { key: 'dedupeHistory', label: 'Dedupe Link History', desc: 'Replace older entries when the same download URL is added again' },
                { key: 'useUnrestrictCache', label: 'Cache Unrestrict Results', desc: 'Skip API calls for host links already unrestricted this session' },
                { key: 'useApiHostRegex', label: 'Use API Host Regex', desc: 'Use Real-Debrid /hosts/regex for link detection (fallback to built-in list)' }
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
            wrapper.append(this._buildSelectRow('Torrent Refresh Interval', 'torrentPollInterval', [
                ['3', '3 seconds'], ['4', '4 seconds'], ['6', '6 seconds'], ['10', '10 seconds'], ['15', '15 seconds'], ['30', '30 seconds']
            ], () => {
                if (State.currentTab === 'torrents' && typeof Tabs !== 'undefined' && Tabs.Torrents) Tabs.Torrents.startPolling();
            }));
            wrapper.append(this._buildSelectRow('Queue Concurrency', 'queueConcurrency', [
                ['1', '1 (safest)'], ['2', '2'], ['3', '3 (default)'], ['5', '5'], ['8', '8 (fastest)']
            ]));
            wrapper.append(this._buildSelectRow('Cloud History Limit', 'cloudLimit', [
                ['50', '50 items'], ['100', '100 items'], ['250', '250 items'], ['500', '500 items']
            ], () => {
                if (State.currentTab === 'cloud' && typeof Tabs !== 'undefined' && Tabs.Cloud) Tabs.Cloud.render();
            }));
            wrapper.append(this._buildSelectRow('API Rate Limit', 'apiRateLimit', [
                ['2', '2 req/s'], ['4', '4 req/s (default)'], ['6', '6 req/s'], ['8', '8 req/s']
            ]));
            wrapper.append(this._buildSelectRow('Max Links Per Scan', 'maxLinksPerScan', [
                ['50', '50'], ['150', '150 (default)'], ['300', '300'], ['500', '500']
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
            wrapper.append(DOM.create('button', {
                className: 'rd-input-btn', textContent: 'Clear Session Caches', style: 'width:100%; margin-top:8px;',
                onClick: () => {
                    State.unrestrictCache.clear();
                    State.linkCheckCache.clear();
                    State.pageLinkCache.clear();
                    UI.showToast('Session caches cleared');
                }
            }));

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

        _buildSelectRow(label, key, options, onChange) {
            const row = DOM.create('div', { className: 'rd-account-row', style: 'display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--rd-glass-border); font-size:12px;' });
            row.append(DOM.create('span', { textContent: label }));
            const select = DOM.create('select', { className: 'rd-select' });
            for (const [val, text] of options) {
                const opt = DOM.create('option', { value: val, textContent: text });
                if (String(State.settings[key]) === val) opt.selected = true;
                select.append(opt);
            }
            select.addEventListener('change', () => {
                State.settings[key] = select.value;
                saveSettings();
                UI.showToast(label + ' Updated');
                if (onChange) onChange();
            });
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
            const includeKey = confirm('Include API key in backup?\n\nOK = include key\nCancel = settings only');
            const data = { settings: State.settings };
            if (includeKey) data.apiKey = State.apiKey;
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
