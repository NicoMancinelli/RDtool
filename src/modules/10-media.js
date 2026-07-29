const Media = {
    _objectUrls: [],
    _playlist: null,
    _playlistIndex: 0,
    _keyHandler: null,
    _dragMoveHandler: null,
    _dragUpHandler: null,

    open(url, filename, playlist = null, mode = 'direct') {
        this.close();

        this._playlist = playlist;
        this._playlistIndex = 0;
        this._playMode = mode;

        const win = DOM.create('div', { id: 'rd-media-window' });

        // Determine media type
        const isVideo = /\.(mp4|mkv|webm|mov|avi)$/i.test(filename);
        const isAudio = /\.(mp3|flac|wav|ogg)$/i.test(filename);
        const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(filename);

        // Build header
        const controls = DOM.create('div', { className: 'rd-media-controls' });

        // Playlist prev/next
        if (playlist && playlist.length > 1) {
            controls.append(
                DOM.create('span', { className: 'rd-media-btn', textContent: '\u23EE', title: 'Previous', onClick: () => this._playlistPrev() }),
                DOM.create('span', { className: 'rd-media-btn', textContent: '\u23ED', title: 'Next', onClick: () => this._playlistNext() })
            );
        }

        // PiP button (video only)
        if (isVideo && document.pictureInPictureEnabled) {
            controls.append(DOM.create('span', {
                className: 'rd-media-btn', id: 'rd-media-pip', textContent: '\u23CF\uFE0F', title: 'PiP',
                onClick: async () => {
                    const vid = document.getElementById('rd-cinema-player');
                    if (!vid) return;
                    if (document.pictureInPictureElement) await document.exitPictureInPicture();
                    else await vid.requestPictureInPicture();
                }
            }));
        }

        // Fullscreen toggle
        const maxBtn = DOM.create('span', {
            className: 'rd-media-btn', id: 'rd-media-max', textContent: '\u{1F5D4}', title: 'Fullscreen',
            onClick: () => {
                win.classList.toggle('rd-fullscreen');
                maxBtn.textContent = win.classList.contains('rd-fullscreen') ? '\u{1F5D7}' : '\u{1F5D4}';
            }
        });
        controls.append(maxBtn);

        // Close button
        controls.append(DOM.create('span', {
            className: 'rd-media-btn', style: 'color:var(--rd-danger);', textContent: '\u2715', title: 'Close',
            onClick: () => this.close()
        }));

        const titleChildren = [
            DOM.create('span', { style: 'overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:70%;', textContent: filename })
        ];
        if (mode === 'transcode') {
            titleChildren.push(DOM.create('span', {
                textContent: 'Transcode',
                style: 'font-size:9px;background:var(--rd-warning);color:var(--rd-bg-base);padding:2px 6px;border-radius:6px;margin-left:6px;'
            }));
        }
        const header = DOM.create('div', { id: 'rd-media-drag-handle' }, [
            DOM.create('div', { style: 'display:flex;align-items:center;flex:1;min-width:0;' }, titleChildren),
            controls
        ]);
        win.append(header);

        // Build media content
        if (isVideo) {
            const video = DOM.create('video', {
                id: 'rd-cinema-player', src: url,
                style: 'width:100%; height:calc(100% - 42px); background:black;'
            });
            video.controls = true;
            video.autoplay = true;
            video.playsInline = true;
            // Restore volume
            video.volume = parseFloat(GM_getValue('rd_volume', '1'));
            video.addEventListener('volumechange', () => GM_setValue('rd_volume', String(video.volume)));
            // Auto-advance playlist
            if (playlist && playlist.length > 1) {
                video.addEventListener('ended', () => this._playlistNext());
            }
            win.append(video);
        } else if (isAudio) {
            const audioContainer = DOM.create('div', { style: 'display:flex; flex-direction:column; justify-content:center; align-items:center; height:calc(100% - 42px); background:var(--rd-bg-glass);' });
            audioContainer.append(DOM.create('div', { style: 'font-size:48px; margin-bottom:12px;', textContent: '\u{1F3B5}' }));
            const audio = DOM.create('audio', { src: url, style: 'width:80%;' });
            audio.controls = true;
            audio.autoplay = true;
            audio.volume = parseFloat(GM_getValue('rd_volume', '1'));
            audio.addEventListener('volumechange', () => GM_setValue('rd_volume', String(audio.volume)));
            audioContainer.append(audio);
            win.append(audioContainer);
        } else if (isImage) {
            win.append(DOM.create('img', { src: url, style: 'width:100%; height:calc(100% - 42px); object-fit:contain; background:var(--rd-bg-glass);' }));
        } else {
            const fallback = DOM.create('div', { style: 'padding:24px; text-align:center;' });
            fallback.append(
                DOM.create('div', { textContent: 'Format not natively supported in browser.' }),
                DOM.create('button', {
                    className: 'rd-input-btn primary',
                    textContent: 'Open in External Player',
                    style: 'margin-top:12px;',
                    onClick: () => window.open(getStreamUrl(url), '_self')
                }),
                DOM.create('a', { href: url, target: '_blank', style: 'color:var(--rd-accent); margin-top:12px; display:inline-block; font-weight:bold;', textContent: 'Download File' })
            );
            win.append(fallback);
        }

        // Playlist panel (if applicable)
        if (playlist && playlist.length > 1) {
            win.append(this._buildPlaylistPanel(playlist));
        }

        document.body.appendChild(win);

        // Setup drag
        this._setupDrag(win, header);

        // Setup keyboard
        this._setupKeyboard(win);

        // Mobile: open fullscreen
        if (State.isMobile) {
            win.classList.add('rd-fullscreen');
        }
    },

    close() {
        const win = document.getElementById('rd-media-window');
        if (!win) return;
        // Pause media
        const video = win.querySelector('video');
        const audio = win.querySelector('audio');
        if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
        if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
        // Revoke object URLs
        this._objectUrls.forEach(u => URL.revokeObjectURL(u));
        this._objectUrls = [];
        // Remove keyboard handler
        if (this._keyHandler) { document.removeEventListener('keydown', this._keyHandler); this._keyHandler = null; }
        // Remove drag handlers (avoid listener leak across media sessions)
        if (this._dragMoveHandler) { document.removeEventListener('mousemove', this._dragMoveHandler); this._dragMoveHandler = null; }
        if (this._dragUpHandler) { document.removeEventListener('mouseup', this._dragUpHandler); this._dragUpHandler = null; }
        win.remove();
    },

    _setupDrag(win, handle) {
        let isDragging = false, startX, startY;
        handle.addEventListener('mousedown', (e) => {
            if (e.target.closest('.rd-media-btn')) return;
            isDragging = true;
            startX = e.clientX - win.offsetLeft;
            startY = e.clientY - win.offsetTop;
            document.body.style.userSelect = 'none';
        });
        this._dragMoveHandler = (e) => {
            if (isDragging && !win.classList.contains('rd-fullscreen')) {
                win.style.left = (e.clientX - startX) + 'px';
                win.style.top = (e.clientY - startY) + 'px';
                win.style.bottom = 'auto';
                win.style.right = 'auto';
            }
        };
        this._dragUpHandler = () => { isDragging = false; document.body.style.userSelect = ''; };
        document.addEventListener('mousemove', this._dragMoveHandler);
        document.addEventListener('mouseup', this._dragUpHandler);

        // Touch drag
        let touchStartX, touchStartY;
        handle.addEventListener('touchstart', (e) => {
            if (e.target.closest('.rd-media-btn')) return;
            const touch = e.touches[0];
            touchStartX = touch.clientX - win.offsetLeft;
            touchStartY = touch.clientY - win.offsetTop;
        });
        handle.addEventListener('touchmove', (e) => {
            if (win.classList.contains('rd-fullscreen')) return;
            const touch = e.touches[0];
            win.style.left = (touch.clientX - touchStartX) + 'px';
            win.style.top = (touch.clientY - touchStartY) + 'px';
            win.style.bottom = 'auto';
            win.style.right = 'auto';
        });
    },

    _setupKeyboard(win) {
        this._keyHandler = (e) => {
            if (!document.getElementById('rd-media-window')) return;
            const video = document.getElementById('rd-cinema-player');
            const audio = win.querySelector('audio');
            const media = video || audio;
            if (!media) return;

            switch(e.key) {
                case ' ':
                    e.preventDefault();
                    media.paused ? media.play() : media.pause();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    media.currentTime = Math.max(0, media.currentTime - 10);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    media.currentTime = Math.min(media.duration || 0, media.currentTime + 10);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    media.volume = Math.min(1, media.volume + 0.1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    media.volume = Math.max(0, media.volume - 0.1);
                    break;
                case 'f': case 'F':
                    win.classList.toggle('rd-fullscreen');
                    break;
                case 'p': case 'P':
                    if (video && document.pictureInPictureEnabled) {
                        if (document.pictureInPictureElement) document.exitPictureInPicture();
                        else video.requestPictureInPicture();
                    }
                    break;
                case 'm': case 'M':
                    media.muted = !media.muted;
                    break;
                case 'Escape':
                    if (win.classList.contains('rd-fullscreen')) win.classList.remove('rd-fullscreen');
                    else this.close();
                    break;
            }
        };
        document.addEventListener('keydown', this._keyHandler);
    },

    _buildPlaylistPanel(playlist) {
        const panel = DOM.create('div', {
            style: 'max-height:120px; overflow-y:auto; border-top:1px solid var(--rd-glass-border); background:var(--rd-bg-glass);'
        });
        playlist.forEach((item, idx) => {
            panel.append(DOM.create('div', {
                style: 'padding:6px 12px; font-size:11px; cursor:pointer; color:' + (idx === this._playlistIndex ? 'var(--rd-accent)' : 'var(--rd-text-secondary)') + '; border-bottom:1px solid var(--rd-glass-border);',
                textContent: (idx + 1) + '. ' + item.filename,
                onClick: () => this._playlistJump(idx)
            }));
        });
        return panel;
    },

    _playlistNext() {
        if (!this._playlist || this._playlistIndex >= this._playlist.length - 1) return;
        this._playlistIndex++;
        const item = this._playlist[this._playlistIndex];
        this._updateMediaSrc(item.url, item.filename);
    },

    _playlistPrev() {
        if (!this._playlist || this._playlistIndex <= 0) return;
        this._playlistIndex--;
        const item = this._playlist[this._playlistIndex];
        this._updateMediaSrc(item.url, item.filename);
    },

    _playlistJump(idx) {
        if (!this._playlist || idx < 0 || idx >= this._playlist.length) return;
        this._playlistIndex = idx;
        const item = this._playlist[idx];
        this._updateMediaSrc(item.url, item.filename);
    },

    _updateMediaSrc(url, filename) {
        const video = document.getElementById('rd-cinema-player');
        if (video) { video.src = url; video.play(); }
        const handle = document.getElementById('rd-media-drag-handle');
        if (handle) {
            const nameSpan = handle.querySelector('span');
            if (nameSpan) nameSpan.textContent = filename;
        }
        // Rebuild playlist panel highlighting
        const win = document.getElementById('rd-media-window');
        if (win && this._playlist) {
            const oldPanel = win.querySelector('div[style*="max-height:120px"]');
            if (oldPanel) { oldPanel.replaceWith(this._buildPlaylistPanel(this._playlist)); }
        }
    }
};
