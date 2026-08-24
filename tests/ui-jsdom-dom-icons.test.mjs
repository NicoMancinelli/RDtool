// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const domSrc = readFileSync(join(__dirname, '..', 'src', 'modules', '05-dom.js'), 'utf8');

// Evaluate only the DOM object (the file continues into UI shell code after it).
const marker = '// =========================================================================\n    // UI Shell';
const cut = domSrc.indexOf(marker);
const DOM = new Function((cut > 0 ? domSrc.slice(0, cut) : domSrc) + '\nreturn DOM;')();

describe('DOM.iconSvg trusted registry', () => {
    it('returns a real SVG node for a registered icon', () => {
        const svg = DOM.iconSvg('lightning');
        expect(svg).toBeTruthy();
        expect(svg.tagName.toLowerCase()).toBe('svg');
        expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    });

    it('returns null for unknown icon names instead of injecting markup', () => {
        expect(DOM.iconSvg('does-not-exist')).toBeNull();
    });
});

describe('DOM.create has no markup-injection path', () => {
    it('ignores htmlContent (removed as an attr handler)', () => {
        const el = DOM.create('div', { htmlContent: '<img src=x onerror=alert(1)>' });
        expect(el.querySelector('img')).toBeNull();
        // The raw string must not have been parsed into the tree; setAttribute
        // fallback stores it harmlessly as an attribute value.
        expect(el.innerHTML).toBe('');
    });

    it('still supports textContent for untrusted strings containing markup', () => {
        const el = DOM.create('div', { textContent: '<b>not bold</b>' });
        expect(el.textContent).toBe('<b>not bold</b>');
        expect(el.querySelector('b')).toBeNull();
    });
});

describe('source guard: no generic innerHTML escape hatch remains', () => {
    const modulesDir = join(__dirname, '..', 'src', 'modules');
    const files = readdirSync(modulesDir).filter((f) => f.endsWith('.js'));

    it('no src module references htmlContent', () => {
        for (const f of files) {
            const srcText = readFileSync(join(modulesDir, f), 'utf8');
            expect(srcText.includes('htmlContent'), `${f} must not use htmlContent`).toBe(false);
        }
    });

    it('icon injection is the only innerHTML site and reads from _ICONS', () => {
        const occurrences = domSrc.split('innerHTML').length - 1;
        expect(occurrences).toBe(1); // inside iconSvg() only
        expect(domSrc).toContain('_ICONS[name]');
    });
});
