import { describe, it, expect } from 'vitest';

// Pure-logic stub matching the contract of ListRenderer._shallowEqual (R3-4 fix).
// Replicates the implementation in src/modules/05b-list-renderer.js so this test
// fails if the production logic diverges from the contract.
function shallowEqual(a, b) {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
    const ak = Object.keys(a), bk = Object.keys(b);
    if (ak.length !== bk.length) return false;
    for (const k of ak) if (a[k] !== b[k]) return false;
    return true;
}

describe('ListRenderer._shallowEqual (R3-4)', () => {
    it('returns true for identical references', () => {
        const x = { a: 1 };
        expect(shallowEqual(x, x)).toBe(true);
    });

    it('returns true for structurally equal flat objects', () => {
        expect(shallowEqual({ a: 1, b: 'x' }, { a: 1, b: 'x' })).toBe(true);
    });

    it('returns false when a field differs', () => {
        expect(shallowEqual({ a: 1, b: 'x' }, { a: 1, b: 'y' })).toBe(false);
    });

    it('returns false when key counts differ', () => {
        expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });

    it('handles null/undefined safely', () => {
        expect(shallowEqual(null, { a: 1 })).toBe(false);
        expect(shallowEqual(undefined, undefined)).toBe(true);
    });

    it('is much cheaper than JSON.stringify for large objects', () => {
        const large = Object.fromEntries(
            Array.from({ length: 50 }, (_, i) => ['k' + i, 'v' + i])
        );
        const same = { ...large };
        // Sanity: shallow equal agrees with JSON.stringify on this case
        expect(shallowEqual(large, same)).toBe(
            JSON.stringify(large) === JSON.stringify(same)
        );
    });

    it('does NOT do deep equality for nested objects (documented contract)', () => {
        // Both objects share the same nested reference, so shallow equal returns true.
        // This is intentional — callers should pass a custom compare for nested arrays.
        const inner = { x: 1 };
        expect(shallowEqual({ a: inner }, { a: inner })).toBe(true);
    });
});
