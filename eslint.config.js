import js from '@eslint/js';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        files: ['src/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: {
                ...globals.browser,
                GM_xmlhttpRequest: 'readonly',
                GM_setClipboard: 'readonly',
                GM_addStyle: 'readonly',
                GM_notification: 'readonly',
                GM_setValue: 'readonly',
                GM_getValue: 'readonly',
                GM_openInTab: 'readonly'
            }
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-empty': ['error', { allowEmptyCatch: true }]
        }
    },
    {
        // Modules are concatenated into a single IIFE — symbols are shared at runtime
        files: ['src/modules/**/*.js'],
        rules: {
            'no-undef': 'off',
            'no-unused-vars': 'off',
            'no-prototype-builtins': 'off',
            'no-useless-escape': 'off'
        }
    },
    {
        // Tests use vitest globals (describe, it, expect, vi) — declare them.
        files: ['tests/**/*.mjs'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.node,
                describe: 'readonly',
                it: 'readonly',
                test: 'readonly',
                expect: 'readonly',
                vi: 'readonly',
                beforeEach: 'readonly',
                beforeAll: 'readonly',
                afterEach: 'readonly',
                afterAll: 'readonly'
            }
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
        }
    },
    {
        // jsdom-backed tests (see vitest.config.js environmentMatchGlobs). They
        // run inside a DOM context and use `window` / `document` / `URL` /
        // `URL.createObjectURL` as globals, so extend the browser env for this
        // slice. Tests in this scope still see vitest + node globals above.
        files: [
            'tests/media-jsdom.test.mjs',
            'tests/ui-jsdom.test.mjs',
            'tests/init-jsdom.test.mjs'
        ],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node
            }
        }
    }
];
