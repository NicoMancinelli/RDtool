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
