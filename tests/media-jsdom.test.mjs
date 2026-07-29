// @vitest-environment jsdom
//
// End-to-end test for Media.open() and Media.close() using real jsdom DOM.
//
// What we lock in:
//   - Media.open(url, 'movie.mp4') creates #rd-media-window with a <video>
//   - Media.open() also registers document-level listeners (keydown, mousemove,
//     mouseup) that must be cleaned up by Media.close()
//   - Media.open() called twice replaces the window (single instance invariant)
//   - Media.close() with no window open is a safe no-op
//
// Approach: load the Media module source as text and eval it inside the jsdom
// global scope with stubbed GM_* + State + DOM + window dependencies. This
// mirrors how the userscript concatenates modules at build time, so behavior
// observed here is what real users will see — not a hand-rolled stub.

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mediaSrcPath = join(__dirname, '..', 'src', 'modules', '10-media.js');
const mediaSrc = readFileSync(mediaSrcPath, 'utf8');

// Minimal globals Media needs. Anything Media references but we don't stub
// will throw on first access — that's intentional: it surfaces new deps early.
function installStubs(win) {
    // GM_* — Tampermonkey storage. We track writes so tests can assert.
    const gmStore = new Map();
    win.GM_getValue = (key, def) => (gmStore.has(key) ? gmStore.get(key) : def);
    win.GM_setValue = (key, val) => { gmStore.set(key, String(val)); };
    win.GM_notification = () => {};
    win.GM_setClipboard = () => {};
    win.GM_addStyle = () => {};
    win.GM_xmlhttpRequest = () => {};

    // State — minimum surface Media touches.
    win.State = { isMobile: false };

    // DOM helper — a tiny subset of src/modules/05-dom.js that's enough for
    // Media.open() to build the media window. Real DOM.create does more (style
    // objects, dataset, htmlContent) but Media only uses string style + className
    // + textContent + onClick + append.
    win.DOM = {
        create(tag, attrs = {}, children = []) {
            const el = win.document.createElement(tag);
            for (const [key, value] of Object.entries(attrs)) {
                if (key === 'className') el.className = value;
                else if (key === 'textContent') el.textContent = value;
                else if (key === 'style' && typeof value === 'string') el.style.cssText = value;
                else if (key.startsWith('on') && typeof value === 'function') {
                    el.addEventListener(key.slice(2).toLowerCase(), value);
                } else if (value != null) {
                    el.setAttribute(key, value);
                }
            }
            for (const child of [].concat(children)) {
                if (child == null) continue;
                if (Array.isArray(child)) {
                    for (const c of child) if (c != null) el.appendChild(c);
                } else if (typeof child === 'string') {
                    el.appendChild(win.document.createTextNode(child));
                } else {
                    el.appendChild(child);
                }
            }
            return el;
        }
    };

    // window.open for the external-player fallback path (not exercised here).
    win.window = win;
    // URL.revokeObjectURL — Media.open never adds to _objectUrls unless a
    // caller does, but close() unconditionally calls revokeObjectURL on each.
    if (!win.URL) win.URL = win.URL || globalThis.URL;
    if (!win.URL.revokeObjectURL) win.URL.revokeObjectURL = () => {};
    if (!win.URL.createObjectURL) win.URL.createObjectURL = () => 'blob:stub';

    return { gmStore };
}

// Evaluate Media source in the jsdom window's global scope. We append a
// `return Media;` line so we capture the local binding. The source declares
// `const Media = { ... };` at top level — `const` in non-module eval attaches
// to the surrounding global lexical environment but isn't a property of
// `globalThis`. Stripping `const` and re-declaring via `var` makes the value
// reachable from the eval result.
function loadMediaInto(win) {
    const patched = mediaSrc
        .replace(/^const Media = /m, 'var Media = ');
    const fn = new win.Function(`
        ${patched}
        return Media;
    `);
    return fn();
}

