import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_FILTER_STATE,
  type EnrichedOpportunity,
  type FilterState,
} from '../src/types/contracts.ts';
import {
  extractAvailableFilterOptions,
  filterOpportunities,
  normalizeSearchText,
} from '../src/utils/filterOpportunities.ts';

function createFixtures(): EnrichedOpportunity[] {
  return [
    {
      opportunity: {
        id: 'opp-de-scholarship',
        category: 'scholarship',
        title: {
          ar: 'منحة الهندسة الألمانية',
          en: 'German Engineering Scholarship',
        },
        provider: {
          ar: 'الهيئة الألمانية للتبادل العلمي',
          en: 'DAAD Foundation',
        },
        country: { code: 'DE', ar: 'ألمانيا', en: 'Germany' },
        mode: 'onsite',
        fieldsOfStudy: [
          { id: 'engineering', ar: 'الهندسة', en: 'Engineering' },
        ],
        studyLevels: ['graduate'],
        deadlineType: 'fixed',
        deadline: '2026-11-20',
        officialUrl: 'https://www2.daad.de/example-path',
        verifiedAt: '2026-11-10',
      },
      evaluation: { status: 'closing_soon', remainingDays: 6 },
    },
    {
      opportunity: {
        id: 'opp-multi-internship',
        category: 'internship',
        title: {
          ar: 'تدريب علوم الحاسوب الأوروبي',
          en: 'European Computer Science Internship',
        },
        provider: {
          ar: 'مركز الأبحاث الأوروبي',
          en: 'European Research Center',
        },
        country: { code: 'MULTI', ar: 'دول متعددة', en: 'Multiple Countries' },
        availableCountries: ['FR', 'NL'],
        mode: 'hybrid',
        fieldsOfStudy: [
          { id: 'computer-science', ar: 'علوم الحاسوب', en: 'Computer Science' },
        ],
        studyLevels: ['undergraduate', 'recent_graduate'],
        deadlineType: 'fixed',
        deadline: '2026-12-15',
        officialUrl: 'https://erc.europa.eu/program',
        verifiedAt: '2026-11-12',
      },
      evaluation: { status: 'open', remainingDays: 31 },
    },
    {
      opportunity: {
        id: 'opp-global-course',
        category: 'course',
        title: {
          ar: 'دورة البرمجة المفتوحة',
          en: 'Open Programming Course',
        },
        provider: {
          ar: 'منصة التعليم المفتوح',
          en: 'Open Learning Platform',
        },
        country: { code: 'GLOBAL', ar: 'عالمي (عن بُعد)', en: 'Global' },
        mode: 'online',
        fieldsOfStudy: [
          { id: 'all-fields', ar: 'جميع التخصصات', en: 'All Fields' },
        ],
        studyLevels: ['all'],
        deadlineType: 'unspecified',
        deadline: null,
        officialUrl: 'https://ocw.mit.edu/course',
        verifiedAt: '2026-11-08',
      },
      evaluation: { status: 'unspecified', remainingDays: null },
    },
    {
      opportunity: {
        id: 'opp-uk-expired',
        category: 'scholarship',
        title: {
          ar: 'زمالة الطب البريطانية',
          en: 'British Medical Fellowship',
        },
        provider: {
          ar: 'المجلس الطبي البريطاني',
          en: 'British Medical Council',
        },
        country: { code: 'GB', ar: 'المملكة المتحدة', en: 'United Kingdom' },
        mode: 'onsite',
        fieldsOfStudy: [
          { id: 'unspecified', ar: 'غير محدد', en: 'Unspecified' },
        ],
        studyLevels: ['unspecified'],
        deadlineType: 'fixed',
        deadline: '2026-11-01',
        officialUrl: 'https://www.chevening.org/fellowships',
        verifiedAt: '2026-11-05',
      },
      evaluation: { status: 'expired', remainingDays: -13 },
    },
  ];
}

function makeFilters(overrides: Partial<FilterState> = {}): FilterState {
  return { ...INITIAL_FILTER_STATE, ...overrides };
}

test('normalizeSearchText strips Arabic diacritics/tatweel, lowercases Latin, and collapses spaces', () => {
  assert.equal(normalizeSearchText('  مِنْحَةُ   الهَنْـدَسَة  '), 'منحة الهندسة');
  assert.equal(normalizeSearchText('  DAAD   Engineering '), 'daad engineering');
});

test('filterOpportunities supports bilingual Arabic and English keyword search', () => {
  const items = createFixtures();
  const favorites = new Set<string>();

  const arResult = filterOpportunities(
    items,
    makeFilters({ searchQuery: 'الهَنْـدَسَة' }),
    favorites,
    'ar',
  );
  assert.deepEqual(
    arResult.map((i) => i.opportunity.id),
    ['opp-de-scholarship'],
  );

  const enResult = filterOpportunities(
    items,
    makeFilters({ searchQuery: 'computer science' }),
    favorites,
    'en',
  );
  assert.deepEqual(
    enResult.map((i) => i.opportunity.id),
    ['opp-multi-internship'],
  );
});

test('filterOpportunities filters by field of study, including all-fields and excluding unspecified', () => {
  const items = createFixtures();
  const favorites = new Set<string>();

  const result = filterOpportunities(
    items,
    makeFilters({ fieldOfStudyId: 'engineering' }),
    favorites,
    'ar',
  );
  assert.deepEqual(
    result.map((i) => i.opportunity.id),
    ['opp-de-scholarship', 'opp-global-course'],
  );
});

