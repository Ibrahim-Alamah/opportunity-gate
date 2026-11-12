import type {
  DeadlineEvaluation,
  DeadlineType,
  DeliveryMode,
  FundingType,
  OpportunitiesDataset,
  Opportunity,
  OpportunityCategory,
  SpecificStudyLevel,
  StudyLevel,
  ValidationIssue,
  ValidationSummary,
} from '../types/opportunity.ts';

/**
 * Threshold in calendar days for marking a fixed-deadline opportunity as 'closing_soon'.
 * 0..14 days remaining (inclusive) -> 'closing_soon'.
 */
export const CLOSING_SOON_THRESHOLD_DAYS = 14;

const MS_PER_DAY = 86_400_000;

/**
 * Official 249 ISO 3166-1 alpha-2 country codes.
 * Used for O(1) validation without external dependencies.
 */
export const ISO_3166_ALPHA_2_CODES: ReadonlySet<string> = new Set<string>([
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ',
  'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY', 'BZ',
  'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ',
  'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ',
  'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET',
  'FI', 'FJ', 'FK', 'FM', 'FO', 'FR',
  'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY',
  'HK', 'HM', 'HN', 'HR', 'HT', 'HU',
  'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT',
  'JE', 'JM', 'JO', 'JP',
  'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ',
  'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY',
  'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ',
  'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ',
  'OM',
  'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY',
  'QA',
  'RE', 'RO', 'RS', 'RU', 'RW',
  'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ',
  'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ',
  'UA', 'UG', 'UM', 'US', 'UY', 'UZ',
  'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU',
  'WF', 'WS',
  'YE', 'YT',
  'ZA', 'ZM', 'ZW',
]);

export const SPECIAL_COUNTRY_SCOPES: ReadonlySet<string> = new Set<string>([
  'MULTI',
  'GLOBAL',
]);

const VALID_CATEGORIES: ReadonlySet<OpportunityCategory> = new Set([
  'scholarship',
  'course',
  'internship',
]);

const VALID_MODES: ReadonlySet<DeliveryMode> = new Set([
  'onsite',
  'online',
  'hybrid',
]);

const SPECIFIC_STUDY_LEVELS: ReadonlySet<SpecificStudyLevel> = new Set([
  'high_school',
  'undergraduate',
  'graduate',
  'recent_graduate',
]);

const SPECIAL_STUDY_LEVELS: ReadonlySet<StudyLevel> = new Set([
  'all',
  'unspecified',
]);

const VALID_DEADLINE_TYPES: ReadonlySet<DeadlineType> = new Set([
  'fixed',
  'rolling',
  'unspecified',
]);

const VALID_FUNDING_TYPES: ReadonlySet<FundingType> = new Set([
  'fully_funded',
  'partially_funded',
  'free',
  'paid',
]);

const ALLOWED_ROOT_KEYS: ReadonlySet<string> = new Set([
  'schemaVersion',
  'lastUpdated',
  'opportunities',
]);

const ALLOWED_OPPORTUNITY_KEYS: ReadonlySet<string> = new Set([
  'id',
  'category',
  'title',
  'provider',
  'country',
  'availableCountries',
  'mode',
  'fieldsOfStudy',
  'studyLevels',
  'deadlineType',
  'deadline',
  'officialUrl',
  'verifiedAt',
  'fundingType',
  'description',
  'eligibility',
  'benefits',
]);

const KEBAB_CASE_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MOCK_ID_PREFIX_REGEX = /^(example-|mock-|dummy-|sample-demo-)/i;
const ILLUSTRATIVE_MARKER_REGEX =
  /\[ILLUSTRATIVE EXAMPLE ONLY[^\]]*\]|\[مثال توضيحي فقط[^\]]*\]/i;
const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const RESERVED_PLACEHOLDER_HOSTS: ReadonlySet<string> = new Set([
  'example.com',
  'example.org',
  'example.net',
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
]);

const RESERVED_PLACEHOLDER_TLDS = [
  '.example',
  '.test',
  '.invalid',
  '.localhost',
];

/**
 * Checks whether a string is a valid official ISO 3166-1 alpha-2 country code.
 */
export function isValidIsoCountryCode(code: unknown): code is string {
  return typeof code === 'string' && ISO_3166_ALPHA_2_CODES.has(code);
}

