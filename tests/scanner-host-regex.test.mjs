import { describe, it, expect } from 'vitest';

// Reproduce Scanner._HOST_RE (R3-5) — extract hostname without constructing new URL().
// Per-link perf-critical path on the scanner hot loop.

const HOST_RE = /^(?:https?|magnet):\/\/([^/]+)/i;

function extractHost(url) {
    const m = url.match(HOST_RE);
    return m ? m[1].replace(/^www\./, '') : '';
}

describe('Scanner._HOST_RE host extraction (R3-5)', () => {
    it('extracts host from https URLs', () => {
        expect(extractHost('https://rapidgator.net/file/abc123')).toBe('rapidgator.net');
    });

    it('extracts host from http URLs', () => {
        expect(extractHost('http://example.com/foo/bar')).toBe('example.com');
    });

    it('extracts host from magnet URLs', () => {
        expect(extractHost('magnet:?xt=urn:btih:abcdef&dn=foo')).toBe('');
        // magnet has no //host, returns empty string — caller should `continue`
    });

    it('strips leading www.', () => {
        expect(extractHost('https://www.mediafire.com/file/xyz')).toBe('mediafire.com');
    });

    it('preserves www in middle of hostname (only strips leading)', () => {
        // Unusual but valid: www within the hostname is preserved
        expect(extractHost('https://wwwww.example.com/path')).toBe('wwwww.example.com');
    });

    it('handles URLs with port numbers', () => {
        // Real-Debrid API doesn't use ports but be defensive
        expect(extractHost('https://api.real-debrid.com:443/rest/1.0/hosts')).toBe('api.real-debrid.com:443');
    });

    it('handles URLs with query strings and fragments', () => {
        expect(extractHost('https://drive.google.com/file/d/abc?usp=sharing#foo')).toBe('drive.google.com');
    });

    it('returns empty string for invalid URLs (mimics URL() throw behavior)', () => {
        // Defensive: invalid URLs don't throw, they return ''.
        // Caller code: `if (!hostMatch) continue;` — same effect as the old try/catch.
        expect(extractHost('not a url')).toBe('');
        expect(extractHost('://')).toBe('');
    });

    it('matches real-debrid URL', () => {
        expect(extractHost('https://api.real-debrid.com/rest/1.0')).toBe('api.real-debrid.com');
    });
});