test('filterOpportunities filters by single country, MULTI, GLOBAL, and availableCountries', () => {
  const items = createFixtures();
  const favorites = new Set<string>();

  assert.deepEqual(
    filterOpportunities(items, makeFilters({ countryCode: 'DE' }), favorites, 'ar').map(
      (i) => i.opportunity.id,
    ),
    ['opp-de-scholarship'],
  );

  assert.deepEqual(
    filterOpportunities(items, makeFilters({ countryCode: 'MULTI' }), favorites, 'ar').map(
      (i) => i.opportunity.id,
    ),
    ['opp-multi-internship'],
  );

  assert.deepEqual(
    filterOpportunities(items, makeFilters({ countryCode: 'GLOBAL' }), favorites, 'ar').map(
      (i) => i.opportunity.id,
    ),
    ['opp-global-course'],
  );

  assert.deepEqual(
    filterOpportunities(items, makeFilters({ countryCode: 'FR' }), favorites, 'ar').map(
      (i) => i.opportunity.id,
    ),
    ['opp-multi-internship'],
  );
});

test('filterOpportunities filters by deadlineStatus, studyLevel, mode, and favorites', () => {
  const items = createFixtures();
  const favorites = new Set<string>(['opp-de-scholarship', 'opp-uk-expired']);

  assert.deepEqual(
    filterOpportunities(
      items,
      makeFilters({ deadlineStatus: 'closing_soon' }),
      favorites,
      'ar',
    ).map((i) => i.opportunity.id),
    ['opp-de-scholarship'],
  );

  assert.deepEqual(
    filterOpportunities(
      items,
      makeFilters({ deadlineStatus: 'expired' }),
      favorites,
      'ar',
    ).map((i) => i.opportunity.id),
    ['opp-uk-expired'],
  );

  assert.deepEqual(
    filterOpportunities(
      items,
      makeFilters({ studyLevel: 'graduate' }),
      favorites,
      'ar',
    ).map((i) => i.opportunity.id),
    ['opp-de-scholarship', 'opp-global-course'],
  );

  assert.deepEqual(
    filterOpportunities(
      items,
      makeFilters({ mode: 'online' }),
      favorites,
      'ar',
    ).map((i) => i.opportunity.id),
    ['opp-global-course'],
  );

  assert.deepEqual(
    filterOpportunities(
      items,
      makeFilters({ onlyFavorites: true }),
      favorites,
      'ar',
    ).map((i) => i.opportunity.id),
    ['opp-uk-expired', 'opp-de-scholarship'],
  );
});

test('filterOpportunities supports deadline_asc, verified_desc, and title_asc sorting', () => {
  const items = createFixtures();
  const favorites = new Set<string>();

  assert.deepEqual(
    filterOpportunities(items, makeFilters({ sortBy: 'deadline_asc' }), favorites, 'ar').map(
      (i) => i.opportunity.id,
    ),
    ['opp-uk-expired', 'opp-de-scholarship', 'opp-multi-internship', 'opp-global-course'],
  );

  assert.deepEqual(
    filterOpportunities(items, makeFilters({ sortBy: 'verified_desc' }), favorites, 'ar').map(
      (i) => i.opportunity.id,
    ),
    ['opp-multi-internship', 'opp-de-scholarship', 'opp-global-course', 'opp-uk-expired'],
  );

  assert.deepEqual(
    filterOpportunities(items, makeFilters({ sortBy: 'title_asc' }), favorites, 'en').map(
      (i) => i.opportunity.id,
    ),
    ['opp-uk-expired', 'opp-multi-internship', 'opp-de-scholarship', 'opp-global-course'],
  );
});

test('filterOpportunities handles combined filters, empty results, and does not mutate input', () => {
  const items = createFixtures();
  const originalIds = items.map((i) => i.opportunity.id);
  const favorites = new Set<string>(['opp-de-scholarship']);

  const combined = filterOpportunities(
    items,
    makeFilters({
      category: 'scholarship',
      countryCode: 'DE',
      studyLevel: 'graduate',
      mode: 'onsite',
      onlyFavorites: true,
      searchQuery: 'DAAD',
    }),
    favorites,
    'en',
  );
  assert.deepEqual(
    combined.map((i) => i.opportunity.id),
    ['opp-de-scholarship'],
  );

  const empty = filterOpportunities(
    items,
    makeFilters({ category: 'course', countryCode: 'DE' }),
    favorites,
    'ar',
  );
  assert.deepEqual(empty, []);

  assert.deepEqual(
    items.map((i) => i.opportunity.id),
    originalIds,
  );
});

test('extractAvailableFilterOptions separates sovereign countries, scopes, and specific fields', () => {
  const items = createFixtures();
  const options = extractAvailableFilterOptions(items);

  assert.deepEqual(
    options.countries.map((c) => c.code),
    ['DE', 'GB'],
  );
  assert.deepEqual(
    options.countryScopes.map((c) => c.code),
    ['GLOBAL', 'MULTI'],
  );
  assert.deepEqual(
    options.fieldsOfStudy.map((f) => f.id),
    ['computer-science', 'engineering'],
  );
});

