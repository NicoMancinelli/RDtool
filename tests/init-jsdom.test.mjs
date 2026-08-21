// @vitest-environment jsdom
//
// Locks in init failure UX so the sticky red banner stops nagging:
//   - embedded frames skip Init.start() entirely
//   - UI.init() throw → dismissible banner (not permanent)
//   - Scanner.init() throw after UI mounted → toast, no banner

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const initSrc = readFileSync(join(__dirname, '..', 'src', 'modules', '12-init.js'), 'utf8');

function loadInit(win, { uiInit, scannerInit, apiKey = 'test-key' } = {}) {
    win.__RD_SKIP_AUTO_INIT__ = true;
    win.GM_getValue = (key, def) => def;
    win.GM_setValue = () => {};
    win.State = { apiKey };
    win.UI = {
        init: uiInit || (() => {}),
        showToast: vi.fn()
    };
    win.Scanner = {
        init: scannerInit || (() => {})
    };

    const patched = initSrc
        .replace(/^function loadOfflineData/m, 'var loadOfflineData = function loadOfflineData')
        .replace(/^function isEmbeddedFrame/m, 'var isEmbeddedFrame = function isEmbeddedFrame')
        .replace(/^function whenBodyReady/m, 'var whenBodyReady = function whenBodyReady')
        .replace(/^function showInitErrorBanner/m, 'var showInitErrorBanner = function showInitErrorBanner')
        .replace(/^const Init = /m, 'var Init = ');

    const fn = new win.Function(`
        ${patched}
        return { Init, isEmbeddedFrame, showInitErrorBanner };
    `);
    return fn();
}

describe('Init failure UX (jsdom)', () => {
    let api;

    beforeEach(() => {
        document.body.innerHTML = '';
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        delete globalThis.__RD_SKIP_AUTO_INIT__;
    });

    it('skips start() when running in an embedded frame', () => {
        const uiInit = vi.fn();
        // jsdom window.self === window.top by default; stub a nested frame.
        const top = {};
        Object.defineProperty(window, 'top', { configurable: true, get: () => top });
        Object.defineProperty(window, 'self', { configurable: true, get: () => window });

        api = loadInit(window, { uiInit });
        expect(api.isEmbeddedFrame()).toBe(true);
        api.Init.start();
        expect(uiInit).not.toHaveBeenCalled();
        expect(document.getElementById('rd-error-banner')).toBeNull();
    });

    it('shows a dismissible banner when UI.init() throws', () => {
        Object.defineProperty(window, 'top', { configurable: true, get: () => window });
        Object.defineProperty(window, 'self', { configurable: true, get: () => window });

        api = loadInit(window, {
            uiInit: () => { throw new Error('boom'); }
        });
        api.Init.start();

        const banner = document.getElementById('rd-error-banner');
        expect(banner).toBeTruthy();
        expect(banner.textContent).toMatch(/click to dismiss/i);

        banner.click();
        expect(document.getElementById('rd-error-banner')).toBeNull();
    });

    it('auto-hides the init error banner after 8s', () => {
        Object.defineProperty(window, 'top', { configurable: true, get: () => window });
        Object.defineProperty(window, 'self', { configurable: true, get: () => window });

        api = loadInit(window, {
            uiInit: () => { throw new Error('boom'); }
        });
        api.Init.start();
        expect(document.getElementById('rd-error-banner')).toBeTruthy();

        vi.advanceTimersByTime(8000);
        expect(document.getElementById('rd-error-banner')).toBeNull();
    });

    it('toasts on Scanner.init failure without showing the load banner', () => {
        Object.defineProperty(window, 'top', { configurable: true, get: () => window });
        Object.defineProperty(window, 'self', { configurable: true, get: () => window });

        api = loadInit(window, {
            uiInit: () => {},
            scannerInit: () => { throw new Error('history blocked'); },
            apiKey: 'key'
        });
        api.Init.start();

        expect(document.getElementById('rd-error-banner')).toBeNull();
        expect(window.UI.showToast).toHaveBeenCalledWith('Page scanner failed to start', 'error');
    });
});
