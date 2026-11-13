import type { SupportedLanguage } from '../types/contracts.ts';
import type {
  DeadlineType,
  DeliveryMode,
  DerivedOpportunityStatus,
  FundingType,
  OpportunityCategory,
  StudyLevel,
} from '../types/opportunity.ts';

export interface Translations {
  appTitle: string;
  appSubtitle: string;
  nav: {
    allOpportunities: string;
    favorites: string;
    languageToggleLabel: string;
    languageToggleAriaLabel: string;
    totalCountLabel: string;
  };
  searchAndFilters: {
    searchPlaceholder: string;
    searchAriaLabel: string;
    clearSearchAriaLabel: string;
    toggleFiltersButton: (isOpen: boolean) => string;
    categoryLabel: string;
    fieldOfStudyLabel: string;
    allFieldsOption: string;
    countryLabel: string;
    allCountriesOption: string;
    countryGroups: {
      scopesHeading: string;
      countriesHeading: string;
    };
    studyLevelLabel: string;
    deadlineStatusLabel: string;
    modeLabel: string;
    sortByLabel: string;
    onlyFavoritesLabel: string;
    resetFiltersButton: string;
    activeFiltersCountLabel: string;
    resultsCountLabel: string;
  };
  categories: Record<'all' | OpportunityCategory, string>;
  modes: Record<'all' | DeliveryMode, string>;
  studyLevels: Record<StudyLevel, string> & {
    allFilterOption: string;
  };
  deadlineStatuses: Record<'all' | DerivedOpportunityStatus, string>;
  deadlineTypes: Record<DeadlineType, string>;
  fundingTypes: Record<FundingType | 'unspecified', string>;
  sortOptions: {
    deadline_asc: string;
    verified_desc: string;
    title_asc: string;
  };
  card: {
    providerLabel: string;
    countryLabel: string;
    modeLabel: string;
    studyLevelLabel: string;
    fundingLabel: string;
    deadlineLabel: string;
    verifiedAtLabel: string;
    viewDetailsButton: string;
    officialSourceButton: string;
    addToFavoritesAria: string;
    removeFromFavoritesAria: string;
    favoriteSavedBadge: string;
    favoriteUnsavedBadge: string;
  };
  details: {
    backToListButton: string;
    overviewHeading: string;
    eligibilityHeading: string;
    benefitsHeading: string;
    fieldsOfStudyHeading: string;
    studyLevelsHeading: string;
    metadataHeading: string;
    officialUrlButton: string;
    officialUrlNotice: string;
    deadlineNotice: string;
    verifiedDateLabel: string;
    countryScopeLabel: string;
  };
  states: {
    loading: string;
    errorTitle: string;
    errorRetryButton: string;
    emptyFilteredTitle: string;
    emptyFilteredHint: string;
    emptyFavoritesTitle: string;
    emptyFavoritesHint: string;
    clearFavoritesButton: string;
  };
  footer: {
    verificationDisclaimer: string;
    lastUpdatedLabel: string;
    copyrightNotice: string;
  };
}

