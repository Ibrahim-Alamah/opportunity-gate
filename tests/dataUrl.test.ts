import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getOpportunitiesDataUrl,
  resolvePublicAssetUrl,
} from '../src/utils/dataUrl.ts';

test('getOpportunitiesDataUrl resolves default relative path in Node environment', () => {
  assert.equal(getOpportunitiesDataUrl(), './data/opportunities.json');
});

test('resolvePublicAssetUrl preserves relative base URLs without producing root-anchored paths', () => {
  assert.equal(
    resolvePublicAssetUrl('data/opportunities.json', './'),
    './data/opportunities.json',
  );
  assert.equal(
    resolvePublicAssetUrl('./data/opportunities.json', '.'),
    './data/opportunities.json',
  );
  assert.equal(
    resolvePublicAssetUrl('/data/opportunities.json', './'),
    './data/opportunities.json',
  );
});

test('resolvePublicAssetUrl supports GitHub Pages subpath base URLs', () => {
  assert.equal(
    getOpportunitiesDataUrl('/opportunity-gate/'),
    '/opportunity-gate/data/opportunities.json',
  );
  assert.equal(
    getOpportunitiesDataUrl('/opportunity-gate'),
    '/opportunity-gate/data/opportunities.json',
  );
  assert.equal(
    resolvePublicAssetUrl('/sw.js', '/opportunity-gate/'),
    '/opportunity-gate/sw.js',
  );
});

