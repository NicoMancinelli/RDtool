import { describe, it, expect } from 'vitest';

function parseUserscriptVersion(text) {
    if (!text || typeof text !== 'string') return null;
    const m = text.match(/^\/\/\s*@version\s+(\S+)/m);
    return m ? m[1] : null;
}

function compareVersions(a, b) {
    const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
    const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
        const da = pa[i] || 0;
        const db = pb[i] || 0;
        if (da > db) return 1;
        if (da < db) return -1;
    }
    return 0;
}

const SAMPLE_HEADER = `// ==UserScript==
// @name         Real-Debrid Suite
// @version      41.6
// @updateURL    https://example.com/script.user.js
// ==/UserScript==
`;

describe('parseUserscriptVersion', () => {
    it('parses @version from userscript header', () => {
        expect(parseUserscriptVersion(SAMPLE_HEADER)).toBe('41.6');
    });

    it('returns null for missing version', () => {
        expect(parseUserscriptVersion('// @name Foo')).toBeNull();
        expect(parseUserscriptVersion('')).toBeNull();
        expect(parseUserscriptVersion(null)).toBeNull();
    });
});

describe('compareVersions', () => {
    it('orders dotted versions numerically', () => {
        expect(compareVersions('41.6', '41.5')).toBe(1);
        expect(compareVersions('41.5', '41.6')).toBe(-1);
        expect(compareVersions('41.5', '41.5')).toBe(0);
    });

    it('handles unequal segment counts', () => {
        expect(compareVersions('42', '41.9')).toBe(1);
        expect(compareVersions('41.10', '41.9')).toBe(1);
    });
});
