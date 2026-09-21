// @vitest-environment jsdom
//
// Regression: on a host file page with RD's path-catch-all /hosts/regex
// (mediafire.com/*), same-site chrome links must not get ⚡ icons. Cross-host
// mirrors still do. Download via RD covers the page URL itself.

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { JSDOM } from 'jsdom';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configSrc = readFileSync(join(__dirname, '..', 'src', 'modules', '01-config.js'), 'utf8');
const scannerSrc = readFileSync(join(__dirname, '..', 'src', 'modules', '09-scanner.js'), 'utf8');

const PAGE_URL = 'https://www.mediafire.com/file/abc123456789012/movie.mkv';

function buildDom() {
    const html = `
      <nav>
        <a href="https://www.mediafire.com/">Home</a>
        <a href="https://www.mediafire.com/upgrade">Upgrade</a>
        <a href="https://www.mediafire.com/login">Login</a>
        <a href="https://www.mediafire.com/about">About</a>
        <a href="#">Premium Download</a>
        <a href="javascript:void(0)">Free Download</a>
      </nav>
      <a href="https://www.mediafire.com/file/abc123456789012/movie.mkv">Download</a>
      <a href="https://www.mediafire.com/file/abc123456789012/movie.mkv?ref=btn">Download tracked</a>
      <a id="mirror" href="https://rapidgator.net/file/8dea9e71ecacdcedc6a239f39537fa59/movie.mkv">Rapidgator mirror</a>
    `;
    return new JSDOM(html, { url: PAGE_URL, pretendToBeVisual: true });
}

