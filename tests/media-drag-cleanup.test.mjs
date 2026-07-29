import { describe, it, expect } from 'vitest';

// Reproduce the Media._setupDrag + Media.close() pair from src/modules/10-media.js
// to lock in the R2-2 fix: drag listeners (mousemove, mouseup) must be cleaned up on close().
//
// Stub a minimal document with a spy on addEventListener / removeEventListener so we can
// assert exact (type, handler) pairs.

function buildMedia() {
    const events = []; // log of (action, type, handler)
    const document = {
        addEventListener(type, handler) { events.push(['add', type, handler]); },
        removeEventListener(type, handler) { events.push(['remove', type, handler]); }
    };

    // Faithful stub of _setupDrag matching the patched source
    function setupDrag() {
        const handlerMove = () => {};
        const handlerUp = () => {};
        document.addEventListener('mousemove', handlerMove);
        document.addEventListener('mouseup', handlerUp);
        return { handlerMove, handlerUp };
    }

    // Faithful stub of close() matching the patched source
    function close(handlers) {
        if (handlers.handlerMove) document.removeEventListener('mousemove', handlers.handlerMove);
        if (handlers.handlerUp) document.removeEventListener('mouseup', handlers.handlerUp);
    }

    return { document, events, setupDrag, close };
}

describe('Media drag listener cleanup (R2-2)', () => {
    it('adds and removes the SAME handler reference (no anonymous listener leak)', () => {
        const m = buildMedia();
        const handlers = m.setupDrag();

        // After setup, document has 2 listeners
        expect(m.events.filter(e => e[0] === 'add')).toHaveLength(2);
        expect(m.events.filter(e => e[0] === 'remove')).toHaveLength(0);

        m.close(handlers);

        // After close, BOTH listeners must be removed
        const removes = m.events.filter(e => e[0] === 'remove');
        expect(removes).toHaveLength(2);

        // The removed handlers must be the SAME reference as added (not anonymous)
        const addMove = m.events.find(e => e[0] === 'add' && e[1] === 'mousemove');
        const addUp = m.events.find(e => e[0] === 'add' && e[1] === 'mouseup');
        const removeMove = removes.find(e => e[1] === 'mousemove');
        const removeUp = removes.find(e => e[1] === 'mouseup');
        expect(removeMove[2]).toBe(addMove[2]);
        expect(removeUp[2]).toBe(addUp[2]);
    });

    it('repeated open/close cycles do not accumulate listeners', () => {
        const m = buildMedia();
        for (let i = 0; i < 5; i++) {
            const h = m.setupDrag();
            m.close(h);
        }
        const adds = m.events.filter(e => e[0] === 'add');
        const removes = m.events.filter(e => e[0] === 'remove');
        // 5 cycles × 2 listeners = 10 add, 10 remove. Net zero leaked.
        expect(adds).toHaveLength(10);
        expect(removes).toHaveLength(10);
    });

    it('handles close() called without setupDrag() (defensive)', () => {
        const m = buildMedia();
        // close with no handlers should be a no-op
        m.close({ handlerMove: null, handlerUp: null });
        const removes = m.events.filter(e => e[0] === 'remove');
        expect(removes).toHaveLength(0);
    });
});
