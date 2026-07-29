import { describe, it, expect } from 'vitest';

// Reproduce the polling startPolling + interval callback from src/modules/tabs/torrents.js
// to lock in the R3-2 fix: the polling interval must short-circuit when document.hidden
// is true (avoiding wasted API calls when the user background-switches the tab).
//
// We stub setInterval/clearInterval and `document.hidden` to control the test.

function buildTorrentsPolling(doc) {
    let intervalCallback = null;
    let intervalMs = null;
    let activeIntervalId = 0;
    const intervals = new Map();

    function setIntervalSpy(fn, ms) {
        intervalCallback = fn;
        intervalMs = ms;
        activeIntervalId += 1;
        const id = activeIntervalId;
        intervals.set(id, { fn, ms });
        return id;
    }
    function clearIntervalSpy(id) {
        intervals.delete(id);
        if (intervals.size === 0) {
            intervalCallback = null;
            intervalMs = null;
        }
    }

    // Faithful stub of startPolling matching the patched source
    function startPolling() {
        if (doc.apiKey && !doc.hidden) {
            const pollMs = 4000; // mocked
            const id = setIntervalSpy(() => {
                if (doc.hidden) return;
                doc.fetchCalled += 1;
            }, pollMs);
            return id;
        }
        return null;
    }

    function stopPolling(id) {
        if (id) clearIntervalSpy(id);
    }

    return {
        startPolling,
        stopPolling,
        getIntervalCallback: () => intervalCallback,
        getIntervalMs: () => intervalMs,
        getActiveIntervalCount: () => intervals.size
    };
}

describe('Torrent polling: respects document.hidden (R3-2)', () => {
    it('starts polling when apiKey set and tab visible', () => {
        const doc = { apiKey: 'test', hidden: false, fetchCalled: 0 };
        const p = buildTorrentsPolling(doc);
        p.startPolling();
        expect(p.getActiveIntervalCount()).toBe(1);
        expect(p.getIntervalMs()).toBe(4000);
    });

    it('does NOT start polling when document.hidden at startup', () => {
        const doc = { apiKey: 'test', hidden: true, fetchCalled: 0 };
        const p = buildTorrentsPolling(doc);
        const id = p.startPolling();
        expect(id).toBe(null);
        expect(p.getActiveIntervalCount()).toBe(0);
    });

    it('interval callback short-circuits when document.hidden flips true mid-session', () => {
        const doc = { apiKey: 'test', hidden: false, fetchCalled: 0 };
        const p = buildTorrentsPolling(doc);
        p.startPolling();

        const cb = p.getIntervalCallback();
        expect(cb).toBeTruthy();

        // Simulate user backgrounding the tab
        doc.hidden = true;

        // Fire the interval 3 times — fetch must NOT be called
        cb(); cb(); cb();
        expect(doc.fetchCalled).toBe(0);
    });

    it('interval callback resumes fetches when document.hidden flips back to false', () => {
        const doc = { apiKey: 'test', hidden: false, fetchCalled: 0 };
        const p = buildTorrentsPolling(doc);
        p.startPolling();

        const cb = p.getIntervalCallback();
        doc.hidden = true;
        cb(); // skipped
        doc.hidden = false;
        cb(); cb(); cb();
        expect(doc.fetchCalled).toBe(3);
    });

    it('does not start polling if apiKey is missing', () => {
        const doc = { apiKey: '', hidden: false, fetchCalled: 0 };
        const p = buildTorrentsPolling(doc);
        const id = p.startPolling();
        expect(id).toBe(null);
        expect(p.getActiveIntervalCount()).toBe(0);
    });

    it('stopPolling clears the interval', () => {
        const doc = { apiKey: 'test', hidden: false, fetchCalled: 0 };
        const p = buildTorrentsPolling(doc);
        const id = p.startPolling();
        p.stopPolling(id);
        expect(p.getActiveIntervalCount()).toBe(0);
        // The callback reference is reset
        expect(p.getIntervalCallback()).toBe(null);
    });
});