export const TRANSLATIONS: Record<SupportedLanguage, Translations> = {
  ar: {
    appTitle: 'بوّابة الفرص',
    appSubtitle:
      'منصة المنح الدراسية والدورات المجانية وفرص التدريب الموثقة للطلاب اليمنيين',
    nav: {
      allOpportunities: 'جميع الفرص',
      favorites: 'المفضلة',
      languageToggleLabel: 'English',
      languageToggleAriaLabel: 'التبديل إلى اللغة الإنجليزية (Switch to English)',
      totalCountLabel: 'إجمالي الفرص',
    },
    searchAndFilters: {
      searchPlaceholder: 'ابحث بعنوان الفرصة، الجهة المانحة، التخصص، أو الدولة...',
      searchAriaLabel: 'البحث في الفرص التعليمية والتدريبية',
      clearSearchAriaLabel: 'مسح نص البحث',
      toggleFiltersButton: (isOpen: boolean) =>
        isOpen ? 'إخفاء الفلاتر والترتيب' : 'إظهار الفلاتر والترتيب',
      categoryLabel: 'نوع الفرصة',
      fieldOfStudyLabel: 'التخصص الدراسي',
      allFieldsOption: 'جميع التخصصات',
      countryLabel: 'الدولة أو النطاق',
      allCountriesOption: 'جميع الدول والنطاقات',
      countryGroups: {
        scopesHeading: 'نطاقات جغرافية عامة',
        countriesHeading: 'الدول',
      },
      studyLevelLabel: 'المرحلة الدراسية',
      deadlineStatusLabel: 'حالة الموعد النهائي',
      modeLabel: 'نمط الحضور',
      sortByLabel: 'ترتيب حسب',
      onlyFavoritesLabel: 'المفضلة فقط',
      resetFiltersButton: 'إعادة ضبط الفلاتر',
      activeFiltersCountLabel: 'فلاتر نشطة',
      resultsCountLabel: 'عدد النتائج المطابقة',
    },
    categories: {
      all: 'جميع الأنواع',
      scholarship: 'منحة دراسية',
      course: 'دورة مجانية',
      internship: 'فرصة تدريب',
    },
    modes: {
      all: 'جميع الأنماط',
      onsite: 'حضوري',
      online: 'عن بُعد (أونلاين)',
      hybrid: 'مدمج (حضوري وعن بُعد)',
    },
    studyLevels: {
      allFilterOption: 'جميع المراحل الدراسية',
      all: 'جميع المراحل',
      high_school: 'خريجو الثانوية العامة',
      undergraduate: 'البكالوريوس',
      graduate: 'الدراسات العليا (ماجستير / دكتوراه)',
      recent_graduate: 'حديثو التخرج',
      unspecified: 'غير محدد في المصدر',
    },
    deadlineStatuses: {
      all: 'جميع الحالات',
      open: 'مفتوح للتقديم',
      closing_soon: 'ينتهي قريباً',
      unspecified: 'غير محدد الموعد',
      expired: 'منتهي الصلاحية',
    },
    deadlineTypes: {
      fixed: 'موعد نهائي محدد',
      rolling: 'تقديم مستمر (طوال العام)',
      unspecified: 'غير محدد في المصدر الرسمي',
    },
    fundingTypes: {
      fully_funded: 'تمويل كامل',
      partially_funded: 'تمويل جزئي',
      free: 'مجاني بالكامل',
      paid: 'مدفوع',
      unspecified: 'غير محدد في المصدر',
    },
    sortOptions: {
      deadline_asc: 'الأقرب انتهاءً أولاً',
      verified_desc: 'الأحدث توثيقاً أولاً',
      title_asc: 'الأبجدي (أ - ي)',
    },
    card: {
      providerLabel: 'الجهة المانحة',
      countryLabel: 'الدولة / النطاق',
      modeLabel: 'نمط الدراسة',
      studyLevelLabel: 'المرحلة المستهدفة',
      fundingLabel: 'نوع التمويل',
      deadlineLabel: 'الموعد النهائي',
      verifiedAtLabel: 'تاريخ التوثيق',
      viewDetailsButton: 'عرض التفاصيل',
      officialSourceButton: 'المصدر الرسمي',
      addToFavoritesAria: 'إضافة الفرصة إلى قائمة المفضلة',
      removeFromFavoritesAria: 'إزالة الفرصة من قائمة المفضلة',
      favoriteSavedBadge: 'محفوظة',
      favoriteUnsavedBadge: 'حفظ في المفضلة',
    },
    details: {
      backToListButton: 'العودة إلى قائمة الفرص',
      overviewHeading: 'نبذة عن الفرصة',
      eligibilityHeading: 'شروط الأهلية والتقديم',
      benefitsHeading: 'المزايا والتمويل',
      fieldsOfStudyHeading: 'التخصصات المتاحة',
      studyLevelsHeading: 'المراحل الدراسية المستهدفة',
      metadataHeading: 'معلومات التوثيق والموعد النهائي',
      officialUrlButton: 'الانتقال إلى صفحة التقديم الرسمية',
      officialUrlNotice:
        'يتم التقديم حصرياً عبر الموقع الرسمي للجهة المانحة. تأكد دائماً من مراجعة كافة الشروط المحدثة في المصدر الرسمي.',
      deadlineNotice:
        'تنبيه: قد تختلف المواعيد النهائية الفرعية بحسب الدولة أو البرنامج داخل المصدر الرسمي.',
      verifiedDateLabel: 'تاريخ آخر تحقق من المصدر الرسمي',
      countryScopeLabel: 'الدول المشمولة في هذا النطاق',
    },
    states: {
      loading: 'جارٍ تحميل الفرص الموثقة...',
      errorTitle: 'تعذّر تحميل بيانات الفرص حالياً',
      errorRetryButton: 'إعادة المحاولة',
      emptyFilteredTitle: 'لا توجد فرص مطابقة لمعايير البحث الحالية',
      emptyFilteredHint:
        'جرّب تعديل كلمات البحث أو إعادة ضبط الفلاتر لعرض جميع الفرص الموثقة.',
      emptyFavoritesTitle: 'قائمة المفضلة فارغة حالياً',
      emptyFavoritesHint:
        'يمكنك حفظ المنح والدورات وفرص التدريب التي تهمك بالضغط على زر النجمة في أي بطاقة للرجوع إليها لاحقاً حتى بدون اتصال بالإنترنت.',
      clearFavoritesButton: 'مسح جميع المفضلة',
    },
    footer: {
      verificationDisclaimer:
        'جميع الفرص المعروضة مستمدة من مصادرها الرسمية ومرفقة بتاريخ التحقق. لا تُمثّل هذه المنصة جهة مانحة ولا تقبل طلبات التقديم مباشرة.',
      lastUpdatedLabel: 'آخر تحديث لقاعدة البيانات:',
      copyrightNotice:
        'بوّابة الفرص (Opportunity Gate) — مبادرة رقمية مفتوحة لخدمة الطلاب والباحثين اليمنيين.',
    },
  },
  en: {
    appTitle: 'Opportunity Gate',
    appSubtitle:
      'Verified Scholarships, Free Courses & Internships for Yemeni Students',
    nav: {
      allOpportunities: 'All Opportunities',
      favorites: 'Favorites',
      languageToggleLabel: 'العربية',
      languageToggleAriaLabel: 'Switch language to Arabic (التبديل إلى العربية)',
      totalCountLabel: 'Total Opportunities',
    },
    searchAndFilters: {
      searchPlaceholder:
        'Search by title, provider, field of study, or country...',
      searchAriaLabel: 'Search educational and training opportunities',
      clearSearchAriaLabel: 'Clear search text',
      toggleFiltersButton: (isOpen: boolean) =>
        isOpen ? 'Hide Filters & Sort' : 'Show Filters & Sort',
      categoryLabel: 'Category',
      fieldOfStudyLabel: 'Field of Study',
      allFieldsOption: 'All Fields',
      countryLabel: 'Country / Scope',
      allCountriesOption: 'All Countries & Scopes',
      countryGroups: {
        scopesHeading: 'Global & Multi-Country Scopes',
        countriesHeading: 'Countries',
      },
      studyLevelLabel: 'Study Level',
      deadlineStatusLabel: 'Deadline Status',
      modeLabel: 'Delivery Mode',
      sortByLabel: 'Sort By',
      onlyFavoritesLabel: 'Favorites Only',
      resetFiltersButton: 'Reset Filters',
      activeFiltersCountLabel: 'Active Filters',
      resultsCountLabel: 'Matching Results',
    },
    categories: {
      all: 'All Categories',
      scholarship: 'Scholarship',
      course: 'Free Course',
      internship: 'Internship',
    },
    modes: {
      all: 'All Modes',
      onsite: 'On-site',
      online: 'Online',
      hybrid: 'Hybrid',
    },
    studyLevels: {
      allFilterOption: 'All Study Levels',
      all: 'All Levels',
      high_school: 'High School Graduates',
      undergraduate: 'Undergraduate (Bachelor)',
      graduate: 'Graduate (Master / PhD)',
      recent_graduate: 'Recent Graduates',
      unspecified: 'Not Specified in Source',
    },
    deadlineStatuses: {
      all: 'All Statuses',
      open: 'Open',
      closing_soon: 'Closing Soon',
      unspecified: 'Deadline Unspecified',
      expired: 'Expired',
    },
    deadlineTypes: {
      fixed: 'Fixed Deadline',
      rolling: 'Rolling Admission',
      unspecified: 'Not Specified in Official Source',
    },
    fundingTypes: {
      fully_funded: 'Fully Funded',
      partially_funded: 'Partially Funded',
      free: 'Free',
      paid: 'Paid',
      unspecified: 'Not Specified in Source',
    },
    sortOptions: {
      deadline_asc: 'Soonest Deadline First',
      verified_desc: 'Most Recently Verified',
      title_asc: 'Alphabetical (A – Z)',
    },
    card: {
      providerLabel: 'Provider',
      countryLabel: 'Country / Scope',
      modeLabel: 'Mode',
      studyLevelLabel: 'Study Level',
      fundingLabel: 'Funding',
      deadlineLabel: 'Deadline',
      verifiedAtLabel: 'Verified On',
      viewDetailsButton: 'View Details',
      officialSourceButton: 'Official Source',
      addToFavoritesAria: 'Add opportunity to favorites',
      removeFromFavoritesAria: 'Remove opportunity from favorites',
      favoriteSavedBadge: 'Saved',
      favoriteUnsavedBadge: 'Save to Favorites',
    },
    details: {
      backToListButton: 'Back to Opportunities',
      overviewHeading: 'Opportunity Overview',
      eligibilityHeading: 'Eligibility Criteria',
      benefitsHeading: 'Benefits & Funding',
      fieldsOfStudyHeading: 'Eligible Fields of Study',
      studyLevelsHeading: 'Target Study Levels',
      metadataHeading: 'Verification & Deadline Details',
      officialUrlButton: 'Go to Official Application Page',
      officialUrlNotice:
        'Applications are submitted exclusively on the official provider website. Always verify the latest terms directly on the official source.',
      deadlineNotice:
        'Note: Specific sub-deadlines may vary by country or program track on the official portal.',
      verifiedDateLabel: 'Last Verified Against Official Source',
      countryScopeLabel: 'Countries Included in Scope',
    },
    states: {
      loading: 'Loading verified opportunities...',
      errorTitle: 'Unable to load opportunities data right now',
      errorRetryButton: 'Retry',
      emptyFilteredTitle: 'No opportunities match your current filters',
      emptyFilteredHint:
        'Try adjusting your search keywords or resetting the filters to view all verified opportunities.',
      emptyFavoritesTitle: 'Your favorites list is currently empty',
      emptyFavoritesHint:
        'Save scholarships, free courses, and internships by clicking the star icon on any opportunity card for quick offline access.',
      clearFavoritesButton: 'Clear All Favorites',
    },
    footer: {
      verificationDisclaimer:
        'All listed opportunities are verified from official sources with documented verification dates. Opportunity Gate is not a granting body and does not process applications directly.',
      lastUpdatedLabel: 'Dataset last updated:',
      copyrightNotice:
        'Opportunity Gate (بوّابة الفرص) — An open educational resource for Yemeni students and researchers.',
    },
  },
};

