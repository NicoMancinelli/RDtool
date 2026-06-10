// --- DOM Helper Module ---
    const DOM = {
        create(tag, attrs = {}, children = []) {
            const el = document.createElement(tag);
            for (const [key, value] of Object.entries(attrs)) {
                if (key === 'className') {
                    el.className = value;
                } else if (key === 'textContent') {
                    el.textContent = value;
                } else if (key === 'htmlContent') {
                    el.innerHTML = value;
                } else if (key === 'style' && typeof value === 'object') {
                    for (const [prop, val] of Object.entries(value)) {
                        el.style[prop] = val;
                    }
                } else if (key === 'style' && typeof value === 'string') {
                    el.style.cssText = value;
                } else if (key === 'dataset' && typeof value === 'object') {
                    for (const [dk, dv] of Object.entries(value)) {
                        el.dataset[dk] = dv;
                    }
                } else if (key.startsWith('on') && typeof value === 'function') {
                    el.addEventListener(key.slice(2).toLowerCase(), value);
                } else {
                    el.setAttribute(key, value);
                }
            }
            DOM._appendChildren(el, children);
            return el;
        },

        text(str) {
            return document.createTextNode(str);
        },

        fragment(children) {
            const frag = document.createDocumentFragment();
            DOM._appendChildren(frag, children);
            return frag;
        },

        clear(el) {
            while (el.firstChild) el.removeChild(el.firstChild);
        },

        _appendChildren(parent, children) {
            for (const child of children) {
                if (child == null) continue;
                if (Array.isArray(child)) {
                    DOM._appendChildren(parent, child);
                } else if (typeof child === 'string') {
                    parent.appendChild(document.createTextNode(child));
                } else if (child instanceof Node) {
                    parent.appendChild(child);
                }
            }
        }
    };

    // =========================================================================
    // UI Shell — Styles + FAB + Dashboard Frame + Toasts + Modals
    // =========================================================================
