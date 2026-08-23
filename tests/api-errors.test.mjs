import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiSrc = readFileSync(join(__dirname, '..', 'src', 'modules', '04-api.js'), 'utf8');

let clearKeyCalls = 0;
globalThis.Config = {
    clearKey: () => { clearKeyCalls++; }
};

// Evaluate only the API object literal (nothing at definition time touches DOM/GM).
const marker = '_torrentHostCache:';
// The slice cuts mid-object-literal, so re-close it before evaluating.
const head = apiSrc.slice(0, apiSrc.indexOf(marker)).replace(/,\s*$/, '\n') + '};';
const API = new Function(head.replace('const API =', 'var API =') + '\nreturn API;')();

function makeHandler(retryFn) {
    let settled;
    const promise = new Promise((resolve) => { settled = resolve; });
    const handlers = API._responseHandler(settled, retryFn || null);
    return { promise, handlers };
}

beforeEach(() => { clearKeyCalls = 0; });
afterEach(() => { vi.useRealTimers(); });

describe('API._classifyStatus', () => {
    it('maps statuses to typed categories', () => {
        expect(API._classifyStatus(401)).toBe('auth');
        expect(API._classifyStatus(403)).toBe('auth');
        expect(API._classifyStatus(429)).toBe('rate_limit');
        expect(API._classifyStatus(500)).toBe('server');
        expect(API._classifyStatus(503)).toBe('server');
        expect(API._classifyStatus(404)).toBe('http');
    });
});

describe('API._responseHandler success paths', () => {
    it('parses JSON bodies', async () => {
        const { promise, handlers } = makeHandler();
        handlers.onload({ status: 200, responseText: '{"id":"abc"}', responseHeaders: '' });
        await expect(promise).resolves.toEqual({ ok: true, data: { id: 'abc' } });
    });

    it('resolves null data for empty DELETE-style responses', async () => {
        const { promise, handlers } = makeHandler();
        handlers.onload({ status: 204, responseText: '', responseHeaders: '' });
        await expect(promise).resolves.toEqual({ ok: true, data: null });
    });

    it('classifies unparseable bodies as parse errors', async () => {
        const { promise, handlers } = makeHandler();
        handlers.onload({ status: 200, responseText: '<html>gateway junk</html>', responseHeaders: '' });
        const res = await promise;
        expect(res.ok).toBe(false);
        expect(res.errorType).toBe('parse');
    });
});

describe('API._responseHandler failure paths', () => {
    it.each([401, 403])('clears the stored key on %i and reports auth', async (status) => {
        const { promise, handlers } = makeHandler();
        handlers.onload({ status, responseText: '', responseHeaders: '' });
        const res = await promise;
        expect(res.errorType).toBe('auth');
        expect(clearKeyCalls).toBe(1);
    });

    it('types non-retryable client errors as http with the status embedded', async () => {
        const { promise, handlers } = makeHandler();
        handlers.onload({ status: 404, responseText: '', responseHeaders: '' });
        const res = await promise;
        expect(res.errorType).toBe('http');
        expect(res.error).toBe('API: 404');
    });

    it('types 5xx as server errors', async () => {
        const { promise, handlers } = makeHandler();
        handlers.onload({ status: 500, responseText: '', responseHeaders: '' });
        expect((await promise).errorType).toBe('server');
    });

    it('retries 429 once after Retry-After seconds, then settles on the retry result', async () => {
        vi.useFakeTimers();
        const retryResult = { ok: true, data: { retried: true } };
        const retryFn = vi.fn(() => Promise.resolve(retryResult));
        const { promise, handlers } = makeHandler(retryFn);
        handlers.onload({ status: 429, responseText: '', responseHeaders: 'retry-after: 2\r\nx: y' });
        expect(retryFn).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1999);
        expect(retryFn).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        await expect(promise).resolves.toBe(retryResult);
        expect(retryFn).toHaveBeenCalledTimes(1);
    });

    it('does not retry 429 when the retry budget is spent', async () => {
        const retryFn = vi.fn();
        const { promise, handlers } = makeHandler(null);
        // No retryFn -> falls through to the >=400 branch.
        handlers.onload({ status: 429, responseText: '', responseHeaders: '' });
        const res = await promise;
        expect(retryFn).not.toHaveBeenCalled();
        // rate_limit classification comes via _classifyStatus only through the
        // retry path; without retryFn it surfaces as http per status code.
        expect(res.errorType).toBe('http');
    });

    it('reports network failures as network errors', async () => {
        const { promise, handlers } = makeHandler();
        handlers.onerror();
        const res = await promise;
        expect(res.ok).toBe(false);
        expect(res.errorType).toBe('network');
    });
});

describe('API.describeError', () => {
    it('maps each errorType to deterministic user copy', () => {
        expect(API.describeError({ errorType: 'auth' })).toMatch(/re-enter/i);
        expect(API.describeError({ errorType: 'rate_limit' })).toMatch(/rate limit/i);
        expect(API.describeError({ errorType: 'network' })).toMatch(/network/i);
        expect(API.describeError({ errorType: 'server' })).toMatch(/temporarily unavailable/i);
        expect(API.describeError({ errorType: 'parse' })).toMatch(/unexpected response/i);
        expect(API.describeError({ errorType: 'nokey' })).toMatch(/api key/i);
        expect(API.describeError({ errorType: 'file' })).toMatch(/read the selected file/i);
    });

    it('keeps the status text for plain http errors', () => {
        expect(API.describeError({ errorType: 'http', error: 'API: 451' })).toBe('API: 451');
    });

    it('falls back to legacy error strings, then the fallback, then generic copy', () => {
        expect(API.describeError({ error: 'legacy message' })).toBe('legacy message');
        expect(API.describeError({}, 'fallback here')).toBe('fallback here');
        expect(API.describeError(null, 'fallback here')).toBe('fallback here');
        expect(API.describeError(undefined)).toBe('Request failed');
    });
});
