import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { DATASET_FETCH_TIMEOUT_MS as REACT_TIMEOUT_MS } from '../src/hooks/useOpportunitiesData.ts';

const SW_PATH = path.resolve(import.meta.dirname, '..', 'public', 'sw.js');
const DATA_URL = 'https://example.org/opportunity-gate/data/opportunities.json';

interface SwHarness {
  dispatchFetch: (url: string) => Promise<Response>;
  dataCache: Map<string, Response>;
  declaredTimeoutMs: number;
}

async function createSwHarness(options: {
  fetchImpl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  overrideTimeoutMs?: number;
}): Promise<SwHarness> {
  const swSource = await fs.readFile(SW_PATH, 'utf8');
  const timeoutMatch = swSource.match(/const DATASET_FETCH_TIMEOUT_MS = (\d+);/);
  assert.ok(timeoutMatch, 'Expected DATASET_FETCH_TIMEOUT_MS in public/sw.js');
  const declaredTimeoutMs = Number(timeoutMatch[1]);

  const listeners = new Map<string, (event: unknown) => void>();
  const cacheStores = new Map<string, Map<string, Response>>();

  const getStore = (name: string): Map<string, Response> => {
    let store = cacheStores.get(name);
    if (!store) {
      store = new Map();
      cacheStores.set(name, store);
    }
    return store;
  };

  const cacheKey = (req: RequestInfo | URL): string =>
    typeof req === 'string' ? req : req instanceof URL ? req.href : req.url;

  const cachesMock = {
    async open(name: string) {
      const store = getStore(name);
      return {
        async put(req: RequestInfo | URL, res: Response) {
          store.set(cacheKey(req), res);
        },
        async match(req: RequestInfo | URL) {
          const hit = store.get(cacheKey(req));
          return hit ? hit.clone() : undefined;
        },
      };
    },
    async keys() {
      return Array.from(cacheStores.keys());
    },
    async delete(name: string) {
      return cacheStores.delete(name);
    },
  };

  const setTimeoutProxy = (
    fn: (...args: unknown[]) => void,
    ms?: number,
    ...args: unknown[]
  ) => {
    const effectiveMs =
      options.overrideTimeoutMs !== undefined && ms === declaredTimeoutMs
        ? options.overrideTimeoutMs
        : ms;
    return setTimeout(fn, effectiveMs, ...args);
  };

  const selfMock = {
    registration: { scope: 'https://example.org/opportunity-gate/' },
    clients: { async claim() {} },
    async skipWaiting() {},
    addEventListener(type: string, handler: (event: unknown) => void) {
      listeners.set(type, handler);
    },
  };

  const context = vm.createContext({
    self: selfMock,
    caches: cachesMock,
    fetch: options.fetchImpl,
    Response,
    Request,
    URL,
    AbortController,
    setTimeout: setTimeoutProxy,
    clearTimeout,
  });

  vm.runInContext(swSource, context);

  const fetchListener = listeners.get('fetch');
  assert.ok(fetchListener, 'Expected fetch event listener to be registered');

  return {
    declaredTimeoutMs,
    dataCache: getStore('opportunity-gate-data-v1'),
    async dispatchFetch(url: string): Promise<Response> {
      let responsePromise: Promise<Response> | undefined;
      const request = new Request(url, { method: 'GET' });
      fetchListener({
        request,
        respondWith(promise: Promise<Response>) {
          responsePromise = promise;
        },
      });
      assert.ok(responsePromise, 'Expected SW fetch listener to call respondWith');
      return responsePromise;
    },
  };
}

test('Service Worker dataset timeout is 8000ms and strictly less than React 15000ms timeout', async () => {
  const harness = await createSwHarness({
    fetchImpl: async () => new Response('{}', { status: 200 }),
  });
  assert.equal(harness.declaredTimeoutMs, 8000);
  assert.ok(harness.declaredTimeoutMs < REACT_TIMEOUT_MS);
});

test('SW caches valid JSON response and does not prematurely abort normal requests', async () => {
  const payload = JSON.stringify({ schemaVersion: '1.0.0', opportunities: [] });
  const harness = await createSwHarness({
    overrideTimeoutMs: 50,
    fetchImpl: async () =>
      new Response(payload, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  });

  const response = await harness.dispatchFetch(DATA_URL);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), payload);
  assert.ok(harness.dataCache.has(DATA_URL));
});

test('SW aborts stalled dataset request after timeout and returns cached dataset when present', async () => {
  const cachedPayload = JSON.stringify({
    schemaVersion: '1.0.0',
    opportunities: [{ id: 'cached-1' }],
  });
  let aborted = false;

  const harness = await createSwHarness({
    overrideTimeoutMs: 25,
    fetchImpl: (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          aborted = true;
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }),
  });

  harness.dataCache.set(
    DATA_URL,
    new Response(cachedPayload, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  );

  const response = await harness.dispatchFetch(DATA_URL);
  assert.equal(aborted, true);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), cachedPayload);
});

test('SW returns 503 JSON when dataset request times out and cache is empty', async () => {
  const harness = await createSwHarness({
    overrideTimeoutMs: 25,
    fetchImpl: (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }),
  });

  const response = await harness.dispatchFetch(DATA_URL);
  assert.equal(response.status, 503);
  const body = (await response.json()) as { error?: string };
  assert.match(body.error ?? '', /Offline and no cached dataset available/);
});

test('SW online recovery succeeds and updates cache after an earlier stalled fallback', async () => {
  let mode: 'stall' | 'online' = 'stall';
  const stalePayload = JSON.stringify({ version: 'stale' });
  const freshPayload = JSON.stringify({ version: 'fresh' });

  const harness = await createSwHarness({
    overrideTimeoutMs: 25,
    fetchImpl: (_input, init) => {
      if (mode === 'stall') {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      }
      return Promise.resolve(
        new Response(freshPayload, {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    },
  });

  harness.dataCache.set(
    DATA_URL,
    new Response(stalePayload, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  );

  const offlineResp = await harness.dispatchFetch(DATA_URL);
  assert.equal(await offlineResp.text(), stalePayload);

  mode = 'online';
  const onlineResp = await harness.dispatchFetch(DATA_URL);
  assert.equal(onlineResp.status, 200);
  assert.equal(await onlineResp.text(), freshPayload);
  const updatedCached = harness.dataCache.get(DATA_URL);
  assert.ok(updatedCached);
  assert.equal(await updatedCached.clone().text(), freshPayload);
});
