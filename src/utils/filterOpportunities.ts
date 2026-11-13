import type {
  AvailableFilterOptions,
  EnrichedOpportunity,
  FilterState,
  SupportedLanguage,
} from '../types/contracts.ts';
import type { CountryInfo, FieldOfStudyTag } from '../types/opportunity.ts';
import {
  isValidIsoCountryCode,
  matchesCountryFilter,
  parseCalendarDateToUtcMs,
  SPECIAL_COUNTRY_SCOPES,
} from './validateOpportunities.ts';

const ARABIC_DIACRITICS_REGEX = /[\u064B-\u065F\u0670]/g;
const ARABIC_TATWEEL_REGEX = /\u0640/g;

/**
 * Normalizes text for bilingual (Arabic & English) search comparison:
 * - Removes Arabic diacritics (tashkeel) and tatweel (kashida)
 * - Lowercases Latin characters
 * - Trims and collapses consecutive whitespace
 * Does not mutate input or apply broad Arabic character substitutions that alter word meanings.
 */
export function normalizeSearchText(input: string): string {
  return input
    .replace(ARABIC_DIACRITICS_REGEX, '')
    .replace(ARABIC_TATWEEL_REGEX, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Extracts dynamic filter options strictly from the loaded dataset:
 * - countries: Unique ISO 3166-1 alpha-2 country/territory records passing isValidIsoCountryCode (excludes MULTI and GLOBAL)
 * - countryScopes: Special geographic scopes ('MULTI' and/or 'GLOBAL') actually present in the dataset
 * - fieldsOfStudy: Unique specific fields of study (excludes 'all-fields' and 'unspecified')
 */
export function extractAvailableFilterOptions(
  items: readonly EnrichedOpportunity[]
): AvailableFilterOptions {
  const countriesMap = new Map<string, CountryInfo>();
  const scopesMap = new Map<string, CountryInfo>();
  const fieldsMap = new Map<string, FieldOfStudyTag>();

  for (const item of items) {
    const { country, fieldsOfStudy } = item.opportunity;

    if (isValidIsoCountryCode(country.code)) {
      if (!countriesMap.has(country.code)) {
        countriesMap.set(country.code, { ...country });
      }
    } else if (SPECIAL_COUNTRY_SCOPES.has(country.code)) {
      if (!scopesMap.has(country.code)) {
        scopesMap.set(country.code, { ...country });
      }
    }

    for (const field of fieldsOfStudy) {
      if (field.id !== 'all-fields' && field.id !== 'unspecified') {
        if (!fieldsMap.has(field.id)) {
          fieldsMap.set(field.id, { ...field });
        }
      }
    }
  }

  const countries = Array.from(countriesMap.values()).sort((a, b) =>
    a.code.localeCompare(b.code)
  );
  const countryScopes = Array.from(scopesMap.values()).sort((a, b) =>
    a.code.localeCompare(b.code)
  );
  const fieldsOfStudy = Array.from(fieldsMap.values()).sort((a, b) =>
    a.id.localeCompare(b.id)
  );

  return {
    countries,
    countryScopes,
    fieldsOfStudy,
  };
}

function matchesSearchQuery(
  item: EnrichedOpportunity,
  normalizedQuery: string
): boolean {
  if (normalizedQuery.length === 0) {
    return true;
  }

  const { title, provider, fieldsOfStudy } = item.opportunity;

  if (
    normalizeSearchText(title.ar).includes(normalizedQuery) ||
    normalizeSearchText(title.en).includes(normalizedQuery) ||
    normalizeSearchText(provider.ar).includes(normalizedQuery) ||
    normalizeSearchText(provider.en).includes(normalizedQuery)
  ) {
    return true;
  }

  for (const field of fieldsOfStudy) {
    if (
      normalizeSearchText(field.ar).includes(normalizedQuery) ||
      normalizeSearchText(field.en).includes(normalizedQuery)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Filters and sorts enriched opportunities without mutating the input array or records.
 */
export function filterOpportunities(
  items: readonly EnrichedOpportunity[],
  filters: FilterState,
  favoriteIds: ReadonlySet<string>,
  language: SupportedLanguage
): EnrichedOpportunity[] {
  const normalizedQuery = normalizeSearchText(filters.searchQuery);

  const filtered = items.filter((item) => {
    const { opportunity, evaluation } = item;

    // 1. Favorites filter
    if (filters.onlyFavorites && !favoriteIds.has(opportunity.id)) {
      return false;
    }

    // 2. Category filter
    if (filters.category !== 'all' && opportunity.category !== filters.category) {
      return false;
    }

    // 3. Delivery mode filter
    if (filters.mode !== 'all' && opportunity.mode !== filters.mode) {
      return false;
    }

    // 4. Deadline status filter
    if (
      filters.deadlineStatus !== 'all' &&
      evaluation.status !== filters.deadlineStatus
    ) {
      return false;
    }

    // 5. Field of study filter ('all-fields' matches specific fields; 'unspecified' does not)
    if (filters.fieldOfStudyId !== 'all') {
      const matchesField = opportunity.fieldsOfStudy.some(
        (field) =>
          field.id === 'all-fields' || field.id === filters.fieldOfStudyId
      );
      if (!matchesField) {
        return false;
      }
    }

    // 6. Study level filter ('all' matches specific study levels; 'unspecified' does not)
    if (filters.studyLevel !== 'all') {
      const matchesLevel =
        opportunity.studyLevels.includes('all') ||
        opportunity.studyLevels.includes(filters.studyLevel);
      if (!matchesLevel) {
        return false;
      }
    }

    // 7. Country / Geographic scope filter
    if (filters.countryCode !== 'all') {
      if (
        filters.countryCode === 'MULTI' ||
        filters.countryCode === 'GLOBAL'
      ) {
        if (opportunity.country.code !== filters.countryCode) {
          return false;
        }
      } else if (!matchesCountryFilter(opportunity, filters.countryCode)) {
        return false;
      }
    }

    // 8. Bilingual keyword search
    if (!matchesSearchQuery(item, normalizedQuery)) {
      return false;
    }

    return true;
  });

  const sorted = [...filtered];
  const collator =
    filters.sortBy === 'title_asc'
      ? new Intl.Collator(language, { sensitivity: 'base' })
      : null;

  sorted.sort((a, b) => {
    if (filters.sortBy === 'deadline_asc') {
      const aMs =
        a.opportunity.deadline !== null
          ? parseCalendarDateToUtcMs(a.opportunity.deadline)
          : null;
      const bMs =
        b.opportunity.deadline !== null
          ? parseCalendarDateToUtcMs(b.opportunity.deadline)
          : null;

      if (aMs !== null && bMs === null) {
        return -1;
      }
      if (aMs === null && bMs !== null) {
        return 1;
      }
      if (aMs !== null && bMs !== null && aMs !== bMs) {
        return aMs - bMs;
      }
      return a.opportunity.id.localeCompare(b.opportunity.id);
    }

    if (filters.sortBy === 'verified_desc') {
      const aVerifiedMs = parseCalendarDateToUtcMs(a.opportunity.verifiedAt) ?? 0;
      const bVerifiedMs = parseCalendarDateToUtcMs(b.opportunity.verifiedAt) ?? 0;

      if (bVerifiedMs !== aVerifiedMs) {
        return bVerifiedMs - aVerifiedMs;
      }
      return a.opportunity.id.localeCompare(b.opportunity.id);
    }

    if (filters.sortBy === 'title_asc' && collator !== null) {
      const titleComparison = collator.compare(
        a.opportunity.title[language],
        b.opportunity.title[language]
      );
      if (titleComparison !== 0) {
        return titleComparison;
      }
      return a.opportunity.id.localeCompare(b.opportunity.id);
    }

    return a.opportunity.id.localeCompare(b.opportunity.id);
  });

  return sorted;
}
