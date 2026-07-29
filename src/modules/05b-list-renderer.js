// List Renderer — incremental DOM patching for list tabs
    // =========================================================================

    const ListRenderer = {
        patch(container, items, options) {
            if (!container) return;
            const keyFn = options.key || ((item) => item.id);
            const renderFn = options.render;
            const compareFn = options.compare || ListRenderer._shallowEqual;
            const emptyMessage = options.emptyMessage || 'No items.';

            if (!items.length) {
                container.innerHTML = '';
                container.append(DOM.create('div', {
                    style: 'text-align:center; padding:30px 16px; color:var(--rd-text-secondary);',
                    textContent: emptyMessage
                }));
                return;
            }

            const emptyEl = container.querySelector('[data-list-empty]');
            if (emptyEl) emptyEl.remove();

            const existing = new Map();
            container.querySelectorAll('[data-list-key]').forEach((el) => {
                existing.set(el.dataset.listKey, el);
            });

            const newKeySet = new Set(items.map((item) => String(keyFn(item))));
            for (const [k, el] of existing) {
                if (!newKeySet.has(k)) el.remove();
            }

            let prev = null;
            for (const item of items) {
                const k = String(keyFn(item));
                // O(1) lookup via the existing Map — avoids O(n) querySelector per item
                let el = existing.get(k);
                const prevData = el && el._listData;

                if (!el) {
                    el = renderFn(item);
                    el.dataset.listKey = k;
                    el._listData = item;
                    if (prev) {
                        if (prev.nextSibling !== el) container.insertBefore(el, prev.nextSibling);
                    } else {
                        container.insertBefore(el, container.firstChild);
                    }
                } else if (!prevData || !compareFn(item, prevData)) {
                    const oldChk = el.querySelector('input[type="checkbox"]');
                    const wasChecked = oldChk ? oldChk.checked : false;
                    const newEl = renderFn(item);
                    newEl.dataset.listKey = k;
                    newEl._listData = item;
                    const newChk = newEl.querySelector('input[type="checkbox"]');
                    if (newChk && wasChecked) newChk.checked = true;
                    el.replaceWith(newEl);
                    el = newEl;
                }

                if (prev && el.previousElementSibling !== prev) {
                    container.insertBefore(el, prev.nextSibling);
                }
                prev = el;
            }
        },

        torrentCompare(a, b) {
            return a.id === b.id && a.status === b.status && a.progress === b.progress &&
                a.speed === b.speed && a.bytes === b.bytes && a.filename === b.filename &&
                JSON.stringify(a.links) === JSON.stringify(b.links);
        },

        cloudCompare(a, b) {
            return a.id === b.id && a.filename === b.filename && a.filesize === b.filesize &&
                a.download === b.download && a.generated === b.generated;
        },

        // Cheap structural equality for top-level scalar fields.
        // Caller-provided compare functions still recommended for nested arrays/objects.
        _shallowEqual(a, b) {
            if (a === b) return true;
            if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
            const ak = Object.keys(a), bk = Object.keys(b);
            if (ak.length !== bk.length) return false;
            for (const k of ak) if (a[k] !== b[k]) return false;
            return true;
        }
    };