/**
 * Formats the remaining calendar days and derived status into a localized human-readable label.
 */
export function formatRemainingDays(
  remainingDays: number | null,
  status: DerivedOpportunityStatus,
  language: SupportedLanguage,
): string {
  if (status === 'unspecified') {
    return language === 'ar'
      ? 'الموعد غير محدد في المصدر'
      : 'Deadline not specified';
  }

  if (remainingDays === null) {
    return language === 'ar'
      ? 'التقديم مفتوح (مستمر)'
      : 'Rolling admission (Open)';
  }

  if (remainingDays < 0) {
    const abs = Math.abs(remainingDays);
    if (language === 'ar') {
      if (abs === 1) return 'انتهى منذ يوم واحد';
      if (abs === 2) return 'انتهى منذ يومين';
      if (abs >= 3 && abs <= 10) return `انتهى منذ ${abs} أيام`;
      return `انتهى منذ ${abs} يوماً`;
    }
    return abs === 1 ? 'Expired 1 day ago' : `Expired ${abs} days ago`;
  }

  if (remainingDays === 0) {
    return language === 'ar' ? 'ينتهي اليوم' : 'Closes today';
  }

  if (language === 'ar') {
    if (remainingDays === 1) return 'بقي يوم واحد';
    if (remainingDays === 2) return 'بقي يومان';
    if (remainingDays >= 3 && remainingDays <= 10) {
      return `بقيت ${remainingDays} أيام`;
    }
    return `بقي ${remainingDays} يوماً`;
  }

  return remainingDays === 1 ? '1 day left' : `${remainingDays} days left`;
}
