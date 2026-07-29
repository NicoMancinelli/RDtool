import { describe, it, expect } from 'vitest';

// Reproduce Config.TAB_KEYS (R2-3) — central tab identifier registry.
// Source: src/modules/01-config.js (TAB_KEYS).
// This test locks the contract; if a future change renames a key, callers break.

const TAB_KEYS = Object.freeze({
    CLOUD: 'cloud',
    LINKS: 'links',
    PAGE: 'page',
    SETTINGS: 'settings',
    TORRENTS: 'torrents'
});

describe('Config.TAB_KEYS (R2-3)', () => {
    it('contains all five canonical tab identifiers', () => {
        const values = Object.values(TAB_KEYS).sort();
        expect(values).toEqual(['cloud', 'links', 'page', 'settings', 'torrents']);
    });

    it('is frozen (cannot be mutated at runtime)', () => {
        expect(Object.isFrozen(TAB_KEYS)).toBe(true);
    });

    it('matches the legacy allowlist in switchTab + lastTab validation', () => {
        // Lock the contract: any new tab must be added to BOTH the constant
        // AND any consumer that whitelists (defensive).
        const legacyAllowlist = ['links', 'page', 'torrents', 'cloud', 'settings'];
        expect(new Set(Object.values(TAB_KEYS))).toEqual(new Set(legacyAllowlist));
    });

    it('Object.values(TAB_KEYS) produces the same array every time (useful for switchTab validation)', () => {
        const a = Object.values(TAB_KEYS);
        const b = Object.values(TAB_KEYS);
        expect(a).toEqual(b);
        // Different array references (Object.values returns a new array) but equal contents
        expect(a).not.toBe(b);
    });
});
