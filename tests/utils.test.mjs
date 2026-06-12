import { describe, it, expect } from 'vitest';

function isBrowserNativeMedia(filename, url) {
    const name = filename || url || '';
    return /\.(mp4|webm|mov|mp3|flac|wav|ogg|jpg|jpeg|png|webp|gif)(\?|$)/i.test(name);
}

function extractRdLinkId(url, downloadId) {
    if (downloadId) return String(downloadId);
    if (!url) return null;
    const m = url.match(/real-debrid\.com\/d\/([A-Z0-9]+)/i) || url.match(/\/d\/([A-Z0-9]+)/i);
    return m ? m[1] : null;
}

describe('isBrowserNativeMedia', () => {
    it('detects mp4', () => {
        expect(isBrowserNativeMedia('movie.mp4')).toBe(true);
    });

    it('detects mkv as non-native', () => {
        expect(isBrowserNativeMedia('movie.mkv')).toBe(false);
    });
});

describe('extractRdLinkId', () => {
    it('uses downloadId when provided', () => {
        expect(extractRdLinkId('http://example.com', 'ABC123')).toBe('ABC123');
    });

    it('parses real-debrid URL', () => {
        expect(extractRdLinkId('https://real-debrid.com/d/XYZ789/file.mkv')).toBe('XYZ789');
    });
});
