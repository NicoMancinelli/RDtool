#!/usr/bin/env node
/**
 * One-time / on-demand split of the monolith userscript into src/modules/.
 * Reads RealDebrid v37.js (or dist fallback) and writes modular source files.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const inputPath = [join(root, 'RealDebrid v37.js'), join(root, 'dist/real-debrid-suite.user.js')]
    .find((p) => { try { readFileSync(p); return true; } catch { return false; } });

if (!inputPath) {
    console.error('No source file found to split.');
    process.exit(1);
}

const src = readFileSync(inputPath, 'utf8');
const lines = src.split('\n');

// Userscript header (// ==UserScript== block)
const headerEnd = lines.findIndex((l, i) => i > 0 && l.trim() === '// ==/UserScript==');
const header = lines.slice(0, headerEnd + 1).join('\n');

// Extract CSS from GM_addStyle(`...`)
const styleMatch = src.match(/GM_addStyle\(`([\s\S]*?)`\);/);
if (!styleMatch) {
    console.error('Could not find GM_addStyle block.');
    process.exit(1);
}
const css = styleMatch[1];

// Body inside IIFE (exclude outer wrapper)
const iifeStart = lines.findIndex((l) => l.includes("(function()"));
const iifeEnd = lines.lastIndexOf('})();');
let body = lines.slice(iifeStart + 1, iifeEnd).join('\n');
// Remove 'use strict' line
body = body.replace(/^\s*'use strict';\s*\n/, '');

// Remove GM_addStyle block from body — replaced by styles.js module
body = body.replace(/\/\/ --- Step 1: CSS via GM_addStyle ---[\s\S]*?`\);\s*\n/, '');

const sections = [
    { file: '01-config.js', start: '// Config Module', end: '// State Module' },
    { file: '02-state.js', start: '// State Module', end: '// Utility Functions' },
    { file: '03-utils.js', start: '// Utility Functions', end: '// API Module' },
    { file: '04-api.js', start: '// API Module', end: '// --- DOM Helper Module ---' },
    { file: '05-dom.js', start: '// --- DOM Helper Module ---', end: '// --- Step 2: UI Module ---' },
    { file: '06-ui.js', start: '// --- Step 2: UI Module ---', end: '// ===================== Core Functions' },
    { file: '07-core.js', start: '// ===================== Core Functions', end: '// ===================== Tabs' },
    { file: '08-tabs.js', start: '// ===================== Tabs', end: 'const Scanner = {' },
    { file: '09-scanner.js', start: 'const Scanner = {', end: 'const Media = {' },
    { file: '10-media.js', start: 'const Media = {', end: '// ===================== Task 11: Mobile' },
    { file: '11-mobile.js', start: '// ===================== Task 11: Mobile', end: '// ===================== Task 12: Offline' },
    { file: '12-init.js', start: '// ===================== Task 12: Offline', end: null }
];

function extractBetween(text, startMarker, endMarker) {
    const start = text.indexOf(startMarker);
    if (start === -1) throw new Error(`Marker not found: ${startMarker}`);
    if (!endMarker) return text.slice(start).trim();
    const end = text.indexOf(endMarker, start + startMarker.length);
    if (end === -1) throw new Error(`End marker not found: ${endMarker}`);
    return text.slice(start, end).trim();
}

const modulesDir = join(root, 'src', 'modules');
const srcDir = join(root, 'src');
mkdirSync(modulesDir, { recursive: true });

writeFileSync(join(srcDir, 'userscript-header.txt'), header);
writeFileSync(join(srcDir, 'styles.css'), css.trim());

for (const { file, start, end } of sections) {
    const chunk = extractBetween(body, start, end);
    writeFileSync(join(modulesDir, file), chunk + '\n');
}

console.log(`Split ${inputPath} → src/ (${sections.length} modules + styles.css)`);
