import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { OpportunitiesDataset, Opportunity } from '../src/types/opportunity.ts';
import {
  CLOSING_SOON_THRESHOLD_DAYS,
  evaluateOpportunityDeadline,
  ISO_3166_ALPHA_2_CODES,
  isValidCountryScopeCode,
  isValidIsoCountryCode,
  matchesCountryFilter,
  parseCalendarDateToUtcMs,
  validateOfficialHttpsUrl,
  validateOpportunitiesDataset,
} from '../src/utils/validateOpportunities.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_DATA_PATH = path.join(PROJECT_ROOT, 'public', 'data', 'opportunities.json');
const SCHEMA_PATH = path.join(PROJECT_ROOT, 'schemas', 'opportunities.schema.json');

interface SelfTestCase {
  name: string;
  run: () => void;
}

function assertCondition(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function createValidInMemoryRecord(overrides: Record<string, unknown> = {}): Opportunity {
  const base: Opportunity = {
    id: 'daad-development-related-postgraduate-courses',
    category: 'scholarship',
    title: {
      ar: 'منح الدراسات العليا المرتبطة بالتنمية (EPOS)',
      en: 'Development-Related Postgraduate Courses (EPOS)',
    },
    provider: {
      ar: 'الهيئة الألمانية للتبادل العلمي (DAAD)',
      en: 'German Academic Exchange Service (DAAD)',
    },
    country: {
      code: 'DE',
      ar: 'ألمانيا',
      en: 'Germany',
    },
    mode: 'onsite',
    fieldsOfStudy: [
      {
        id: 'engineering',
        ar: 'الهندسة',
        en: 'Engineering',
      },
    ],
    studyLevels: ['graduate'],
    deadlineType: 'fixed',
    deadline: '2026-12-15',
    officialUrl: 'https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/',
    verifiedAt: '2026-11-11',
  };

  return {
    ...base,
    ...overrides,
  } as Opportunity;
}

function createValidInMemoryDataset(
  opportunities: unknown[],
  lastUpdated = '2026-11-11'
): OpportunitiesDataset {
  return {
    schemaVersion: '1.0.0',
    lastUpdated,
    opportunities: opportunities as Opportunity[],
  };
}

function runSelfTests(): number {
  const referenceDate = '2026-11-11';

  const tests: SelfTestCase[] = [
    {
      name: '1. Schema file exists, parses as valid JSON, and matches ISO 3166-1 alpha-2 count (249 codes)',
      run: () => {
        assertCondition(fs.existsSync(SCHEMA_PATH), 'Schema file does not exist');
        const schemaRaw = fs.readFileSync(SCHEMA_PATH, 'utf-8');
        const schema = JSON.parse(schemaRaw) as {
          $schema: string;
          $defs: { Iso3166Alpha2Code: { enum: string[] } };
        };
        assertCondition(
          schema.$schema === 'https://json-schema.org/draft/2020-12/schema',
          'Schema must use Draft 2020-12'
        );
        const schemaIsoCodes = schema.$defs.Iso3166Alpha2Code.enum;
        assertCondition(
          ISO_3166_ALPHA_2_CODES.size === 249,
          `Expected 249 ISO codes in validator, found ${ISO_3166_ALPHA_2_CODES.size}`
        );
        assertCondition(
          schemaIsoCodes.length === 249,
          `Expected 249 ISO codes in schema, found ${schemaIsoCodes.length}`
        );
        for (const code of schemaIsoCodes) {
          assertCondition(
            ISO_3166_ALPHA_2_CODES.has(code),
            `Code ${code} in schema missing from validator set`
          );
        }
      },
    },
    {
      name: '2. Accepts valid single-country record with required fields only (no optional fields)',
      run: () => {
        const dataset = createValidInMemoryDataset([createValidInMemoryRecord()]);
        const summary = validateOpportunitiesDataset(dataset, referenceDate);
        assertCondition(summary.valid, `Expected valid dataset, got errors: ${JSON.stringify(summary.errors)}`);
        assertCondition(summary.openCount === 1, 'Expected openCount === 1');
      },
    },
    {
      name: '3. Accepts valid MULTI country record with availableCountries and supports country filter matching',
      run: () => {
        const record = createValidInMemoryRecord({
          id: 'erasmus-mundus-joint-masters',
          country: { code: 'MULTI', ar: 'عدة دول أوروبية', en: 'Multiple European Countries' },
          availableCountries: ['DE', 'FR', 'NL'],
        });
        const summary = validateOpportunitiesDataset(
          createValidInMemoryDataset([record]),
          referenceDate
        );
        assertCondition(summary.valid, `Expected valid MULTI record, got: ${JSON.stringify(summary.errors)}`);
        assertCondition(matchesCountryFilter(record, 'FR') === true, 'Expected matchesCountryFilter for FR to be true');
        assertCondition(matchesCountryFilter(record, 'US') === false, 'Expected matchesCountryFilter for US to be false');
      },
    },
    {
      name: '4. Accepts valid rolling deadline (deadline: null) and returns remainingDays === null',
      run: () => {
        const record = createValidInMemoryRecord({
          id: 'freecodecamp-responsive-web-design',
          category: 'course',
          country: { code: 'GLOBAL', ar: 'عالمي', en: 'Global' },
          mode: 'online',
          deadlineType: 'rolling',
          deadline: null,
        });
        const summary = validateOpportunitiesDataset(
          createValidInMemoryDataset([record]),
          referenceDate
        );
        assertCondition(summary.valid, `Expected valid rolling record, got: ${JSON.stringify(summary.errors)}`);
        const evalResult = evaluateOpportunityDeadline(record, referenceDate);
        assertCondition(evalResult.status === 'open', `Expected status 'open', got ${evalResult.status}`);
        assertCondition(evalResult.remainingDays === null, 'Expected remainingDays === null for rolling deadline');
      },
    },
    {
      name: '5. Accepts valid unspecified deadlineType and unspecified studyLevels with remainingDays === null',
      run: () => {
        const record = createValidInMemoryRecord({
          id: 'unspecified-deadline-and-level-check',
          studyLevels: ['unspecified'],
          fieldsOfStudy: [{ id: 'unspecified', ar: 'غير محدد في المصدر', en: 'Not specified in source' }],
          deadlineType: 'unspecified',
          deadline: null,
        });
        const summary = validateOpportunitiesDataset(
          createValidInMemoryDataset([record]),
          referenceDate
        );
        assertCondition(summary.valid, `Expected valid unspecified record, got: ${JSON.stringify(summary.errors)}`);
        const evalResult = evaluateOpportunityDeadline(record, referenceDate);
        assertCondition(
          evalResult.status === 'unspecified',
          `Expected status 'unspecified', got ${evalResult.status}`
        );
        assertCondition(
          evalResult.remainingDays === null,
          'Expected remainingDays === null for unspecified deadline'
        );
      },
    },
    {
      name: '6. Accepts legitimate title/URL containing the word "Test" without false-positive rejection',
      run: () => {
        const record = createValidInMemoryRecord({
          id: 'english-proficiency-test-prep-course',
          category: 'course',
          title: {
            ar: 'دورة التحضير لاختبار الكفاءة في اللغة الإنجليزية',
            en: 'English Proficiency Test Preparation Course',
          },
          officialUrl: 'https://www.britishcouncil.org/exam/ielts/prepare/free-practice-tests',
        });
        const summary = validateOpportunitiesDataset(
          createValidInMemoryDataset([record]),
          referenceDate
        );
        assertCondition(summary.valid, 'Legitimate record containing "test" should be accepted');
      },
    },
    {
      name: '7. Calendar day deadline math: today -> closing_soon (0 days), +14d -> closing_soon (14), +15d -> open (15), yesterday -> expired (-1) without deleting record',
      run: () => {
        assertCondition(CLOSING_SOON_THRESHOLD_DAYS === 14, 'Threshold must be 14 days');

        const dueToday = createValidInMemoryRecord({ id: 'due-today', deadline: '2026-11-11' });
        const due14Days = createValidInMemoryRecord({ id: 'due-14-days', deadline: '2026-11-25' });
        const due15Days = createValidInMemoryRecord({ id: 'due-15-days', deadline: '2026-11-26' });
        const expiredYesterday = createValidInMemoryRecord({ id: 'expired-yesterday', deadline: '2026-11-10' });

        const evalToday = evaluateOpportunityDeadline(dueToday, referenceDate);
        assertCondition(
          evalToday.status === 'closing_soon' && evalToday.remainingDays === 0,
          `Expected today to be closing_soon with 0 days, got ${JSON.stringify(evalToday)}`
        );

        const eval14 = evaluateOpportunityDeadline(due14Days, referenceDate);
        assertCondition(
          eval14.status === 'closing_soon' && eval14.remainingDays === 14,
          `Expected +14d to be closing_soon with 14 days, got ${JSON.stringify(eval14)}`
        );

        const eval15 = evaluateOpportunityDeadline(due15Days, referenceDate);
        assertCondition(
          eval15.status === 'open' && eval15.remainingDays === 15,
          `Expected +15d to be open with 15 days, got ${JSON.stringify(eval15)}`
        );

        const evalExpired = evaluateOpportunityDeadline(expiredYesterday, referenceDate);
        assertCondition(
          evalExpired.status === 'expired' && evalExpired.remainingDays === -1,
          `Expected yesterday to be expired with -1 days, got ${JSON.stringify(evalExpired)}`
        );

        const summary = validateOpportunitiesDataset(
          createValidInMemoryDataset([dueToday, due14Days, due15Days, expiredYesterday]),
          referenceDate
        );
        assertCondition(summary.valid, 'Dataset with expired record must remain valid and not be deleted');
        assertCondition(summary.totalRecords === 4, 'All 4 records must be preserved');
        assertCondition(summary.closingSoonCount === 2, 'Expected 2 closing_soon records');
        assertCondition(summary.openCount === 1, 'Expected 1 open record');
        assertCondition(summary.expiredCount === 1, 'Expected 1 expired record');
      },
    },
    {
      name: '8. Rejects duplicate opportunity IDs',
      run: () => {
        const rec1 = createValidInMemoryRecord({ id: 'duplicate-id-check' });
        const rec2 = createValidInMemoryRecord({ id: 'duplicate-id-check' });
        const summary = validateOpportunitiesDataset(
          createValidInMemoryDataset([rec1, rec2]),
          referenceDate
        );
        assertCondition(!summary.valid, 'Duplicate IDs must be rejected');
        assertCondition(
          summary.errors.some((e) => e.field === 'id' && e.message.includes('Duplicate')),
          'Expected duplicate ID error'
        );
      },
    },
    {
      name: '9. Rejects non-ISO two-letter country codes ("XX", "ZZ", "AA") and rejects "ONLINE" as country.code',
      run: () => {
        assertCondition(isValidIsoCountryCode('YE') === true, 'YE must be valid ISO code');
        assertCondition(isValidIsoCountryCode('DE') === true, 'DE must be valid ISO code');
        assertCondition(isValidIsoCountryCode('XX') === false, 'XX must be rejected');
        assertCondition(isValidIsoCountryCode('ZZ') === false, 'ZZ must be rejected');
        assertCondition(isValidIsoCountryCode('AA') === false, 'AA must be rejected');
        assertCondition(isValidCountryScopeCode('ONLINE') === false, 'ONLINE must be rejected as country code');

        const badIsoRecord = createValidInMemoryRecord({
          id: 'bad-iso-code',
          country: { code: 'XX', ar: 'دولة غير صالحة', en: 'Invalid Country' },
        });
        const onlineCountryRecord = createValidInMemoryRecord({
          id: 'online-country-code',
          country: { code: 'ONLINE', ar: 'عبر الإنترنت', en: 'Online' },
        });

        const summary = validateOpportunitiesDataset(
          createValidInMemoryDataset([badIsoRecord, onlineCountryRecord]),
          referenceDate
        );
        assertCondition(!summary.valid, 'Invalid country codes must be rejected');
        assertCondition(summary.errors.length === 2, `Expected 2 country.code errors, got ${summary.errors.length}`);
      },
    },
    {
      name: '10. Rejects availableCountries when country.code is not "MULTI", or when availableCountries has < 2 items or invalid/duplicate codes',
      run: () => {
        const withSingleCountry = createValidInMemoryRecord({
          id: 'avail-with-single-country',
          country: { code: 'DE', ar: 'ألمانيا', en: 'Germany' },
          availableCountries: ['DE', 'FR'],
        });
        const withGlobal = createValidInMemoryRecord({
          id: 'avail-with-global',
          country: { code: 'GLOBAL', ar: 'عالمي', en: 'Global' },
          availableCountries: ['DE', 'FR'],
        });
        const withOneItem = createValidInMemoryRecord({
          id: 'avail-one-item',
          country: { code: 'MULTI', ar: 'عدة دول', en: 'Multiple Countries' },
          availableCountries: ['DE'],
        });
        const withInvalidIso = createValidInMemoryRecord({
          id: 'avail-invalid-iso',
          country: { code: 'MULTI', ar: 'عدة دول', en: 'Multiple Countries' },
          availableCountries: ['DE', 'GLOBAL'],
        });

        const summary = validateOpportunitiesDataset(
          createValidInMemoryDataset([withSingleCountry, withGlobal, withOneItem, withInvalidIso]),
          referenceDate
        );
        assertCondition(!summary.valid, 'Invalid availableCountries configurations must be rejected');
        assertCondition(summary.errors.length === 4, `Expected 4 errors, got ${summary.errors.length}`);
      },
    },
    {
      name: '11. Rejects mixing "all" or "unspecified" with specific studyLevels or fieldsOfStudy',
      run: () => {
        const mixedLevels = createValidInMemoryRecord({
          id: 'mixed-study-levels',
          studyLevels: ['all', 'graduate'],
        });
        const mixedFields = createValidInMemoryRecord({
          id: 'mixed-fields-of-study',
          fieldsOfStudy: [
            { id: 'all-fields', ar: 'جميع التخصصات', en: 'All Fields' },
            { id: 'medicine', ar: 'الطب', en: 'Medicine' },
          ],
        });

        const summary = validateOpportunitiesDataset(
          createValidInMemoryDataset([mixedLevels, mixedFields]),
          referenceDate
        );
        assertCondition(!summary.valid, 'Mixing special and specific studyLevels/fieldsOfStudy must be rejected');
        assertCondition(summary.errors.length === 2, `Expected 2 errors, got ${summary.errors.length}`);
      },
    },
    {
      name: '12. Rejects impossible calendar dates (2026-02-30, 2026-02-29 non-leap) and mismatched deadlineType/deadline',
      run: () => {
        assertCondition(parseCalendarDateToUtcMs('2026-02-30') === null, '2026-02-30 must be rejected');
        assertCondition(parseCalendarDateToUtcMs('2026-02-29') === null, '2026-02-29 (non-leap) must be rejected');
        assertCondition(parseCalendarDateToUtcMs('2028-02-29') !== null, '2028-02-29 (leap year) must be accepted');

        const badCalendarDate = createValidInMemoryRecord({
          id: 'impossible-date',
          deadlineType: 'fixed',
          deadline: '2026-02-30',
        });
        const fixedWithNull = createValidInMemoryRecord({
          id: 'fixed-with-null',
          deadlineType: 'fixed',
          deadline: null,
        });
        const rollingWithDate = createValidInMemoryRecord({
          id: 'rolling-with-date',
          deadlineType: 'rolling',
          deadline: '2026-12-31',
        });

        const summary = validateOpportunitiesDataset(
          createValidInMemoryDataset([badCalendarDate, fixedWithNull, rollingWithDate]),
          referenceDate
        );
        assertCondition(!summary.valid, 'Invalid dates and deadlineType mismatches must be rejected');
        assertCondition(summary.errors.length === 3, `Expected 3 deadline errors, got ${summary.errors.length}`);
      },
    },
    {
      name: '13. Rejects non-HTTPS URLs, reserved placeholder domains (example.org, localhost, .test), and mock ID prefixes',
      run: () => {
        assertCondition(!validateOfficialHttpsUrl('http://daad.de/en').valid, 'HTTP URL must be rejected');
        assertCondition(!validateOfficialHttpsUrl('https://example.org/program').valid, 'example.org must be rejected');
        assertCondition(!validateOfficialHttpsUrl('https://localhost:3000/test').valid, 'localhost must be rejected');
        assertCondition(!validateOfficialHttpsUrl('https://portal.test/apply').valid, '.test TLD must be rejected');

        const mockRecord = createValidInMemoryRecord({
          id: 'example-demo-record',
          title: {
            ar: '[مثال توضيحي فقط] عنوان',
            en: '[ILLUSTRATIVE EXAMPLE ONLY] Title',
          },
          officialUrl: 'https://example.org/scholarship',
        });

        const summary = validateOpportunitiesDataset(
          createValidInMemoryDataset([mockRecord]),
          referenceDate
        );
        assertCondition(!summary.valid, 'Mock/illustrative record must be rejected');
        assertCondition(summary.errors.length >= 4, 'Expected errors for mock id, ar title, en title, and example.org URL');
      },
    },
    {
      name: '14. Rejects missing or future verifiedAt date and rejects static "status" property',
      run: () => {
        const futureVerified = createValidInMemoryRecord({
          id: 'future-verified-at',
          verifiedAt: '2026-12-01',
        });
        const staticStatusRecord = createValidInMemoryRecord({
          id: 'has-static-status',
          status: 'closing_soon',
        });

        const summary = validateOpportunitiesDataset(
          createValidInMemoryDataset([futureVerified, staticStatusRecord]),
          referenceDate
        );
        assertCondition(!summary.valid, 'Future verifiedAt and static status property must be rejected');
        assertCondition(
          summary.errors.some((e) => e.field === 'verifiedAt'),
          'Expected verifiedAt error'
        );
        assertCondition(
          summary.errors.some((e) => e.field === 'status'),
          'Expected prohibited static status error'
        );
      },
    },
    {
      name: '15. Rejects mismatched bilingual array lengths in optional eligibility/benefits fields',
      run: () => {
        const mismatchedEligibility = createValidInMemoryRecord({
          id: 'mismatched-eligibility-lengths',
          eligibility: {
            ar: ['شرط أول', 'شرط ثانٍ'],
            en: ['First requirement only'],
          },
        });

        const summary = validateOpportunitiesDataset(
          createValidInMemoryDataset([mismatchedEligibility]),
          referenceDate
        );
        assertCondition(!summary.valid, 'Mismatched ar/en array lengths in eligibility must be rejected');
        assertCondition(
          summary.errors.some((e) => e.field === 'eligibility'),
          'Expected eligibility array length mismatch error'
        );
      },
    },
    {
      name: '16. Date object local time: evaluateOpportunityDeadline depends strictly on local calendar day regardless of time-of-day (00:00:01 vs 23:59:59)',
      run: () => {
        const record = createValidInMemoryRecord({
          id: 'local-date-time-of-day-check',
          deadlineType: 'fixed',
          deadline: '2026-11-11',
        });

        const startOfDayLocal = new Date(2026, 10, 11, 0, 0, 1);
        const endOfDayLocal = new Date(2026, 10, 11, 23, 59, 59);
        const nextDayEarlyLocal = new Date(2026, 10, 12, 0, 0, 1);

        const evalStart = evaluateOpportunityDeadline(record, startOfDayLocal);
        const evalEnd = evaluateOpportunityDeadline(record, endOfDayLocal);
        const evalNextDay = evaluateOpportunityDeadline(record, nextDayEarlyLocal);

        assertCondition(
          evalStart.status === 'closing_soon' && evalStart.remainingDays === 0,
          `Expected 00:00:01 on deadline day to be closing_soon with 0 days, got ${JSON.stringify(evalStart)}`
        );
        assertCondition(
          evalEnd.status === 'closing_soon' && evalEnd.remainingDays === 0,
          `Expected 23:59:59 on deadline day to be closing_soon with 0 days, got ${JSON.stringify(evalEnd)}`
        );
        assertCondition(
          evalNextDay.status === 'expired' && evalNextDay.remainingDays === -1,
          `Expected 00:00:01 on next day to be expired with -1 days, got ${JSON.stringify(evalNextDay)}`
        );
      },
    },
    {
      name: '17. Rejects duplicate country codes in availableCountries (e.g. ["DE", "DE"]) when country.code is "MULTI"',
      run: () => {
        const duplicateAvailableCountries = createValidInMemoryRecord({
          id: 'duplicate-available-countries',
          country: { code: 'MULTI', ar: 'عدة دول', en: 'Multiple Countries' },
          availableCountries: ['DE', 'DE'],
        });

        const summary = validateOpportunitiesDataset(
          createValidInMemoryDataset([duplicateAvailableCountries]),
          referenceDate
        );
        assertCondition(!summary.valid, 'Duplicate country codes in availableCountries must be rejected');
        assertCondition(
          summary.errors.some(
            (e) => e.field === 'availableCountries[1]' && e.message.includes('Duplicate')
          ),
          `Expected duplicate availableCountries[1] error, got ${JSON.stringify(summary.errors)}`
        );
      },
    },
    {
      name: '18. Rejects empty or whitespace-only translated strings (e.g. title.ar, provider.en) while accepting normal internal spaces',
      run: () => {
        const whitespaceTitleAr = createValidInMemoryRecord({
          id: 'whitespace-title-ar',
          title: {
            ar: '   \t\n  ',
            en: 'Valid English Title With Normal Spaces',
          },
        });
        const emptyProviderEn = createValidInMemoryRecord({
          id: 'empty-provider-en',
          provider: {
            ar: 'جهة مانحة صحيحة مع مسافات طبيعية',
            en: '    ',
          },
        });

        const summary = validateOpportunitiesDataset(
          createValidInMemoryDataset([whitespaceTitleAr, emptyProviderEn]),
          referenceDate
        );
        assertCondition(!summary.valid, 'Whitespace-only translated text must be rejected');
        assertCondition(
          summary.errors.some((e) => e.field === 'title.ar'),
          'Expected error on whitespace-only title.ar'
        );
        assertCondition(
          summary.errors.some((e) => e.field === 'provider.en'),
          'Expected error on whitespace-only provider.en'
        );
        assertCondition(
          !summary.errors.some((e) => e.field === 'title.en' || e.field === 'provider.ar'),
          'Valid strings with normal internal spaces must not be rejected'
        );
      },
    },
    {
      name: '19. Rejects records where the "deadline" property is completely omitted when deadlineType is "rolling" or "unspecified"',
      run: () => {
        const rollingWithoutDeadlineKey = createValidInMemoryRecord({
          id: 'rolling-missing-deadline-key',
          deadlineType: 'rolling',
        }) as unknown as Record<string, unknown>;
        delete rollingWithoutDeadlineKey.deadline;

        const unspecifiedWithoutDeadlineKey = createValidInMemoryRecord({
          id: 'unspecified-missing-deadline-key',
          deadlineType: 'unspecified',
        }) as unknown as Record<string, unknown>;
        delete unspecifiedWithoutDeadlineKey.deadline;

        const summaryRolling = validateOpportunitiesDataset(
          createValidInMemoryDataset([rollingWithoutDeadlineKey]),
          referenceDate
        );
        assertCondition(
          !summaryRolling.valid &&
            summaryRolling.errors.some((e) => e.field === 'deadline'),
          'Record with deadlineType: "rolling" and omitted deadline key must be rejected'
        );

        const summaryUnspecified = validateOpportunitiesDataset(
          createValidInMemoryDataset([unspecifiedWithoutDeadlineKey]),
          referenceDate
        );
        assertCondition(
          !summaryUnspecified.valid &&
            summaryUnspecified.errors.some((e) => e.field === 'deadline'),
          'Record with deadlineType: "unspecified" and omitted deadline key must be rejected'
        );
      },
    },
  ];

  console.log('Running Phase 3 Data Validation Self-Tests (In-Memory Only)...\n');
  let passed = 0;
  let failed = 0;

  for (const testCase of tests) {
    try {
      testCase.run();
      passed++;
      console.log(`  [PASS] ${testCase.name}`);
    } catch (err) {
      failed++;
      console.error(`  [FAIL] ${testCase.name}`);
      console.error(`         Reason: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log('\n------------------------------------------------------------');
  console.log(`Self-Test Summary: ${passed} passed, ${failed} failed (Total: ${tests.length})`);
  console.log('------------------------------------------------------------');

  return failed === 0 ? 0 : 1;
}

function validateDatasetFile(targetPath: string): number {
  console.log(`Validating dataset file: ${targetPath}`);

  if (!fs.existsSync(targetPath)) {
    console.error(
      `[INFO] Dataset file not found at "${targetPath}". (Expected prior to Phase 4 data entry).`
    );
    return 1;
  }

  let parsed: unknown;
  try {
    const raw = fs.readFileSync(targetPath, 'utf-8');
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error(
      `[ERROR] Failed to read or parse JSON file: ${err instanceof Error ? err.message : String(err)}`
    );
    return 1;
  }

  const summary = validateOpportunitiesDataset(parsed);

  console.log('\n------------------------------------------------------------');
  console.log(`Total Records        : ${summary.totalRecords}`);
  console.log(`Open                 : ${summary.openCount}`);
  console.log(`Closing Soon (<=14d) : ${summary.closingSoonCount}`);
  console.log(`Expired (Preserved)  : ${summary.expiredCount}`);
  console.log(`Unspecified Deadline : ${summary.unspecifiedDeadlineCount}`);
  console.log(`Validation Errors    : ${summary.errors.length}`);
  console.log('------------------------------------------------------------');

  if (!summary.valid) {
    console.error('\nValidation Failed with the following issues:');
    for (const issue of summary.errors) {
      const prefix =
        issue.recordIndex !== undefined
          ? `Record #${issue.recordIndex}${issue.opportunityId ? ` (${issue.opportunityId})` : ''}`
          : 'Dataset';
      console.error(`  - [${prefix}] ${issue.field}: ${issue.message}`);
    }
    return 1;
  }

  console.log('\n[SUCCESS] All opportunity records passed validation.');
  return 0;
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) {
    const exitCode = runSelfTests();
    process.exit(exitCode);
  }

  const customFileArg = args.find((arg) => !arg.startsWith('--'));
  const targetPath = customFileArg
    ? path.resolve(process.cwd(), customFileArg)
    : DEFAULT_DATA_PATH;

  const exitCode = validateDatasetFile(targetPath);
  process.exit(exitCode);
}

main();

