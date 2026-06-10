#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const srcDir = join(root, 'src');
const distDir = join(root, 'dist');
const configPath = join(srcDir, 'modules', '01-config.js');
const headerPath = join(srcDir, 'userscript-header.txt');
const pkgPath = join(root, 'package.json');

function readConfigVersion() {
    const configText = readFileSync(configPath, 'utf8');
    const match = configText.match(/VERSION:\s*'([^']+)'/);
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

mkdirSync(distDir, { recursive: true });

const version = readConfigVersion();
syncPackageJsonVersion(version);

let header = readFileSync(headerPath, 'utf8');
header = syncUserscriptHeaderVersion(header, version);
writeFileSync(headerPath, header);
const css = readFileSync(join(srcDir, 'styles.css'), 'utf8');

const modulesDir = join(srcDir, 'modules');
const modules = readdirSync(modulesDir).filter((f) => f.endsWith('.js')).sort();

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
