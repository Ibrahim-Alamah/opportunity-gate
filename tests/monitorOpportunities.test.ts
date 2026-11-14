import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { OpportunitiesDataset, Opportunity } from '../src/types/opportunity.ts';
import {
  DEFAULT_DATA_PATH,
  computeNormalizedContentHash,
  monitorOpportunities,
  type BaselineMap,
  type FetchLike,
} from '../scripts/monitor-opportunities.ts';

function makeOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: 'test-opp-1',
    category: 'scholarship',
    title: { ar: 'فرصة اختبار', en: 'Test Scholarship' },
    provider: { ar: 'جهة رسمية', en: 'Official Provider' },
    country: { code: 'DE', ar: 'ألمانيا', en: 'Germany' },
    mode: 'onsite',
    fieldsOfStudy: [{ id: 'computer-science', ar: 'علوم الحاسوب', en: 'Computer Science' }],
    studyLevels: ['undergraduate'],
    deadlineType: 'fixed',
    deadline: '2026-12-31',
    officialUrl: 'https://scholarships.example.edu/apply',
    verifiedAt: '2026-11-01',
    ...overrides,
  };
}

async function withTempDir(run: (dir: string) => Promise<void>): Promise<void> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'og-monitor-test-'));
  try {
    await run(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

async function writeDataset(filePath: string, opportunities: Opportunity[]): Promise<void> {
  const dataset: OpportunitiesDataset = {
    schemaVersion: '1.0.0',
    lastUpdated: '2026-11-14',
    opportunities,
  };
  await fs.writeFile(filePath, JSON.stringify(dataset, null, 2), 'utf8');
}

test('deadline thresholds classify 0d and 14d as CLOSING_SOON, 15d as OK, and -1d as EXPIRED', async () => {
  await withTempDir(async (dir) => {
    const dataPath = path.join(dir, 'opportunities.json');
    await writeDataset(dataPath, [
      makeOpportunity({ id: 'due-today', deadline: '2026-11-14' }),
      makeOpportunity({ id: 'due-14d', deadline: '2026-11-28' }),
      makeOpportunity({ id: 'due-15d', deadline: '2026-11-29' }),
      makeOpportunity({ id: 'expired-1d', deadline: '2026-11-13' }),
    ]);

    const report = await monitorOpportunities({
      dataPath,
      referenceDate: '2026-11-14',
    });

    const byId = new Map(report.findings.map((f) => [f.id, f]));
    assert.deepEqual(byId.get('due-today')?.statuses, ['CLOSING_SOON']);
    assert.deepEqual(byId.get('due-14d')?.statuses, ['CLOSING_SOON']);
    assert.deepEqual(byId.get('due-15d')?.statuses, ['OK']);
    assert.deepEqual(byId.get('expired-1d')?.statuses, ['EXPIRED']);
  });
});

test('verification age flags > 90 days as STALE_VERIFICATION while 90 days remains OK', async () => {
  await withTempDir(async (dir) => {
    const dataPath = path.join(dir, 'opportunities.json');
    await writeDataset(dataPath, [
      makeOpportunity({ id: 'age-90', verifiedAt: '2026-08-16' }),
      makeOpportunity({ id: 'age-91', verifiedAt: '2026-08-15' }),
    ]);

    const report = await monitorOpportunities({
      dataPath,
      referenceDate: '2026-11-14',
    });

    const byId = new Map(report.findings.map((f) => [f.id, f]));
    assert.equal(byId.get('age-90')?.verificationAgeDays, 90);
    assert.deepEqual(byId.get('age-90')?.statuses, ['OK']);
    assert.equal(byId.get('age-91')?.verificationAgeDays, 91);
    assert.deepEqual(byId.get('age-91')?.statuses, ['STALE_VERIFICATION']);
  });
});

test('flags missing and invalid official URLs as INVALID_URL', async () => {
  await withTempDir(async (dir) => {
    const dataPath = path.join(dir, 'opportunities.json');
    await writeDataset(dataPath, [
      makeOpportunity({ id: 'http-url', officialUrl: 'http://insecure.edu/apply' }),
      makeOpportunity({ id: 'empty-url', officialUrl: '' }),
    ]);

    const report = await monitorOpportunities({
      dataPath,
      referenceDate: '2026-11-14',
    });

    const byId = new Map(report.findings.map((f) => [f.id, f]));
    assert.ok(byId.get('http-url')?.statuses.includes('INVALID_URL'));
    assert.ok(byId.get('empty-url')?.statuses.includes('INVALID_URL'));
  });
});

test('treats HTTP 403, 429, and request timeouts as NEEDS_MANUAL_REVIEW without marking EXPIRED', async () => {
  await withTempDir(async (dir) => {
    const dataPath = path.join(dir, 'opportunities.json');
    await writeDataset(dataPath, [
      makeOpportunity({ id: 'forbidden-opp', officialUrl: 'https://portal-a.edu/1' }),
      makeOpportunity({ id: 'ratelimit-opp', officialUrl: 'https://portal-b.edu/2' }),
      makeOpportunity({ id: 'timeout-opp', officialUrl: 'https://portal-c.edu/3' }),
    ]);

    const fetchImpl: FetchLike = async (url) => {
      if (url.includes('portal-a.edu')) {
        return new Response('Forbidden', { status: 403 });
      }
      if (url.includes('portal-b.edu')) {
        return new Response('Too Many Requests', { status: 429 });
      }
      const abortErr = new Error('The operation was aborted');
      abortErr.name = 'AbortError';
      throw abortErr;
    };

    const report = await monitorOpportunities({
      dataPath,
      baselinePath: path.join(dir, 'missing-baseline.json'),
      online: true,
      referenceDate: '2026-11-14',
      fetchImpl,
    });

    for (const finding of report.findings) {
      assert.ok(finding.statuses.includes('NEEDS_MANUAL_REVIEW'));
      assert.equal(finding.statuses.includes('EXPIRED'), false);
    }
  });
});

test('detects safe HTTPS redirects and rejects insecure or loopback redirects', async () => {
  await withTempDir(async (dir) => {
    const dataPath = path.join(dir, 'opportunities.json');
    await writeDataset(dataPath, [
      makeOpportunity({ id: 'safe-redirect', officialUrl: 'https://old.edu/start' }),
      makeOpportunity({ id: 'http-downgrade', officialUrl: 'https://downgrade.edu/start' }),
      makeOpportunity({ id: 'ssrf-redirect', officialUrl: 'https://ssrf.edu/start' }),
    ]);

    const bodyHtml = '<html><body><main>Official scholarship details and eligibility criteria for international applicants.</main></body></html>';

    const fetchImpl: FetchLike = async (url) => {
      if (url === 'https://old.edu/start') {
        return new Response(null, {
          status: 301,
          headers: { location: 'https://new.edu/apply' },
        });
      }
      if (url === 'https://new.edu/apply') {
        return new Response(bodyHtml, { status: 200 });
      }
      if (url === 'https://downgrade.edu/start') {
        return new Response(null, {
          status: 302,
          headers: { location: 'http://downgrade.edu/apply' },
        });
      }
      if (url === 'https://ssrf.edu/start') {
        return new Response(null, {
          status: 302,
          headers: { location: 'https://127.0.0.1/admin' },
        });
      }
      return new Response('Not Found', { status: 404 });
    };

    const report = await monitorOpportunities({
      dataPath,
      baselinePath: path.join(dir, 'missing-baseline.json'),
      online: true,
      referenceDate: '2026-11-14',
      fetchImpl,
    });

    const byId = new Map(report.findings.map((f) => [f.id, f]));
    assert.ok(byId.get('safe-redirect')?.statuses.includes('REDIRECTED'));
    assert.equal(byId.get('safe-redirect')?.onlineResult?.finalUrl, 'https://new.edu/apply');

    assert.ok(byId.get('http-downgrade')?.statuses.includes('NEEDS_MANUAL_REVIEW'));
    assert.match(byId.get('http-downgrade')?.onlineResult?.note ?? '', /Rejected unsafe redirect/);

    assert.ok(byId.get('ssrf-redirect')?.statuses.includes('NEEDS_MANUAL_REVIEW'));
    assert.match(byId.get('ssrf-redirect')?.onlineResult?.note ?? '', /Rejected unsafe redirect/);
  });
});

test('compares SHA-256 content hashes against existing baseline and handles missing baseline safely', async () => {
  await withTempDir(async (dir) => {
    const dataPath = path.join(dir, 'opportunities.json');
    const baselinePath = path.join(dir, 'baseline.json');
    const missingBaselinePath = path.join(dir, 'no-baseline.json');

    const unchangedHtml =
      '<html><body><main>Official scholarship details remain identical for the 2027 intake cycle. Eligible applicants may submit their documents online before the published deadline.</main></body></html>';
    const updatedHtml =
      '<html><body><main>Updated deadline: applications now close on 2027-01-15 for all candidates. Eligible applicants must submit their documents before the new closing date.</main></body></html>';

    await writeDataset(dataPath, [
      makeOpportunity({ id: 'same-opp', officialUrl: 'https://same.edu/info' }),
      makeOpportunity({ id: 'changed-opp', officialUrl: 'https://changed.edu/info' }),
    ]);

    const baseline: BaselineMap = {
      'same-opp': {
        url: 'https://same.edu/info',
        finalUrl: 'https://same.edu/info',
        contentHash: computeNormalizedContentHash(unchangedHtml),
        checkedAt: '2026-11-01T00:00:00.000Z',
      },
      'changed-opp': {
        url: 'https://changed.edu/info',
        finalUrl: 'https://changed.edu/info',
        contentHash: computeNormalizedContentHash(unchangedHtml),
        checkedAt: '2026-11-01T00:00:00.000Z',
      },
    };
    await fs.writeFile(baselinePath, JSON.stringify(baseline, null, 2), 'utf8');

    const fetchImpl: FetchLike = async (url) => {
      if (url.includes('same.edu')) {
        return new Response(unchangedHtml, { status: 200 });
      }
      return new Response(updatedHtml, { status: 200 });
    };

    const withBaselineReport = await monitorOpportunities({
      dataPath,
      baselinePath,
      online: true,
      referenceDate: '2026-11-14',
      fetchImpl,
    });

    const byId = new Map(withBaselineReport.findings.map((f) => [f.id, f]));
    assert.deepEqual(byId.get('same-opp')?.statuses, ['OK']);
    assert.ok(byId.get('changed-opp')?.statuses.includes('CONTENT_CHANGED'));

    // Missing baseline must not create a baseline file automatically
    const withoutBaselineReport = await monitorOpportunities({
      dataPath,
      baselinePath: missingBaselinePath,
      online: true,
      referenceDate: '2026-11-14',
      fetchImpl,
    });
    assert.equal(withoutBaselineReport.baselineExists, false);
    assert.equal(withoutBaselineReport.baselineUpdated, false);
    assert.equal(withoutBaselineReport.findings[0]?.onlineResult?.baselineAvailable, false);
    await assert.rejects(() => fs.access(missingBaselinePath));
  });
});

test('monitoring real dataset never modifies public/data/opportunities.json', async () => {
  const before = await fs.readFile(DEFAULT_DATA_PATH, 'utf8');
  const report = await monitorOpportunities({ online: false });
  const after = await fs.readFile(DEFAULT_DATA_PATH, 'utf8');

  assert.equal(after, before);
  assert.equal(report.datasetValid, true);
  assert.ok(report.totalOpportunities > 0);
});
