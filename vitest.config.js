import { defineConfig } from 'vitest/config';

// RDtool vitest configuration.
//
// Default environment is `node` (fastest). Tests that need a real DOM use the
// per-file directive:
//   // @vitest-environment jsdom
// jsdom is installed as a devDep so the env is available everywhere without
// per-test setup. See tests/media-jsdom.test.mjs for the first such test.
export default defineConfig({
    test: {
        environment: 'node',
        // Match Media-related tests to jsdom by glob so existing media-drag-
        // cleanup.test.mjs (stub-based) stays on the default `node` env. New
        // DOM-touching tests can either add the directive or use this glob.
        environmentMatchGlobs: [
            ['tests/media-jsdom*.test.mjs', 'jsdom'],
            ['tests/ui-jsdom*.test.mjs', 'jsdom']
        ]
    }
});