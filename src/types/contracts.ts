import type {
  CountryInfo,
  DeadlineEvaluation,
  DeliveryMode,
  FieldOfStudyTag,
  LocalizedStringList,
  LocalizedText,
  Opportunity,
  OpportunityCategory,
  SpecificStudyLevel,
} from './opportunity.ts';

/**
 * Unified LocalStorage keys for client-side persistence.
 */
export const STORAGE_KEYS = {
  LANGUAGE: 'opportunity_gate_lang',
  FAVORITES: 'opportunity_gate_favorites',
} as const;

/**
 * Relative static asset path for the verified opportunities dataset inside public/.
 */
export const DATA_PATHS = {
  OPPORTUNITIES_JSON: 'data/opportunities.json',
} as const;

/**
 * Supported interface languages and text directions (Arabic RTL is the default).
 */
export type SupportedLanguage = 'ar' | 'en';
export type TextDirection = 'rtl' | 'ltr';
export const DEFAULT_LANGUAGE: SupportedLanguage = 'ar';

/**
 * Language and localization context contract (implemented by Agent B, consumed by Agent C).
 */
export interface LanguageContextValue {
  language: SupportedLanguage;
  direction: TextDirection;
  isRTL: boolean;
  setLanguage: (lang: SupportedLanguage) => void;
  toggleLanguage: () => void;
  localize: (text: LocalizedText) => string;
  localizeList: (list?: LocalizedStringList) => string[];
}

/**
 * Opportunity record paired with its runtime-evaluated deadline status and remaining days.
 */
export interface EnrichedOpportunity {
  opportunity: Opportunity;
  evaluation: DeadlineEvaluation;
}

/**
 * Dynamic filter options extracted strictly from the loaded dataset:
 * - countries: Unique sovereign countries (ISO 3166-1 alpha-2 codes present in the dataset, excluding MULTI and GLOBAL).
 * - countryScopes: Special geographic scopes ('MULTI' and/or 'GLOBAL') present in the actual dataset, separated from sovereign countries.
 * - fieldsOfStudy: Unique specific fields of study present in the dataset (excluding 'all-fields' and 'unspecified').
 */
export interface AvailableFilterOptions {
  countries: CountryInfo[];
  countryScopes: CountryInfo[];
  fieldsOfStudy: FieldOfStudyTag[];
}

/**
 * Opportunities dataset loading and runtime validation state contract (implemented by Agent A).
 */
export interface OpportunitiesDataState {
  items: EnrichedOpportunity[];
  lastUpdated: string | null;
  loading: boolean;
  error: string | null;
  availableOptions: AvailableFilterOptions;
  reload: () => Promise<void>;
}

/**
 * Filter and sort option types.
 */
export type CategoryFilter = 'all' | OpportunityCategory;
export type StudyLevelFilter = 'all' | SpecificStudyLevel;
export type DeadlineStatusFilter =
  | 'all'
  | 'open'
  | 'closing_soon'
  | 'unspecified'
  | 'expired';
export type DeliveryModeFilter = 'all' | DeliveryMode;
export type SortOption = 'deadline_asc' | 'verified_desc' | 'title_asc';

/**
 * Unified search, filter, and sort state contract.
 */
export interface FilterState {
  searchQuery: string;
  category: CategoryFilter;
  /** 'all' to show all fields, or a specific field id from the dataset */
  fieldOfStudyId: string;
  /** 'all' to show all countries/scopes, an ISO 3166-1 alpha-2 country code, or a scope code ('MULTI' / 'GLOBAL') */
  countryCode: string;
  studyLevel: StudyLevelFilter;
  deadlineStatus: DeadlineStatusFilter;
  mode: DeliveryModeFilter;
  onlyFavorites: boolean;
  sortBy: SortOption;
}

export const INITIAL_FILTER_STATE: FilterState = {
  searchQuery: '',
  category: 'all',
  fieldOfStudyId: 'all',
  countryCode: 'all',
  studyLevel: 'all',
  deadlineStatus: 'all',
  mode: 'all',
  onlyFavorites: false,
  sortBy: 'deadline_asc',
};

/**
 * Favorites persistence contract backed by LocalStorage (implemented by Agent A).
 */
export interface FavoritesState {
  favoriteIds: ReadonlySet<string>;
  favoritesCount: number;
  isFavorite: (opportunityId: string) => boolean;
  toggleFavorite: (opportunityId: string) => void;
  clearFavorites: () => void;
}

/**
 * Navigation state contract between listing, favorites, and opportunity details view.
 */
export type ActiveTab = 'all' | 'favorites';

export interface NavigationState {
  activeTab: ActiveTab;
  selectedOpportunityId: string | null;
  openOpportunityDetails: (opportunityId: string) => void;
  closeOpportunityDetails: () => void;
  setActiveTab: (tab: ActiveTab) => void;
}

