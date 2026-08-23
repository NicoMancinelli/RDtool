// --- Subtitle Module ---
// =========================================================================
// Sidecar subtitle support for the Media player (v42.0).
//
// Detects .srt/.ass/.ssa/.vtt siblings in torrent link lists, converts
// SRT/ASS text to WebVTT (the only format <track> understands), and hands
// blob: URLs back to Media. All network access goes through
// GM_xmlhttpRequest because host-file servers rarely send CORS headers,
// which plain fetch()-based <track src> loading requires.
//
// The text transforms (srtToVtt / assToVtt / guessLang / pickSubtitleFiles)
// are pure functions covered by tests/subtitles.test.mjs.

const Subtitles = {
    SUBTITLE_RE: /\.(srt|ass|ssa|vtt)$/i,
    _CUE_TIMING_RE: /^\s*(\d{1,2}:)?\d{1,2}:\d{1,2}[.,]\d{1,3}\s-->\s(\d{1,2}:)?\d{1,2}:\d{1,2}[.,]\d{1,3}/,
    _LANG_MAP: {
        eng: 'en', fre: 'fr', fra: 'fr', ger: 'de', deu: 'de', spa: 'es',
        ita: 'it', por: 'pt', rus: 'ru', dut: 'nl', nld: 'nl', pol: 'pl',
        tur: 'tr', jpn: 'ja', kor: 'ko', chi: 'zh', zho: 'zh', ara: 'ar',
        hin: 'hi', swe: 'sv', nor: 'no', dan: 'da', fin: 'fi'
    },

    /** True when a filename looks like a sidecar subtitle file. */
    isSubtitleFile(filename) {
        return typeof filename === 'string' && Subtitles.SUBTITLE_RE.test(filename);
    },

    /**
     * Pick subtitle entries out of a mixed torrent/cloud link list.
     * Returns [{ url, filename }] preserving original order.
     */
    pickSubtitleFiles(links) {
        const subs = [];
        for (const url of Array.isArray(links) ? links : []) {
            if (typeof url !== 'string') continue;
            const name = decodeURIComponent(url.split('?')[0].split('/').pop() || '');
            if (Subtitles.isSubtitleFile(name)) subs.push({ url: url, filename: name });
        }
        return subs;
    },

    /** Best-effort BCP-47-ish language guess from naming: movie.en.srt, show.eng.srt */
    guessLang(filename) {
        const m = (filename || '').match(/\.([a-z]{2,3})\.(?:srt|ass|ssa|vtt)$/i);
        if (!m) return '';
        const code = m[1].toLowerCase();
        if (Subtitles._LANG_MAP[code]) return Subtitles._LANG_MAP[code];
        return code.length === 2 ? code : '';
    },

    /** Human label for the track menu: basename with language token removed. */
    label(filename) {
        let base = (filename || '').split('/').pop().replace(/\.(srt|ass|ssa|vtt)$/i, '');
        const m = base.match(/\.([a-z]{2,3})$/i);
        if (m) {
            const code = m[1].toLowerCase();
            const lang = Subtitles.guessLang(base + '.srt');
            // Strip the token only when it is a real language code (either
            // spelling) — "movie.proper.srt" keeps its release tag.
            if (lang && (code === lang || Subtitles._LANG_MAP[code] === lang)) {
                base = base.slice(0, -m[0].length);
            }
        }
        return base;
    },

    /** Dispatch to the right converter based on the filename extension. */
    toVtt(text, filename) {
        if (!text) return '';
        if (/\.vtt$/i.test(filename || '')) {
            return /^WEBVTT/i.test(text.trim()) ? text : 'WEBVTT\n\n' + text.trim() + '\n';
        }
        if (/\.ass$|\.ssa$/i.test(filename || '')) return Subtitles.assToVtt(text);
        return Subtitles.srtToVtt(text);
    },

    /**
     * SRT -> WebVTT. Handles both CRLF and LF input, drops ordinal cue
     * numbers, normalizes ",mmm" millisecond separators to ".mmm", and
     * prepends the WEBVTT magic when missing.
     */
    srtToVtt(text) {
        const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
        const out = ['WEBVTT'];
        let sawCue = false;
        for (const line of lines) {
            if (Subtitles._CUE_TIMING_RE.test(line)) {
                out.push('');
                // ",mmm" -> ".mmm" with milliseconds padded to 3 digits
                out.push(line.replace(/(\d{1,2}:\d{1,2}:\d{1,2}),(\d{1,3})/g,
                    (all, ts, ms) => ts + '.' + ms.padEnd(3, '0')).trim());
                sawCue = true;
            } else if (/^\s*\d+\s*$/.test(line)) {
                continue; // ordinal counter — WebVTT allows but doesn't need it
            } else {
                out.push(line.replace(/\s+$/, ''));
            }
        }
        return sawCue ? out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n' : '';
    },

    /**
     * ASS/SSA -> WebVTT. Reads the [Events] Format line to locate the
     * Start/End/Text columns, converts H:MM:SS.CC timings, strips {...}
     * override blocks, and turns \N/\n escapes into real newlines.
     */
    assToVtt(text) {
        const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
        let formatCols = null;
        const cues = [];

        const tsToVtt = (ts) => {
            const m = ts.trim().match(/^(\d+):(\d{1,2}):(\d{1,2})[.,](\d{1,3})$/);
            if (!m) return null;
            const cs = m[4].length === 1 ? m[4] + '0' : m[4]; // centiseconds -> millis
            return [
                m[1].padStart(2, '0'),
                m[2].padStart(2, '0'),
                m[3].padStart(2, '0')
            ].join(':') + '.' + cs.padEnd(3, '0');
        };

        for (const line of lines) {
            const trimmed = line.trim();
            if (/^format\s*:/i.test(trimmed)) {
                formatCols = trimmed.slice(trimmed.indexOf(':') + 1).split(',').map((c) => c.trim().toLowerCase());
                continue;
            }
            if (/^dialogue\s*:/i.test(trimmed)) {
                const parts = trimmed.slice(trimmed.indexOf(':') + 1).split(',');
                const cols = formatCols || ['layer', 'start', 'end', 'style', 'name', 'marginl', 'marginr', 'marginv', 'effect', 'text'];
                const col = (name) => cols.indexOf(name);
                if (col('start') < 0 || col('end') < 0 || col('text') < 0) continue;
                const start = tsToVtt(parts[col('start')] || '');
                const end = tsToVtt(parts[col('end')] || '');
                // Text is the last field and may itself contain commas.
                const textCol = col('text');
                const rawText = cols[textCol] === 'text'
                    ? parts.slice(textCol).join(',')
                    : (parts[textCol] || '');
                if (start == null || end == null) continue;
                const body = rawText
                    .replace(/\{[^}]*\}/g, '')   // override/drawing blocks
                    .replace(/\\N|\\n/g, '\n')   // hard breaks
                    .trim();
                if (!body) continue;
                cues.push(start + ' --> ' + end + '\n' + body);
            }
        }
        if (!cues.length) return '';
        return 'WEBVTT\n\n' + cues.join('\n\n') + '\n';
    },

    /**
     * Fetch + convert one subtitle entry into a playable track descriptor
     * ({ url: blobUrl, lang, label }) or null when unreachable/unparsable.
     * Blob URLs are registered on Media._objectUrls so Media.close()
     * revokes them with the rest of the player's lifecycle.
     */
    async loadTrack(sub) {
        if (!sub || !sub.url) return null;
        const raw = await new Promise((resolve) => {
            try {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: sub.url,
                    timeout: 15000,
                    onload: (r) => resolve(r && r.responseText),
                    onerror: () => resolve(null),
                    onabort: () => resolve(null),
                    ontimeout: () => resolve(null)
                });
            } catch (e) {
                resolve(null);
            }
        });
        if (!raw) return null;
        const vtt = Subtitles.toVtt(raw, sub.filename);
        if (!vtt) return null;
        const blobUrl = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
        if (typeof Media !== 'undefined' && Array.isArray(Media._objectUrls)) {
            Media._objectUrls.push(blobUrl);
        }
        return {
            url: blobUrl,
            lang: Subtitles.guessLang(sub.filename),
            label: Subtitles.label(sub.filename) || 'Subtitles'
        };
    }
};
