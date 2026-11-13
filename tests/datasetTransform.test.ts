import test from 'node:test';
import assert from 'node:assert/strict';
import { transformAndValidateDataset } from '../src/hooks/useOpportunitiesData.ts';

const VALID_DATASET = {
  schemaVersion: '1.0.0',
  lastUpdated: '2026-11-12',
  opportunities: [
    {
      id: 'daad-epos-2026',
      category: 'scholarship',
      title: {
        ar: 'منحة DAAD للدراسات العليا',
        en: 'DAAD EPOS Scholarship',
      },
      provider: {
        ar: 'الهيئة الألمانية للتبادل العلمي',
        en: 'DAAD',
      },
      country: { code: 'DE', ar: 'ألمانيا', en: 'Germany' },
      mode: 'onsite',
      fieldsOfStudy: [
        { id: 'engineering', ar: 'الهندسة', en: 'Engineering' },
      ],
      studyLevels: ['graduate'],
      deadlineType: 'fixed',
      deadline: '2026-11-20',
      officialUrl: 'https://www2.daad.de/deutschland/stipendium/',
      verifiedAt: '2026-11-12',
    },
    {
      id: 'mitx-intro-cs',
      category: 'course',
      title: {
        ar: 'مقدمة في علوم الحاسوب',
        en: 'Introduction to Computer Science',
      },
      provider: {
        ar: 'معهد ماساتشوستس',
        en: 'MITx',
      },
      country: { code: 'GLOBAL', ar: 'عالمي', en: 'Global' },
      mode: 'online',
      fieldsOfStudy: [
        { id: 'computer-science', ar: 'علوم الحاسوب', en: 'Computer Science' },
      ],
      studyLevels: ['all'],
      deadlineType: 'unspecified',
      deadline: null,
      officialUrl: 'https://ocw.mit.edu/courses/intro',
      verifiedAt: '2026-11-10',
    },
  ],
};

test('transformAndValidateDataset validates, enriches deadlines, and extracts filter options', () => {
  const result = transformAndValidateDataset(VALID_DATASET, '2026-11-14');

  assert.equal(result.lastUpdated, '2026-11-12');
  assert.equal(result.items.length, 2);
  assert.deepEqual(result.items[0].evaluation, {
    status: 'closing_soon',
    remainingDays: 6,
  });
  assert.deepEqual(result.items[1].evaluation, {
    status: 'unspecified',
    remainingDays: null,
  });
  assert.deepEqual(
    result.availableOptions.countries.map((c) => c.code),
    ['DE'],
  );
  assert.deepEqual(
    result.availableOptions.countryScopes.map((c) => c.code),
    ['GLOBAL'],
  );
  assert.deepEqual(
    result.availableOptions.fieldsOfStudy.map((f) => f.id),
    ['computer-science', 'engineering'],
  );
});

test('transformAndValidateDataset accepts valid empty opportunities array', () => {
  const result = transformAndValidateDataset(
    {
      schemaVersion: '1.0.0',
      lastUpdated: '2026-11-12',
      opportunities: [],
    },
    '2026-11-14',
  );

  assert.equal(result.items.length, 0);
  assert.equal(result.lastUpdated, '2026-11-12');
  assert.deepEqual(result.availableOptions, {
    countries: [],
    countryScopes: [],
    fieldsOfStudy: [],
  });
});

test('transformAndValidateDataset throws descriptive Error for invalid datasets', () => {
  assert.throws(
    () => transformAndValidateDataset(null, '2026-11-14'),
    /Invalid opportunities dataset/,
  );

  assert.throws(
    () =>
      transformAndValidateDataset(
        {
          schemaVersion: '2.0.0',
          lastUpdated: '2026-11-12',
          opportunities: [],
        },
        '2026-11-14',
      ),
    /schemaVersion/,
  );

  const missingOfficialUrl = structuredClone(VALID_DATASET);
  (missingOfficialUrl.opportunities[0] as Record<string, unknown>).officialUrl =
    'http://insecure.example.org';
  assert.throws(
    () => transformAndValidateDataset(missingOfficialUrl, '2026-11-14'),
    /officialUrl/,
  );
});

