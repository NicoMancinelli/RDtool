import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configSrc = readFileSync(join(__dirname, '..', 'src', 'modules', '01-config.js'), 'utf8');
const scannerSrc = readFileSync(join(__dirname, '..', 'src', 'modules', '09-scanner.js'), 'utf8');

function loadConfig() {
    // Minimal State surface getActiveRegex reads.
    globalThis.State = {
        settings: { useApiHostRegex: false, customHosts: '' },
        dynamicHosts: [],
        apiHostRegex: null
    };
    globalThis.GM_getValue = () => '';
    globalThis.GM_setValue = () => {};
    if (typeof globalThis.localStorage === 'undefined') {
        globalThis.localStorage = { getItem: () => null, setItem: () => {} };
    }
    if (typeof globalThis.navigator === 'undefined') {
        globalThis.navigator = { userAgent: 'node', maxTouchPoints: 0 };
    }

    const patched = configSrc
        .replace(/^const Config = /m, 'var Config = ');
    const fn = new Function(`${patched}\nreturn Config;`);
    return fn();
}

function loadIsScannableHref() {
    // Pull the method body via a tiny stub Scanner object.
    const match = scannerSrc.match(/isScannableHref\(rawHref\) \{[\s\S]*?\n {4}\},/);
    if (!match) throw new Error('isScannableHref not found');
    const fn = new Function(`
        const Scanner = { ${match[0]} };
        return Scanner.isScannableHref.bind(Scanner);
    `);
    return fn();
}

function loadIsHostFilePageUrl(Config) {
    globalThis.Config = Config;
    const match = scannerSrc.match(/isHostFilePageUrl\(url\) \{[\s\S]*?\n {4}\},/);
    if (!match) throw new Error('isHostFilePageUrl not found');
    const fn = new Function(`
        const Scanner = { ${match[0]} };
        return Scanner.isHostFilePageUrl.bind(Scanner);
    `);
    return fn();
}

function loadPageContentHelpers(Config) {
    globalThis.Config = Config;
    const patterns = [
        'getPageUrl\\(\\) \\{[\\s\\S]*?\\n {4}\\},',
        'isHostFilePageUrl\\(url\\) \\{[\\s\\S]*?\\n {4}\\},',
        'hasPageActionableContent\\(\\) \\{[\\s\\S]*?\\n {4}\\},',
        'getHostDownloadUrls\\(\\) \\{[\\s\\S]*?\\n {4}\\},',
        'hasHostDownloadTarget\\(\\) \\{[\\s\\S]*?\\n {4}\\},',
        'getPrimaryHostDownloadUrl\\(\\) \\{[\\s\\S]*?\\n {4}\\},',
        'cycleHostDownloadUrl\\(delta\\) \\{[\\s\\S]*?\\n {4}\\},'
    ];
    const methods = patterns.map((p) => {
        const m = scannerSrc.match(new RegExp(p));
        if (!m) throw new Error('Scanner method not found: ' + p);
        return m[0];
    }).join('\n    ');
    const fn = new Function(`
        const State = globalThis.State;
        const Scanner = { _selectedHostDlUrl: null, _hostDlCheckUrl: '', _updatePageActionBar() {}, ${methods} };
        return Scanner;
    `);
    return fn();
}

