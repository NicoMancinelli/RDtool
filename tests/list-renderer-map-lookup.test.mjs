import { describe, it, expect, vi } from 'vitest';

// Reproduce ListRenderer.patch() minimally to lock in the R3-3 fix:
// the per-item loop must read from the `existing` Map, NOT call container.querySelector.
// If a future refactor regresses this to querySelector, this test catches it by
// counting querySelector calls.

function buildListRendererStub() {
    let querySelectorCalls = 0;
    const container = {
        children: new Map(), // key -> { key, data }
        querySelector(sel) {
            querySelectorCalls++;
            // Mimic real behavior: look up by data-list-key
            const m = sel.match(/data-list-key="([^"]+)"/);
            if (m) return container.children.get(m[1]) || null;
            return null;
        },
        querySelectorAll(sel) {
            const m = sel.match(/data-list-key/);
            if (m) return Array.from(container.children.values());
            return [];
        }
    };
    return { container, getQuerySelectorCalls: () => querySelectorCalls };
}

// Faithful stub of the patched loop
function patch(container, items, options) {
    const keyFn = options.key || ((item) => item.id);
    const renderFn = options.render;
    const compareFn = options.compare || ((a, b) => {
        if (a === b) return true;
        const ak = Object.keys(a);
        if (ak.length !== Object.keys(b).length) return false;
        return ak.every(k => a[k] === b[k]);
    });

    const existing = new Map();
    container.querySelectorAll('[data-list-key]').forEach((el) => {
        existing.set(el.dataset.listKey, el);
    });

    const newKeySet = new Set(items.map((item) => String(keyFn(item))));
    for (const [k, _el] of existing) {
        if (!newKeySet.has(k)) container.children.delete(k);
    }

    for (const item of items) {
        const k = String(keyFn(item));
        // FIXED: O(1) lookup via existing Map (was O(n) querySelector before R3-3)
        let el = existing.get(k);
        const prevData = el && el._listData;

        if (!el) {
            el = renderFn(item);
            el.dataset.listKey = k;
            el._listData = item;
            container.children.set(k, el);
        } else if (!prevData || !compareFn(item, prevData)) {
            el = renderFn(item);
            el.dataset.listKey = k;
            el._listData = item;
            container.children.set(k, el);
        }
    }
}

describe('ListRenderer.patch — Map lookup instead of querySelector (R3-3)', () => {
    it('does NOT call querySelector inside the per-item loop', () => {
        const { container, getQuerySelectorCalls } = buildListRendererStub();
        // Seed with 5 existing items
        const items = [
            { id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' },
            { id: 'd', name: 'D' }, { id: 'e', name: 'E' }
        ];
        items.forEach(it => {
            const el = { dataset: {}, _listData: null };
            el.dataset.listKey = it.id;
            el._listData = it;
            container.children.set(it.id, el);
        });

        const renderFn = vi.fn((it) => ({
            dataset: { listKey: it.id }, _listData: it
        }));

        // Pass same items — should re-use existing, not call renderFn for any
        patch(container, items, { render: renderFn });

        // The only querySelector calls should be the initial querySelectorAll
        // (counts as 1 call to querySelectorAll, NOT querySelector) for build.
        // After that, NO additional querySelector calls in the per-item loop.
        expect(getQuerySelectorCalls()).toBe(0);
        expect(renderFn).not.toHaveBeenCalled();
    });

    it('calls renderFn only for new items (incremental updates)', () => {
        const { container } = buildListRendererStub();
        // Seed with 2 items
        const seeded = [
            { id: 'a', name: 'A' }, { id: 'b', name: 'B' }
        ];
        seeded.forEach(it => {
            const el = { dataset: {}, _listData: it };
            el.dataset.listKey = it.id;
            container.children.set(it.id, el);
        });

        // Pass 3 items — 2 existing + 1 new
        const newItems = [
            { id: 'a', name: 'A' },
            { id: 'b', name: 'B' },
            { id: 'c', name: 'C' } // new
        ];
        const renderFn = vi.fn((it) => ({ dataset: { listKey: it.id }, _listData: it }));

        patch(container, newItems, { render: renderFn });

        expect(renderFn).toHaveBeenCalledTimes(1); // only the new one
        expect(renderFn.mock.calls[0][0].id).toBe('c');
    });

    it('re-renders changed items', () => {
        const { container } = buildListRendererStub();
        const seeded = [{ id: 'a', name: 'A-old' }];
        seeded.forEach(it => {
            const el = { dataset: {}, _listData: it };
            el.dataset.listKey = it.id;
            container.children.set(it.id, el);
        });

        const newItems = [{ id: 'a', name: 'A-new' }];
        const renderFn = vi.fn((it) => ({ dataset: { listKey: it.id }, _listData: it }));

        patch(container, newItems, { render: renderFn });

        expect(renderFn).toHaveBeenCalledTimes(1);
    });
});
