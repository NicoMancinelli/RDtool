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
                GM_getValue: 'readonly'
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
    }
];