describe('Media.open / Media.close (jsdom)', () => {
    let Media;

    beforeEach(() => {
        installStubs(window);
        Media = loadMediaInto(window);
    });

    it('open() mounts a media window containing a <video> for .mp4 URLs', () => {
        Media.open('https://example.com/movie.mp4', 'movie.mp4');
        const win = document.getElementById('rd-media-window');
        expect(win).toBeTruthy();
        const video = document.getElementById('rd-cinema-player');
        expect(video).toBeTruthy();
        expect(video.tagName).toBe('VIDEO');
        expect(video.src).toBe('https://example.com/movie.mp4');
    });

    it('open() registers document listeners that close() releases', () => {
        // Spy on document add/remove to count listeners.
        const adds = [];
        const removes = [];
        const origAdd = document.addEventListener.bind(document);
        const origRemove = document.removeEventListener.bind(document);
        document.addEventListener = (type, handler, opts) => {
            adds.push({ type, handler });
            return origAdd(type, handler, opts);
        };
        document.removeEventListener = (type, handler, opts) => {
            removes.push({ type, handler });
            return origRemove(type, handler, opts);
        };

        try {
            Media.open('https://example.com/movie.mp4', 'movie.mp4');

            // open() installs: mousemove, mouseup (drag), keydown (keyboard).
            const addedTypes = new Set(adds.map((a) => a.type));
            expect(addedTypes.has('mousemove')).toBe(true);
            expect(addedTypes.has('mouseup')).toBe(true);
            expect(addedTypes.has('keydown')).toBe(true);

            // Track handler identity — every remove must match a prior add so
            // removeEventListener actually unregisters the same reference.
            const addedKeys = adds.map((a) => `${a.type}#${a.handler}`);
            const removedKeys = removes.map((r) => `${r.type}#${r.handler}`);

            Media.close();

            // After close(): at minimum, mousemove, mouseup, keydown must each
            // have been removed by reference.
            for (const type of ['mousemove', 'mouseup', 'keydown']) {
                const addedRef = adds.find((a) => a.type === type);
                expect(addedRef, `open() should add ${type}`).toBeTruthy();
                const removedRef = removes.find(
                    (r) => r.type === type && r.handler === addedRef.handler
                );
                expect(removedRef, `close() should remove ${type} by ref`).toBeTruthy();
            }

            // And the DOM node itself is gone.
            expect(document.getElementById('rd-media-window')).toBeNull();

            // Sanity: every removed handler was previously added (no phantom removes).
            for (const k of removedKeys) {
                expect(addedKeys.includes(k), `removed handler ${k} was never added`).toBe(true);
            }
        } finally {
            document.addEventListener = origAdd;
            document.removeEventListener = origRemove;
        }
    });

    it('open() twice replaces the single media window (no duplicates)', () => {
        Media.open('https://example.com/a.mp4', 'a.mp4');
        Media.open('https://example.com/b.mp4', 'b.mp4');
        const all = document.querySelectorAll('#rd-media-window');
        expect(all.length).toBe(1);
        const video = document.getElementById('rd-cinema-player');
        expect(video.src).toBe('https://example.com/b.mp4');
    });

    it('close() with no window open is a safe no-op', () => {
        // Should not throw.
        expect(() => Media.close()).not.toThrow();
        // After no-op close, opening still works.
        Media.open('https://example.com/c.mp4', 'c.mp4');
        expect(document.getElementById('rd-media-window')).toBeTruthy();
    });

    it('audio filename mounts <audio> element, image mounts <img>, unknown mounts fallback link', () => {
        Media.open('https://example.com/song.mp3', 'song.mp3');
        expect(document.querySelector('#rd-media-window audio')).toBeTruthy();
        Media.close();

        Media.open('https://example.com/cover.jpg', 'cover.jpg');
        const img = document.querySelector('#rd-media-window img');
        expect(img).toBeTruthy();
        expect(img.src).toBe('https://example.com/cover.jpg');
        Media.close();

        Media.open('https://example.com/notes.zip', 'notes.zip');
        const win = document.getElementById('rd-media-window');
        expect(win).toBeTruthy();
        expect(win.querySelector('video')).toBeNull();
        expect(win.querySelector('audio')).toBeNull();
        expect(win.querySelector('img')).toBeNull();
        expect(win.textContent).toContain('Format not natively supported');
    });
});