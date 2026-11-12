/**
 * TypeScript Data Model for Opportunity Gate (بوّابة الفرص)
 * Aligned strictly with schemas/opportunities.schema.json (JSON Schema Draft 2020-12)
 */

export type OpportunityCategory = 'scholarship' | 'course' | 'internship';

export type DeliveryMode = 'onsite' | 'online' | 'hybrid';

export type SpecificStudyLevel =
  | 'high_school'
  | 'undergraduate'
  | 'graduate'
  | 'recent_graduate';

export type SpecialStudyLevel = 'all' | 'unspecified';

export type StudyLevel = SpecificStudyLevel | SpecialStudyLevel;

export type DeadlineType = 'fixed' | 'rolling' | 'unspecified';

/**
 * Runtime-derived temporal status (never stored statically in JSON).
 * - 'open': Fixed deadline > 14 calendar days away, or 'rolling' deadlineType.
 * - 'closing_soon': Fixed deadline within 0..14 calendar days (inclusive of the deadline day itself).
 * - 'expired': Fixed deadline has passed (remainingDays < 0, starting the calendar day after deadline).
 * - 'unspecified': deadlineType is 'unspecified'.
 */
export type DerivedOpportunityStatus =
  | 'open'
  | 'closing_soon'
  | 'expired'
  | 'unspecified';

export type FundingType =
  | 'fully_funded'
  | 'partially_funded'
  | 'free'
  | 'paid';

export type SpecialCountryScope = 'MULTI' | 'GLOBAL';

export interface LocalizedText {
  ar: string;
  en: string;
}

export interface LocalizedStringList {
  ar: string[];
  en: string[];
}

export interface CountryInfo {
  /**
   * Either an official ISO 3166-1 alpha-2 code (e.g., "DE", "GB", "YE"),
   * or one of the special scope values: "MULTI" or "GLOBAL".
   * ("ONLINE" is strictly forbidden as a country code).
   */
  code: string;
  ar: string;
  en: string;
}

export interface FieldOfStudyTag {
  /**
   * Kebab-case identifier for the field of study.
   * Reserved values:
   * - "all-fields": Only when the official source explicitly states all fields are eligible.
   * - "unspecified": When the official source does not specify fields of study.
   */
  id: string;
  ar: string;
  en: string;
}

export interface Opportunity {
  id: string;
  category: OpportunityCategory;
  title: LocalizedText;
  provider: LocalizedText;
  country: CountryInfo;
  /**
   * Allowed ONLY when country.code === "MULTI" and the official source lists the countries.
   * Must contain at least 2 unique valid ISO 3166-1 alpha-2 country codes.
   */
  availableCountries?: string[];
  mode: DeliveryMode;
  fieldsOfStudy: FieldOfStudyTag[];
  studyLevels: StudyLevel[];
  deadlineType: DeadlineType;
  /**
   * "YYYY-MM-DD" when deadlineType === "fixed"; null when "rolling" or "unspecified".
   */
  deadline: string | null;
  /**
   * Direct official source URL (must be valid https:// URL and non-placeholder domain).
   */
  officialUrl: string;
  /**
   * Date when the record was last verified against the official source ("YYYY-MM-DD").
   */
  verifiedAt: string;
  fundingType?: FundingType;
  description?: LocalizedText;
  eligibility?: LocalizedStringList;
  benefits?: LocalizedStringList;
}

export interface OpportunitiesDataset {
  schemaVersion: '1.0.0';
  lastUpdated: string;
  opportunities: Opportunity[];
}

export interface DeadlineEvaluation {
  status: DerivedOpportunityStatus;
  /**
   * Exact calendar days remaining (0 means closes today, negative means expired).
   * Always null when deadlineType is 'rolling' or 'unspecified'.
   */
  remainingDays: number | null;
}

export interface ValidationIssue {
  recordIndex?: number;
  opportunityId?: string;
  field: string;
  message: string;
}

export interface ValidationSummary {
  valid: boolean;
  totalRecords: number;
  openCount: number;
  closingSoonCount: number;
  expiredCount: number;
  unspecifiedDeadlineCount: number;
  errors: ValidationIssue[];
}