function isTorrentFileUrl(url) {
    return /\.torrent(\?|#|$)/i.test(String(url).split('#')[0]);
}

describe('Scanner.isHostFilePageUrl — host file tab detection', () => {
    let Config;
    let isHostFilePageUrl;

    beforeEach(() => {
        Config = loadConfig();
        globalThis.State = { settings: { useApiHostRegex: false }, dynamicHosts: [] };
        Config.hostRegex = Config.getActiveRegex();
        isHostFilePageUrl = loadIsHostFilePageUrl(Config);
    });

    it('matches Rapidgator file pages', () => {
        expect(isHostFilePageUrl('https://rapidgator.net/file/8dea9e71ecacdcedc6a239f39537fa59/x.epub.html')).toBe(true);
        expect(isHostFilePageUrl('https://rapidgator.net/file/8dea9e71ecacdcedc6a239f39537fa59/x.epub.html#section')).toBe(true);
    });

    it('rejects host site chrome and non-file URLs', () => {
        expect(isHostFilePageUrl('https://rapidgator.net/auth/login')).toBe(false);
        expect(isHostFilePageUrl('https://rapidgator.net/article/premium')).toBe(false);
        expect(isHostFilePageUrl('https://example.com/page')).toBe(false);
        expect(isHostFilePageUrl('')).toBe(false);
    });
});

describe('Scanner.isScannableHref — Rapidgator # clutter', () => {
    const isScannableHref = loadIsScannableHref();

    it('rejects hash-only and empty hrefs used by host download buttons', () => {
        expect(isScannableHref('#')).toBe(false);
        expect(isScannableHref(' # ')).toBe(false);
        expect(isScannableHref('')).toBe(false);
        expect(isScannableHref(null)).toBe(false);
        expect(isScannableHref('#section')).toBe(false);
    });

    it('rejects javascript/mailto/tel/data/blob URLs', () => {
        expect(isScannableHref('javascript:void(0)')).toBe(false);
        expect(isScannableHref('mailto:a@b.c')).toBe(false);
        expect(isScannableHref('tel:+123')).toBe(false);
        expect(isScannableHref('data:text/plain,hi')).toBe(false);
        expect(isScannableHref('blob:https://x/1')).toBe(false);
    });

    it('accepts real http(s) file links and magnets', () => {
        expect(isScannableHref('https://rapidgator.net/file/8dea9e71ecacdcedc6a239f39537fa59/x.epub.html')).toBe(true);
        expect(isScannableHref('/file/8dea9e71ecacdcedc6a239f39537fa59/x')).toBe(true);
        expect(isScannableHref('magnet:?xt=urn:btih:abcdef')).toBe(true);
    });
});

describe('Config.getActiveRegex — no bare dynamicHosts for BASE domains', () => {
    let Config;

    beforeEach(() => {
        Config = loadConfig();
    });

    it('does not match Rapidgator nav URLs when dynamicHosts includes rapidgator.net', () => {
        globalThis.State.dynamicHosts = ['rapidgator.net', 'mega.nz', 'obscurehost.example'];
        globalThis.State.settings.useApiHostRegex = false;
        const re = Config.getActiveRegex();

        expect(re.test('https://rapidgator.net/file/8dea9e71ecacdcedc6a239f39537fa59/x.epub.html')).toBe(true);
        expect(re.test('https://rapidgator.net/auth/login')).toBe(false);
        expect(re.test('https://rapidgator.net/article/premium')).toBe(false);
        expect(re.test('https://rapidgator.net/site/index')).toBe(false);
        // Unknown dynamic host still matches a pathy URL
        expect(re.test('https://obscurehost.example/d/abc123')).toBe(true);
    });

    it('compileApiHostRegex accepts RD array-of-/pattern/ payloads', () => {
        const data = [
            '/(http|https):\\/\\/(\\w+\\.)?rapidgator\\.(net|asia)\\/file\\/[0-9a-z]{32}/',
            '/(http|https):\\/\\/mega\\.nz\\/(file|folder)\\/.+/'
        ];
        const re = Config.compileApiHostRegex(data);
        expect(re).toBeInstanceOf(RegExp);
        expect(re.test('https://rapidgator.net/file/8dea9e71ecacdcedc6a239f39537fa59/x')).toBe(true);
        expect(re.test('https://rapidgator.net/auth/login')).toBe(false);
        expect(re.test('https://mega.nz/file/abc#key')).toBe(true);
    });

    it('when API regex is active, Rapidgator file matches and nav does not', () => {
        globalThis.State.settings.useApiHostRegex = true;
        globalThis.State.apiHostRegex = Config.compileApiHostRegex([
            '/(http|https):\\/\\/(\\w+\\.)?rapidgator\\.(net|asia)\\/file\\/[0-9a-z]{32}/'
        ]);
        globalThis.State.dynamicHosts = ['rapidgator.net'];
        const re = Config.getActiveRegex();
        expect(re.test('https://www.rapidgator.net/file/8dea9e71ecacdcedc6a239f39537fa59/x')).toBe(true);
        expect(re.test('https://rapidgator.net/wallet/topup')).toBe(false);
    });
});

describe('Scanner page content helpers', () => {
    let Config;
    let Scanner;

    beforeEach(() => {
        Config = loadConfig();
        globalThis.State = {
            settings: { useApiHostRegex: false },
            dynamicHosts: [],
            scannedLinksMap: new Map()
        };
        Config.hostRegex = Config.getActiveRegex();
        Scanner = loadPageContentHelpers(Config);
    });

    it('hasPageActionableContent is true for host file tab or scanned links', () => {
        expect(Scanner.hasPageActionableContent()).toBe(false);
        globalThis.State.scannedLinksMap.set('magnet:?xt=urn:btih:abc', { type: 'magnet' });
        expect(Scanner.hasPageActionableContent()).toBe(true);
    });

    it('getPrimaryHostDownloadUrl prefers current file page, else first host link', () => {
        globalThis.location = { href: 'https://rapidgator.net/file/8dea9e71ecacdcedc6a239f39537fa59/x.epub.html' };
        expect(Scanner.getPrimaryHostDownloadUrl()).toBe('https://rapidgator.net/file/8dea9e71ecacdcedc6a239f39537fa59/x.epub.html');

        globalThis.location = { href: 'https://forum.example/thread' };
        Scanner._selectedHostDlUrl = null;
        globalThis.State.scannedLinksMap.set('https://rapidgator.net/file/8dea9e71ecacdcedc6a239f39537fa59/x.epub.html', { type: 'host' });
        expect(Scanner.getPrimaryHostDownloadUrl()).toBe('https://rapidgator.net/file/8dea9e71ecacdcedc6a239f39537fa59/x.epub.html');
        expect(Scanner.hasHostDownloadTarget()).toBe(true);
    });

    it('cycleHostDownloadUrl rotates among scanned host links', () => {
        globalThis.location = { href: 'https://forum.example/thread' };
        const a = 'https://rapidgator.net/file/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/a';
        const b = 'https://rapidgator.net/file/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb/b';
        globalThis.State.scannedLinksMap.set(a, { type: 'host' });
        globalThis.State.scannedLinksMap.set(b, { type: 'host' });
        expect(Scanner.getHostDownloadUrls()).toEqual([a, b]);
        expect(Scanner.getPrimaryHostDownloadUrl()).toBe(a);
        expect(Scanner.cycleHostDownloadUrl(1)).toBe(b);
        expect(Scanner.cycleHostDownloadUrl(1)).toBe(a);
    });
});

describe('torrent URL detection', () => {
    it('matches .torrent links with optional query or hash', () => {
        expect(isTorrentFileUrl('https://example.com/files/movie.torrent')).toBe(true);
        expect(isTorrentFileUrl('https://example.com/files/movie.torrent?token=1')).toBe(true);
        expect(isTorrentFileUrl('https://example.com/files/movie.torrent#x')).toBe(true);
        expect(isTorrentFileUrl('https://example.com/files/movie.mkv')).toBe(false);
    });
});

function loadMapUnrestrictCheck() {
    const match = scannerSrc.match(/_mapUnrestrictCheck\(ok, data\) \{[\s\S]*?\n {4}\},/);
    if (!match) throw new Error('_mapUnrestrictCheck not found');
    const fn = new Function(`
        function formatBytes(bytes) {
            if (!bytes || bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        }
        const Scanner = { ${match[0]} };
        return Scanner._mapUnrestrictCheck.bind(Scanner);
    `);
    return fn();
}

describe('Scanner._mapUnrestrictCheck', () => {
    const map = loadMapUnrestrictCheck();

    it('marks supported files as valid with filename and size', () => {
        const res = map(true, { supported: true, filename: 'movie.mkv', filesize: 1073741824 });
        expect(res.status).toBe('valid');
        expect(res.detail).toContain('movie.mkv');
        expect(res.detail).toContain('GB');
    });

    it('marks unsupported links as invalid', () => {
        expect(map(true, { supported: false }).status).toBe('invalid');
    });

    it('marks API failures as error', () => {
        expect(map(false, null).status).toBe('error');
    });
});
