#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const srcDir = join(root, 'src');
const distDir = join(root, 'dist');
const modulesDir = join(srcDir, 'modules');
const configPath = join(modulesDir, '01-config.js');
const headerPath = join(srcDir, 'userscript-header.txt');
const pkgPath = join(root, 'package.json');

const MODULE_ORDER = [
    '01-config.js',
    '02-state.js',
    '03-utils.js',
    '04-api.js',
    '05-dom.js',
    '05b-list-renderer.js',
    '06-ui.js',
    '07-core.js',
    '07b-torrent-picker.js',
    '08-subtitles.js',
    'tabs/00-index.js',
    'tabs/shared.js',
    'tabs/links.js',
    'tabs/page.js',
    'tabs/torrents.js',
    'tabs/cloud.js',
    'tabs/settings.js',
    '09-scanner.js',
    '10-media.js',
    '11-mobile.js',
    '12-init.js'
];

function readConfigVersion() {
    const configText = readFileSync(configPath, 'utf8');
    const match = configText.match(/VERSION:\s*['"]([^'"]+)['"]/);
    if (!match) {
        console.error('Could not read VERSION from 01-config.js');
        process.exit(1);
    }
    return match[1];
}

function syncUserscriptHeaderVersion(header, version) {
    if (!/^\/\/ @version\s+/m.test(header)) {
        console.error('userscript-header.txt missing @version line');
        process.exit(1);
    }
    return header.replace(/^(\/\/ @version\s+).+$/m, `$1${version}`);
}

function syncPackageJsonVersion(version) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const semver = /^\d+\.\d+$/.test(version) ? `${version}.0` : version;
    if (pkg.version === semver) return;
    pkg.version = semver;
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
    console.log(`Synced package.json version to ${semver}`);
}

function collectModules() {
    const ordered = [];
    const seen = new Set();
    for (const rel of MODULE_ORDER) {
        const path = join(modulesDir, rel);
        try {
            readFileSync(path, 'utf8');
            ordered.push(rel);
            seen.add(rel);
        } catch {
            // Optional module not yet added
        }
    }
    // Append any other root-level .js modules not in order (excluding 08-tabs.js legacy)
    const rootFiles = readdirSync(modulesDir).filter((f) => f.endsWith('.js') && f !== '08-tabs.js').sort();
    for (const f of rootFiles) {
        if (!seen.has(f)) {
            ordered.push(f);
            seen.add(f);
        }
    }
    return ordered;
}

mkdirSync(distDir, { recursive: true });

const version = readConfigVersion();
syncPackageJsonVersion(version);

let header = readFileSync(headerPath, 'utf8');
header = syncUserscriptHeaderVersion(header, version);
writeFileSync(headerPath, header);
const css = readFileSync(join(srcDir, 'styles.css'), 'utf8');

const modules = collectModules();
const styleBlock = `// --- Step 1: CSS via GM_addStyle ---\nGM_addStyle(\`${css}\`);\n`;
const body = modules.map((f) => readFileSync(join(modulesDir, f), 'utf8')).join('\n\n');
const iife = `(function() {\n'use strict';\n\n${styleBlock}\n${body}\n})();\n`;

const outfile = join(distDir, 'real-debrid-suite.user.js');
writeFileSync(outfile, header + '\n\n' + iife);

const size = Math.round(readFileSync(outfile, 'utf8').length / 1024);
console.log(`Built ${outfile} (${size} KB, ${modules.length} modules)`);

if (!readFileSync(outfile, 'utf8').includes('// @version')) {
    console.error('Build missing @version in header');
    process.exit(1);
}
