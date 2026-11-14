import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getServiceWorkerUrl,
  registerServiceWorker,
  shouldRegisterServiceWorker,
} from '../src/utils/registerServiceWorker.ts';

test('getServiceWorkerUrl resolves relative and GitHub Pages subpath SW URLs', () => {
  assert.equal(getServiceWorkerUrl(), './sw.js');
  assert.equal(getServiceWorkerUrl('./'), './sw.js');
  assert.equal(getServiceWorkerUrl('.'), './sw.js');
  assert.equal(getServiceWorkerUrl('/opportunity-gate/'), '/opportunity-gate/sw.js');
  assert.equal(getServiceWorkerUrl('/opportunity-gate'), '/opportunity-gate/sw.js');
});

test('shouldRegisterServiceWorker enables registration only in production with browser support', () => {
  assert.equal(shouldRegisterServiceWorker(true, true), true);
  assert.equal(shouldRegisterServiceWorker(false, true), false);
  assert.equal(shouldRegisterServiceWorker(true, false), false);
  assert.equal(shouldRegisterServiceWorker(false, false), false);
});

test('registerServiceWorker logs console.warn on async rejection without throwing', async (t) => {
  const warnMock = t.mock.method(console, 'warn', () => {});
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');

  try {
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { readyState: 'complete' },
    });
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        serviceWorker: {
          register: () => Promise.reject(new Error('Registration denied')),
        },
      },
    });

    assert.doesNotThrow(() => registerServiceWorker(true));
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(warnMock.mock.callCount(), 1);
    assert.deepEqual(warnMock.mock.calls[0].arguments, [
      'Opportunity Gate: Service Worker registration failed.',
      'Registration denied',
    ]);
  } finally {
    if (originalNavigator) {
      Object.defineProperty(globalThis, 'navigator', originalNavigator);
    } else {
      delete (globalThis as { navigator?: unknown }).navigator;
    }
    if (originalDocument) {
      Object.defineProperty(globalThis, 'document', originalDocument);
    } else {
      delete (globalThis as { document?: unknown }).document;
    }
  }
});

test('registerServiceWorker logs console.warn on synchronous exception without throwing', (t) => {
  const warnMock = t.mock.method(console, 'warn', () => {});
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');

  try {
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { readyState: 'complete' },
    });
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        serviceWorker: {
          register: () => {
            throw 'Sync registration blocked';
          },
        },
      },
    });

    assert.doesNotThrow(() => registerServiceWorker(true));

    assert.equal(warnMock.mock.callCount(), 1);
    assert.deepEqual(warnMock.mock.calls[0].arguments, [
      'Opportunity Gate: Service Worker registration failed.',
      'Sync registration blocked',
    ]);
  } finally {
    if (originalNavigator) {
      Object.defineProperty(globalThis, 'navigator', originalNavigator);
    } else {
      delete (globalThis as { navigator?: unknown }).navigator;
    }
    if (originalDocument) {
      Object.defineProperty(globalThis, 'document', originalDocument);
    } else {
      delete (globalThis as { document?: unknown }).document;
    }
  }
});
