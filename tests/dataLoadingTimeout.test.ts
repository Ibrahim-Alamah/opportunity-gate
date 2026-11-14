import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DATASET_FETCH_TIMEOUT_MS,
  fetchOpportunitiesDataset,
} from '../src/hooks/useOpportunitiesData.ts';

const VALID_DATASET = {
  schemaVersion: '1.0.0',
  lastUpdated: '2026-11-12',
  opportunities: [
    {
      id: 'timeout-test-opp',
      category: 'scholarship',
      title: { ar: 'منحة اختبار', en: 'Test Scholarship' },
      provider: { ar: 'جهة رسمية', en: 'Official Provider' },
      country: { code: 'DE', ar: 'ألمانيا', en: 'Germany' },
      mode: 'onsite',
      fieldsOfStudy: [
        { id: 'computer-science', ar: 'علوم الحاسوب', en: 'Computer Science' },
      ],
      studyLevels: ['undergraduate'],
      deadlineType: 'fixed',
      deadline: '2026-12-31',
      officialUrl: 'https://scholarships.example.edu/apply',
      verifiedAt: '2026-11-12',
    },
  ],
};

test('DATASET_FETCH_TIMEOUT_MS defaults to 15000ms', () => {
  assert.equal(DATASET_FETCH_TIMEOUT_MS, 15_000);
});

test('fetchOpportunitiesDataset loads and transforms valid JSON response', async () => {
  const result = await fetchOpportunitiesDataset({
    url: './data/opportunities.json',
    fetchImpl: async () =>
      new Response(JSON.stringify(VALID_DATASET), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  });

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.opportunity.id, 'timeout-test-opp');
  assert.equal(result.lastUpdated, '2026-11-12');
});

test('fetchOpportunitiesDataset rejects on network failure and non-OK HTTP status', async () => {
  await assert.rejects(
    () =>
      fetchOpportunitiesDataset({
        url: './data/opportunities.json',
        fetchImpl: async () => {
          throw new Error('Network disconnected');
        },
      }),
    /Network disconnected/
  );

  await assert.rejects(
    () =>
      fetchOpportunitiesDataset({
        url: './data/opportunities.json',
        fetchImpl: async () => new Response('Not Found', { status: 404 }),
      }),
    /HTTP 404/
  );
});

test('fetchOpportunitiesDataset aborts a never-resolving request after timeoutMs', async () => {
  let abortedBySignal = false;

  await assert.rejects(
    () =>
      fetchOpportunitiesDataset({
        url: './data/opportunities.json',
        timeoutMs: 25,
        fetchImpl: (_input, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              abortedBySignal = true;
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }),
      }),
    /Request timed out after 25ms/
  );

  assert.equal(abortedBySignal, true);
});

test('fetchOpportunitiesDataset cancels safely on external AbortSignal (unmount)', async () => {
  const unmountController = new AbortController();
  let abortedBySignal = false;

  const promise = fetchOpportunitiesDataset({
    url: './data/opportunities.json',
    timeoutMs: 5_000,
    signal: unmountController.signal,
    fetchImpl: (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          abortedBySignal = true;
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }),
  });

  setTimeout(() => unmountController.abort(), 10);

  await assert.rejects(
    () => promise,
    (err: unknown) => err instanceof Error && err.name === 'AbortError'
  );
  assert.equal(abortedBySignal, true);
});