/**
 * Checks whether a string is a valid country scope code (ISO 3166-1 alpha-2, "MULTI", or "GLOBAL").
 */
export function isValidCountryScopeCode(code: unknown): code is string {
  return (
    typeof code === 'string' &&
    (ISO_3166_ALPHA_2_CODES.has(code) || SPECIAL_COUNTRY_SCOPES.has(code))
  );
}

/**
 * Parses a "YYYY-MM-DD" string into a UTC midnight timestamp (ms).
 * Verifies actual calendar validity (e.g. rejects 2026-02-30 or 2026-02-29 in non-leap year).
 * Returns null if the string is not a valid calendar date.
 */
export function parseCalendarDateToUtcMs(dateStr: unknown): number | null {
  if (typeof dateStr !== 'string' || !DATE_FORMAT_REGEX.test(dateStr)) {
    return null;
  }

  const parts = dateStr.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (year < 1970 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const utcMs = Date.UTC(year, month - 1, day);
  const checkDate = new Date(utcMs);

  if (
    checkDate.getUTCFullYear() !== year ||
    checkDate.getUTCMonth() !== month - 1 ||
    checkDate.getUTCDate() !== day
  ) {
    return null;
  }

  return utcMs;
}

/**
 * Normalizes a Date instance or "YYYY-MM-DD" string to a UTC midnight timestamp
 * representing the calendar day without timezone or DST drift.
 */
export function toCalendarDayUtcMs(referenceDate: Date | string = new Date()): number {
  if (typeof referenceDate === 'string') {
    const parsed = parseCalendarDateToUtcMs(referenceDate);
    if (parsed === null) {
      throw new Error(`Invalid reference calendar date string: "${referenceDate}"`);
    }
    return parsed;
  }

  return Date.UTC(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
}

/**
 * Evaluates the runtime status and remaining calendar days of an opportunity.
 * - Fixed deadline remains active throughout its entire calendar day (remainingDays === 0 -> 'closing_soon').
 * - Opportunity becomes 'expired' starting the next calendar day (remainingDays < 0).
 * - 'rolling' and 'unspecified' deadlines always have remainingDays === null.
 */
export function evaluateOpportunityDeadline(
  opportunity: Pick<Opportunity, 'deadlineType' | 'deadline'>,
  referenceDate: Date | string = new Date()
): DeadlineEvaluation {
  if (opportunity.deadlineType === 'rolling') {
    return {
      status: 'open',
      remainingDays: null,
    };
  }

  if (opportunity.deadlineType === 'unspecified') {
    return {
      status: 'unspecified',
      remainingDays: null,
    };
  }

  const deadlineUtcMs = parseCalendarDateToUtcMs(opportunity.deadline);
  if (deadlineUtcMs === null) {
    return {
      status: 'unspecified',
      remainingDays: null,
    };
  }

  const todayUtcMs = toCalendarDayUtcMs(referenceDate);
  const remainingDays = Math.round((deadlineUtcMs - todayUtcMs) / MS_PER_DAY);

  if (remainingDays < 0) {
    return {
      status: 'expired',
      remainingDays,
    };
  }

  if (remainingDays <= CLOSING_SOON_THRESHOLD_DAYS) {
    return {
      status: 'closing_soon',
      remainingDays,
    };
  }

  return {
    status: 'open',
    remainingDays,
  };
}

/**
 * Validates an official source URL:
 * - Must be a syntactically valid URL with protocol 'https:'.
 * - Must not use reserved example/local/test hostnames or TLDs.
 * Note: Syntactic validation does not replace human verification of the official source.
 */
export function validateOfficialHttpsUrl(urlValue: unknown): {
  valid: boolean;
  reason?: string;
} {
  if (typeof urlValue !== 'string' || urlValue.trim().length === 0) {
    return { valid: false, reason: 'officialUrl must be a non-empty string.' };
  }

  if (/\s/.test(urlValue)) {
    return { valid: false, reason: 'officialUrl must not contain whitespace.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(urlValue);
  } catch {
    return { valid: false, reason: 'officialUrl is not a valid URL.' };
  }

  if (parsed.protocol !== 'https:') {
    return {
      valid: false,
      reason: `officialUrl must use HTTPS protocol (found "${parsed.protocol}").`,
    };
  }

  if (parsed.username || parsed.password) {
    return {
      valid: false,
      reason: 'officialUrl must not contain embedded credentials.',
    };
  }

  const host = parsed.hostname.toLowerCase();
  if (!host || !host.includes('.')) {
    return {
      valid: false,
      reason: `officialUrl hostname "${parsed.hostname}" is not a valid public domain.`,
    };
  }

  if (RESERVED_PLACEHOLDER_HOSTS.has(host)) {
    return {
      valid: false,
      reason: `officialUrl hostname "${parsed.hostname}" is a reserved placeholder/local domain.`,
    };
  }

  for (const suffix of RESERVED_PLACEHOLDER_TLDS) {
    if (host.endsWith(suffix)) {
      return {
        valid: false,
        reason: `officialUrl hostname "${parsed.hostname}" uses a reserved placeholder/test TLD ("${suffix}").`,
      };
    }
  }

  return { valid: true };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateLocalizedText(
  value: unknown,
  fieldPath: string,
  errors: ValidationIssue[],
  context: { recordIndex: number; opportunityId?: string }
): void {
  if (!isPlainObject(value)) {
    errors.push({
      ...context,
      field: fieldPath,
      message: `${fieldPath} must be an object with "ar" and "en" strings.`,
    });
    return;
  }

  for (const key of Object.keys(value)) {
    if (key !== 'ar' && key !== 'en') {
      errors.push({
        ...context,
        field: `${fieldPath}.${key}`,
        message: `Unexpected property "${key}" in ${fieldPath}. Only "ar" and "en" are allowed.`,
      });
    }
  }

  for (const lang of ['ar', 'en'] as const) {
    const text = value[lang];
    if (!isNonEmptyText(text)) {
      errors.push({
        ...context,
        field: `${fieldPath}.${lang}`,
        message: `${fieldPath}.${lang} must be a non-empty string.`,
      });
    } else if (ILLUSTRATIVE_MARKER_REGEX.test(text)) {
      errors.push({
        ...context,
        field: `${fieldPath}.${lang}`,
        message: `${fieldPath}.${lang} contains an illustrative example marker and cannot be used as real data.`,
      });
    }
  }
}

function validateLocalizedStringList(
  value: unknown,
  fieldPath: string,
  errors: ValidationIssue[],
  context: { recordIndex: number; opportunityId?: string }
): void {
  if (!isPlainObject(value)) {
    errors.push({
      ...context,
      field: fieldPath,
      message: `${fieldPath} must be an object with "ar" and "en" string arrays.`,
    });
    return;
  }

  for (const key of Object.keys(value)) {
    if (key !== 'ar' && key !== 'en') {
      errors.push({
        ...context,
        field: `${fieldPath}.${key}`,
        message: `Unexpected property "${key}" in ${fieldPath}. Only "ar" and "en" are allowed.`,
      });
    }
  }

  const arList = value.ar;
  const enList = value.en;

  if (!Array.isArray(arList) || arList.length === 0) {
    errors.push({
      ...context,
      field: `${fieldPath}.ar`,
      message: `${fieldPath}.ar must be a non-empty array of strings.`,
    });
  } else {
    arList.forEach((item, idx) => {
      if (!isNonEmptyText(item)) {
        errors.push({
          ...context,
          field: `${fieldPath}.ar[${idx}]`,
          message: `${fieldPath}.ar[${idx}] must be a non-empty string.`,
        });
      } else if (ILLUSTRATIVE_MARKER_REGEX.test(item)) {
        errors.push({
          ...context,
          field: `${fieldPath}.ar[${idx}]`,
          message: `${fieldPath}.ar[${idx}] contains an illustrative example marker.`,
        });
      }
    });
  }

  if (!Array.isArray(enList) || enList.length === 0) {
    errors.push({
      ...context,
      field: `${fieldPath}.en`,
      message: `${fieldPath}.en must be a non-empty array of strings.`,
    });
  } else {
    enList.forEach((item, idx) => {
      if (!isNonEmptyText(item)) {
        errors.push({
          ...context,
          field: `${fieldPath}.en[${idx}]`,
          message: `${fieldPath}.en[${idx}] must be a non-empty string.`,
        });
      } else if (ILLUSTRATIVE_MARKER_REGEX.test(item)) {
        errors.push({
          ...context,
          field: `${fieldPath}.en[${idx}]`,
          message: `${fieldPath}.en[${idx}] contains an illustrative example marker.`,
        });
      }
    });
  }

  if (
    Array.isArray(arList) &&
    Array.isArray(enList) &&
    arList.length > 0 &&
    enList.length > 0 &&
    arList.length !== enList.length
  ) {
    errors.push({
      ...context,
      field: fieldPath,
      message: `${fieldPath}.ar (${arList.length}) and ${fieldPath}.en (${enList.length}) must have the same number of items.`,
    });
  }
}

/**
 * Validates an entire OpportunitiesDataset object against all Phase 3 schema and data integrity rules.
 */
export function validateOpportunitiesDataset(
  dataset: unknown,
  referenceDate: Date | string = new Date()
): ValidationSummary {
  const errors: ValidationIssue[] = [];
  let openCount = 0;
  let closingSoonCount = 0;
  let expiredCount = 0;
  let unspecifiedDeadlineCount = 0;

  let referenceUtcMs: number;
  try {
    referenceUtcMs = toCalendarDayUtcMs(referenceDate);
  } catch (err) {
    errors.push({
      field: 'referenceDate',
      message: err instanceof Error ? err.message : 'Invalid referenceDate.',
    });
    return {
      valid: false,
      totalRecords: 0,
      openCount: 0,
      closingSoonCount: 0,
      expiredCount: 0,
      unspecifiedDeadlineCount: 0,
      errors,
    };
  }

  if (!isPlainObject(dataset)) {
    errors.push({
      field: 'root',
      message: 'Dataset root must be a JSON object.',
    });
    return {
      valid: false,
      totalRecords: 0,
      openCount: 0,
      closingSoonCount: 0,
      expiredCount: 0,
      unspecifiedDeadlineCount: 0,
      errors,
    };
  }

  for (const key of Object.keys(dataset)) {
    if (!ALLOWED_ROOT_KEYS.has(key)) {
      errors.push({
        field: key,
        message: `Unexpected root property "${key}". Allowed properties: schemaVersion, lastUpdated, opportunities.`,
      });
    }
  }

  if (dataset.schemaVersion !== '1.0.0') {
    errors.push({
      field: 'schemaVersion',
      message: `schemaVersion must be "1.0.0" (found ${JSON.stringify(dataset.schemaVersion)}).`,
    });
  }

  const lastUpdatedMs = parseCalendarDateToUtcMs(dataset.lastUpdated);
  if (lastUpdatedMs === null) {
    errors.push({
      field: 'lastUpdated',
      message: 'lastUpdated must be a valid calendar date in YYYY-MM-DD format.',
    });
  } else if (lastUpdatedMs > referenceUtcMs) {
    errors.push({
      field: 'lastUpdated',
      message: `lastUpdated (${String(dataset.lastUpdated)}) cannot be in the future.`,
    });
  }

  if (!Array.isArray(dataset.opportunities)) {
    errors.push({
      field: 'opportunities',
      message: 'opportunities must be an array.',
    });
    return {
      valid: false,
      totalRecords: 0,
      openCount: 0,
      closingSoonCount: 0,
      expiredCount: 0,
      unspecifiedDeadlineCount: 0,
      errors,
    };
  }

  const seenIds = new Set<string>();

  dataset.opportunities.forEach((rawRecord, index) => {
    if (!isPlainObject(rawRecord)) {
      errors.push({
        recordIndex: index,
        field: `opportunities[${index}]`,
        message: 'Opportunity record must be a JSON object.',
      });
      return;
    }

    const rawId = typeof rawRecord.id === 'string' ? rawRecord.id : undefined;
    const context = { recordIndex: index, opportunityId: rawId };

    // Check for unexpected or prohibited fields (such as static 'status')
    for (const key of Object.keys(rawRecord)) {
      if (!ALLOWED_OPPORTUNITY_KEYS.has(key)) {
        errors.push({
          ...context,
          field: key,
          message:
            key === 'status'
              ? 'Static "status" field is prohibited in JSON; temporal status is derived automatically at runtime.'
              : `Unexpected property "${key}" on opportunity record.`,
        });
      }
    }

    // 1. Validate id
    if (!isNonEmptyText(rawRecord.id)) {
      errors.push({
        ...context,
        field: 'id',
        message: 'id is required and must be a non-empty string.',
      });
    } else {
      if (!KEBAB_CASE_REGEX.test(rawRecord.id)) {
        errors.push({
          ...context,
          field: 'id',
          message: `id "${rawRecord.id}" must be lowercase kebab-case (a-z, 0-9, hyphen).`,
        });
      }
      if (MOCK_ID_PREFIX_REGEX.test(rawRecord.id)) {
        errors.push({
          ...context,
          field: 'id',
          message: `id "${rawRecord.id}" starts with a reserved mock/example prefix.`,
        });
      }
      if (seenIds.has(rawRecord.id)) {
        errors.push({
          ...context,
          field: 'id',
          message: `Duplicate opportunity id "${rawRecord.id}".`,
        });
      } else {
        seenIds.add(rawRecord.id);
      }
    }

    // 2. Validate category
    if (
      typeof rawRecord.category !== 'string' ||
      !VALID_CATEGORIES.has(rawRecord.category as OpportunityCategory)
    ) {
      errors.push({
        ...context,
        field: 'category',
        message: 'category must be one of: "scholarship", "course", "internship".',
      });
    }

    // 3. Validate title & provider
    validateLocalizedText(rawRecord.title, 'title', errors, context);
    validateLocalizedText(rawRecord.provider, 'provider', errors, context);

    // 4. Validate country & availableCountries
    let countryCode: string | undefined;
    if (!isPlainObject(rawRecord.country)) {
      errors.push({
        ...context,
        field: 'country',
        message: 'country must be an object with "code", "ar", and "en".',
      });
    } else {
      for (const key of Object.keys(rawRecord.country)) {
        if (key !== 'code' && key !== 'ar' && key !== 'en') {
          errors.push({
            ...context,
            field: `country.${key}`,
            message: `Unexpected property "${key}" in country.`,
          });
        }
      }

      const rawCode = rawRecord.country.code;
      if (rawCode === 'ONLINE') {
        errors.push({
          ...context,
          field: 'country.code',
          message:
            '"ONLINE" is prohibited as a country.code. Use mode: "online" and set country.code to an ISO 3166-1 alpha-2 code, "MULTI", or "GLOBAL".',
        });
      } else if (!isValidCountryScopeCode(rawCode)) {
        errors.push({
          ...context,
          field: 'country.code',
          message: `country.code "${String(rawCode)}" is not a valid ISO 3166-1 alpha-2 code, "MULTI", or "GLOBAL".`,
        });
      } else {
        countryCode = rawCode;
      }

      if (!isNonEmptyText(rawRecord.country.ar)) {
        errors.push({
          ...context,
          field: 'country.ar',
          message: 'country.ar must be a non-empty string.',
        });
      }
      if (!isNonEmptyText(rawRecord.country.en)) {
        errors.push({
          ...context,
          field: 'country.en',
          message: 'country.en must be a non-empty string.',
        });
      }
    }

    if (rawRecord.availableCountries !== undefined) {
      if (countryCode !== 'MULTI') {
        errors.push({
          ...context,
          field: 'availableCountries',
          message:
            'availableCountries is only allowed when country.code is "MULTI".',
        });
      } else if (!Array.isArray(rawRecord.availableCountries)) {
        errors.push({
          ...context,
          field: 'availableCountries',
          message: 'availableCountries must be an array of ISO 3166-1 alpha-2 country codes.',
        });
      } else {
        if (rawRecord.availableCountries.length < 2) {
          errors.push({
            ...context,
            field: 'availableCountries',
            message: 'availableCountries must contain at least 2 country codes when provided.',
          });
        }
        const seenCountryCodes = new Set<string>();
        rawRecord.availableCountries.forEach((cCode, cIdx) => {
          if (!isValidIsoCountryCode(cCode)) {
            errors.push({
              ...context,
              field: `availableCountries[${cIdx}]`,
              message: `availableCountries[${cIdx}] ("${String(cCode)}") is not a valid official ISO 3166-1 alpha-2 country code.`,
            });
          } else if (seenCountryCodes.has(cCode)) {
            errors.push({
              ...context,
              field: `availableCountries[${cIdx}]`,
              message: `Duplicate country code "${cCode}" in availableCountries.`,
            });
          } else {
            seenCountryCodes.add(cCode);
          }
        });
      }
    }

    // 5. Validate mode
    if (
      typeof rawRecord.mode !== 'string' ||
      !VALID_MODES.has(rawRecord.mode as DeliveryMode)
    ) {
      errors.push({
        ...context,
        field: 'mode',
        message: 'mode must be one of: "onsite", "online", "hybrid".',
      });
    }

    // 6. Validate fieldsOfStudy
    if (
      !Array.isArray(rawRecord.fieldsOfStudy) ||
      rawRecord.fieldsOfStudy.length === 0
    ) {
      errors.push({
        ...context,
        field: 'fieldsOfStudy',
        message: 'fieldsOfStudy must be a non-empty array.',
      });
    } else {
      const seenFieldIds = new Set<string>();
      rawRecord.fieldsOfStudy.forEach((fieldTag, fIdx) => {
        if (!isPlainObject(fieldTag)) {
          errors.push({
            ...context,
            field: `fieldsOfStudy[${fIdx}]`,
            message: 'Each fieldsOfStudy item must be an object with "id", "ar", and "en".',
          });
          return;
        }
        for (const key of Object.keys(fieldTag)) {
          if (key !== 'id' && key !== 'ar' && key !== 'en') {
            errors.push({
              ...context,
              field: `fieldsOfStudy[${fIdx}].${key}`,
              message: `Unexpected property "${key}" in fieldsOfStudy[${fIdx}].`,
            });
          }
        }
        if (!isNonEmptyText(fieldTag.id) || !KEBAB_CASE_REGEX.test(fieldTag.id)) {
          errors.push({
            ...context,
            field: `fieldsOfStudy[${fIdx}].id`,
            message: 'fieldsOfStudy item id must be a non-empty kebab-case string.',
          });
        } else if (seenFieldIds.has(fieldTag.id)) {
          errors.push({
            ...context,
            field: `fieldsOfStudy[${fIdx}].id`,
            message: `Duplicate field of study id "${fieldTag.id}".`,
          });
        } else {
          seenFieldIds.add(fieldTag.id);
        }

        if (!isNonEmptyText(fieldTag.ar)) {
          errors.push({
            ...context,
            field: `fieldsOfStudy[${fIdx}].ar`,
            message: `fieldsOfStudy[${fIdx}].ar must be a non-empty string.`,
          });
        }
        if (!isNonEmptyText(fieldTag.en)) {
          errors.push({
            ...context,
            field: `fieldsOfStudy[${fIdx}].en`,
            message: `fieldsOfStudy[${fIdx}].en must be a non-empty string.`,
          });
        }
      });

      if (
        rawRecord.fieldsOfStudy.length > 1 &&
        (seenFieldIds.has('all-fields') || seenFieldIds.has('unspecified'))
      ) {
        errors.push({
          ...context,
          field: 'fieldsOfStudy',
          message:
            '"all-fields" or "unspecified" in fieldsOfStudy cannot be combined with specific fields.',
        });
      }
    }

    // 7. Validate studyLevels
    if (
      !Array.isArray(rawRecord.studyLevels) ||
      rawRecord.studyLevels.length === 0
    ) {
      errors.push({
        ...context,
        field: 'studyLevels',
        message: 'studyLevels must be a non-empty array.',
      });
    } else {
      const seenLevels = new Set<string>();
      let hasSpecialLevel = false;

      rawRecord.studyLevels.forEach((level, lIdx) => {
        if (typeof level !== 'string') {
          errors.push({
            ...context,
            field: `studyLevels[${lIdx}]`,
            message: 'studyLevels item must be a string.',
          });
          return;
        }
        if (
          !SPECIFIC_STUDY_LEVELS.has(level as SpecificStudyLevel) &&
          !SPECIAL_STUDY_LEVELS.has(level as StudyLevel)
        ) {
          errors.push({
            ...context,
            field: `studyLevels[${lIdx}]`,
            message: `Invalid studyLevel "${level}". Allowed values: high_school, undergraduate, graduate, recent_graduate, all, unspecified.`,
          });
          return;
        }
        if (SPECIAL_STUDY_LEVELS.has(level as StudyLevel)) {
          hasSpecialLevel = true;
        }
        if (seenLevels.has(level)) {
          errors.push({
            ...context,
            field: `studyLevels[${lIdx}]`,
            message: `Duplicate studyLevel "${level}".`,
          });
        } else {
          seenLevels.add(level);
        }
      });

      if (hasSpecialLevel && rawRecord.studyLevels.length > 1) {
        errors.push({
          ...context,
          field: 'studyLevels',
          message:
            '"all" or "unspecified" in studyLevels must be the sole element in the array and cannot be combined with other study levels.',
        });
      }
    }

    // 8. Validate deadlineType & deadline
    if (!('deadline' in rawRecord)) {
      errors.push({
        ...context,
        field: 'deadline',
        message: 'deadline property is required on every record (use null for rolling or unspecified deadlines).',
      });
    }

    const dType = rawRecord.deadlineType;
    if (
      typeof dType !== 'string' ||
      !VALID_DEADLINE_TYPES.has(dType as DeadlineType)
    ) {
      errors.push({
        ...context,
        field: 'deadlineType',
        message: 'deadlineType must be one of: "fixed", "rolling", "unspecified".',
      });
    } else if (dType === 'fixed') {
      const deadlineMs = parseCalendarDateToUtcMs(rawRecord.deadline);
      if (deadlineMs === null) {
        errors.push({
          ...context,
          field: 'deadline',
          message:
            'When deadlineType is "fixed", deadline must be a valid calendar date string in YYYY-MM-DD format.',
        });
      } else {
        const evaluation = evaluateOpportunityDeadline(
          { deadlineType: 'fixed', deadline: rawRecord.deadline as string },
          referenceDate
        );
        if (evaluation.status === 'open') {
          openCount++;
        } else if (evaluation.status === 'closing_soon') {
          closingSoonCount++;
        } else if (evaluation.status === 'expired') {
          expiredCount++;
        }
      }
    } else {
      if (rawRecord.deadline !== null) {
        errors.push({
          ...context,
          field: 'deadline',
          message: `When deadlineType is "${dType}", deadline must be null.`,
        });
      } else {
        if (dType === 'rolling') {
          openCount++;
        } else {
          unspecifiedDeadlineCount++;
        }
      }
    }

    // 9. Validate officialUrl
    const urlCheck = validateOfficialHttpsUrl(rawRecord.officialUrl);
    if (!urlCheck.valid) {
      errors.push({
        ...context,
        field: 'officialUrl',
        message: urlCheck.reason ?? 'Invalid officialUrl.',
      });
    }

    // 10. Validate verifiedAt
    const verifiedAtMs = parseCalendarDateToUtcMs(rawRecord.verifiedAt);
    if (verifiedAtMs === null) {
      errors.push({
        ...context,
        field: 'verifiedAt',
        message: 'verifiedAt is required and must be a valid calendar date in YYYY-MM-DD format.',
      });
    } else if (verifiedAtMs > referenceUtcMs) {
      errors.push({
        ...context,
        field: 'verifiedAt',
        message: `verifiedAt (${String(rawRecord.verifiedAt)}) cannot be in the future.`,
      });
    }

    // 11. Validate optional fields when present
    if (rawRecord.fundingType !== undefined) {
      if (
        typeof rawRecord.fundingType !== 'string' ||
        !VALID_FUNDING_TYPES.has(rawRecord.fundingType as FundingType)
      ) {
        errors.push({
          ...context,
          field: 'fundingType',
          message:
            'fundingType must be one of: "fully_funded", "partially_funded", "free", "paid".',
        });
      }
    }

    if (rawRecord.description !== undefined) {
      validateLocalizedText(rawRecord.description, 'description', errors, context);
    }

    if (rawRecord.eligibility !== undefined) {
      validateLocalizedStringList(rawRecord.eligibility, 'eligibility', errors, context);
    }

    if (rawRecord.benefits !== undefined) {
      validateLocalizedStringList(rawRecord.benefits, 'benefits', errors, context);
    }
  });

  return {
    valid: errors.length === 0,
    totalRecords: dataset.opportunities.length,
    openCount,
    closingSoonCount,
    expiredCount,
    unspecifiedDeadlineCount,
    errors,
  };
}

/**
 * Helper for country filtering in the application:
 * Returns true if the opportunity matches a selected ISO country code (either directly via country.code
 * or via availableCountries when country.code === 'MULTI').
 */
export function matchesCountryFilter(
  opportunity: Pick<Opportunity, 'country' | 'availableCountries'>,
  targetCountryCode: string
): boolean {
  if (opportunity.country.code === targetCountryCode) {
    return true;
  }
  if (
    opportunity.country.code === 'MULTI' &&
    Array.isArray(opportunity.availableCountries) &&
    opportunity.availableCountries.includes(targetCountryCode)
  ) {
    return true;
  }
  return false;
}

