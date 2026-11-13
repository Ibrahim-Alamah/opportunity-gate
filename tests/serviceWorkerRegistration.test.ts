import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getServiceWorkerUrl,
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