function loadScanner(win) {
    const mediafireCatchAll =
        /(?:https?):\/\/(?:\w+\.)?mediafire\.com\/([^( |"|'|>|<|\r\n|\r|\n|:|$)]+)/i;
    const rapidgatorFile =
        /(?:https?):\/\/(?:\w+\.)?rapidgator\.(?:net|asia)\/file\/[0-9a-z]{32}/i;

    const State = {
        apiKey: 'test',
        settings: {
            useApiHostRegex: true,
            inlinePageIcons: true,
            hijack: false,
            maxLinksPerScan: '150',
            deepScan: false
        },
        dynamicHosts: [],
        apiHostRegex: new RegExp('(?:' + mediafireCatchAll.source + '|' + rapidgatorFile.source + ')', 'i'),
        liveHosts: {},
        scannedLinksMap: new Map(),
        processedUrls: new Set(),
        pageCollapsedDomains: new Set(),
        linkCheckCache: new Map(),
        pageLinkCache: new Map(),
        magnetCacheQueue: [],
        cacheCheckTimer: null,
        currentTab: 'links',
        isExpanded: false,
        isMobile: false,
        lastUrl: win.location.href
    };
    win.State = State;
    globalThis.State = State;

    win.GM_getValue = () => '';
    win.GM_setValue = () => {};
    globalThis.GM_getValue = win.GM_getValue;
    globalThis.GM_setValue = win.GM_setValue;

    const configPatched = configSrc.replace(/^const Config = /m, 'var Config = ');
    const configFn = new Function('State', 'GM_getValue', 'GM_setValue', 'navigator', 'localStorage', `
        ${configPatched}
        return Config;
    `);
    const Config = configFn(
        State,
        win.GM_getValue,
        win.GM_setValue,
        win.navigator,
        win.localStorage || { getItem: () => null, setItem: () => {} }
    );
    Config.hostRegex = Config.getActiveRegex();
    win.Config = Config;

    win.DOM = {
        create(tag, attrs = {}, children = []) {
            const el = win.document.createElement(tag);
            for (const [key, value] of Object.entries(attrs)) {
                if (key === 'className') el.className = value;
                else if (key === 'textContent') el.textContent = value;
                else if (key === 'dataset' && typeof value === 'object') {
                    for (const [dk, dv] of Object.entries(value)) el.dataset[dk] = dv;
                } else if (key.startsWith('on') && typeof value === 'function') {
                    el.addEventListener(key.slice(2).toLowerCase(), value);
                } else if (value != null) {
                    el.setAttribute(key, value);
                }
            }
            for (const child of [].concat(children || [])) {
                if (child == null) continue;
                if (typeof child === 'string') el.appendChild(win.document.createTextNode(child));
                else el.appendChild(child);
            }
            return el;
        }
    };

    win.UI = {
        updateBadge() {},
        updateFabVisibility() {},
        showToast() {},
        openTab() {},
        copyToClipboard() {}
    };
    win.Tabs = { Page: { refresh() {} }, Settings: {} };
    win.API = { post: async () => ({ ok: false, data: null }), get: async () => ({ ok: false }) };
    win.unrestrictLinkOrFolder = () => {};
    win.addMagnet = () => {};
    win.addTorrentFromUrl = () => {};
    win.addMobileLongPress = () => {};
    win.formatBytes = () => '';
    win.decodeBase64Heuristic = () => null;

    const scannerPatched = scannerSrc.replace(/^const Scanner = /m, 'var Scanner = ');
    const scanFn = new Function(
        'Config', 'State', 'DOM', 'UI', 'Tabs', 'API',
        'unrestrictLinkOrFolder', 'addMagnet', 'addTorrentFromUrl',
        'addMobileLongPress', 'formatBytes', 'decodeBase64Heuristic',
        'document', 'window', 'location', 'clearTimeout', 'setTimeout',
        `
        ${scannerPatched}
        return Scanner;
    `
    );
    return scanFn(
        Config, State, win.DOM, win.UI, win.Tabs, win.API,
        win.unrestrictLinkOrFolder, win.addMagnet, win.addTorrentFromUrl,
        win.addMobileLongPress, win.formatBytes, win.decodeBase64Heuristic,
        win.document, win, win.location, win.clearTimeout.bind(win), win.setTimeout.bind(win)
    );
}

describe('Scanner._scanDocument — host file page icon spam', () => {
    let dom;
    let win;
    let Scanner;

    beforeEach(() => {
        dom = buildDom();
        win = dom.window;
        // Align vitest globals that URL/anchor resolution may touch.
        globalThis.document = win.document;
        globalThis.window = win;
        globalThis.HTMLElement = win.HTMLElement;
        globalThis.Node = win.Node;
        Scanner = loadScanner(win);
    });

    it('does not paint icons on same-site chrome; keeps cross-host mirror icon', () => {
        const Config = win.Config;
        const State = win.State;
        expect(Config.hostRegex.test(PAGE_URL)).toBe(true);
        expect(Scanner.isHostFilePageUrl(PAGE_URL)).toBe(true);

        // Catch-all would match every pathy mediafire URL (the bug).
        expect(Config.hostRegex.test('https://www.mediafire.com/upgrade')).toBe(true);
        expect(Config.hostRegex.test('https://www.mediafire.com/login')).toBe(true);

        Scanner._scanDocument(win.document);

        const icons = [...win.document.querySelectorAll('.rd-inline-icon')];
        const hrefs = icons.map((icon) => {
            const prev = icon.previousElementSibling;
            return prev ? prev.getAttribute('href') : null;
        });

        expect(hrefs).toEqual([
            'https://rapidgator.net/file/8dea9e71ecacdcedc6a239f39537fa59/movie.mkv'
        ]);
        expect(State.scannedLinksMap.size).toBe(1);
        expect(State.scannedLinksMap.has(
            'https://rapidgator.net/file/8dea9e71ecacdcedc6a239f39537fa59/movie.mkv'
        )).toBe(true);

        // Page URL still offered via Download via RD helpers (not via inline icon).
        expect(Scanner.getHostDownloadUrls()).toEqual([
            PAGE_URL,
            'https://rapidgator.net/file/8dea9e71ecacdcedc6a239f39537fa59/movie.mkv'
        ]);
    });

    it('still icons host links on a non-host page (forum thread)', () => {
        const forum = new JSDOM(`
          <a href="https://www.mediafire.com/file/abc123456789012/movie.mkv">MF</a>
          <a href="https://www.mediafire.com/upgrade">Upgrade ad</a>
        `, { url: 'https://forum.example/thread/1' });
        const fwin = forum.window;
        globalThis.document = fwin.document;
        globalThis.window = fwin;
        globalThis.HTMLElement = fwin.HTMLElement;
        globalThis.Node = fwin.Node;
        const ForumScanner = loadScanner(fwin);

        ForumScanner._scanDocument(fwin.document);
        const hrefs = [...fwin.document.querySelectorAll('.rd-inline-icon')].map((icon) =>
            icon.previousElementSibling.getAttribute('href')
        );
        // Both match catch-all; neither is skipped (page is not a host file page).
        expect(hrefs).toContain('https://www.mediafire.com/file/abc123456789012/movie.mkv');
        expect(hrefs).toContain('https://www.mediafire.com/upgrade');
    });
});
