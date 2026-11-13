import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseStoredFavorites,
  readFavoritesFromStorage,
  writeFavoritesToStorage,
} from '../src/hooks/useFavorites.ts';

test('parseStoredFavorites parses valid JSON arrays and deduplicates/trims IDs', () => {
  assert.deepEqual(parseStoredFavorites('["opp-1", "opp-2"]'), ['opp-1', 'opp-2']);
  assert.deepEqual(
    parseStoredFavorites('["opp-1", " opp-1 ", "opp-2", "opp-2"]'),
    ['opp-1', 'opp-2'],
  );
});

test('parseStoredFavorites handles corrupted JSON and non-array JSON safely', () => {
  assert.deepEqual(parseStoredFavorites('{corrupted json'), []);
  assert.deepEqual(parseStoredFavorites('{"id":"opp-1"}'), []);
  assert.deepEqual(parseStoredFavorites('123'), []);
  assert.deepEqual(parseStoredFavorites('"opp-1"'), []);
  assert.deepEqual(parseStoredFavorites('true'), []);
  assert.deepEqual(parseStoredFavorites('null'), []);
});

test('parseStoredFavorites filters out invalid items and handles empty/missing inputs', () => {
  assert.deepEqual(
    parseStoredFavorites('["opp-1", 42, null, "", "   ", {"a":1}, "opp-2"]'),
    ['opp-1', 'opp-2'],
  );
  assert.deepEqual(parseStoredFavorites(null), []);
  assert.deepEqual(parseStoredFavorites(''), []);
  assert.deepEqual(parseStoredFavorites('[]'), []);
});

test('readFavoritesFromStorage and writeFavoritesToStorage fail safely when window is unavailable', () => {
  assert.deepEqual(readFavoritesFromStorage(), []);
  assert.equal(writeFavoritesToStorage(['opp-1']), false);
});

