#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const srcDir = join(root, 'src');
const distDir = join(root, 'dist');

mkdirSync(distDir, { recursive: true });

const header = readFileSync(join(srcDir, 'userscript-header.txt'), 'utf8');
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
