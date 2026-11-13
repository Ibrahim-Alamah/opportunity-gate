import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_LANGUAGE,
  STORAGE_KEYS,
  type LanguageContextValue,
  type SupportedLanguage,
  type TextDirection,
} from '../types/contracts.ts';
import type { LocalizedStringList, LocalizedText } from '../types/opportunity.ts';
import {
  formatRemainingDays,
  TRANSLATIONS,
  type Translations,
} from '../i18n/translations.ts';

/**
 * Validates a raw stored string and returns a valid SupportedLanguage ('ar' default).
 */
export function parseStoredLanguage(raw: string | null): SupportedLanguage {
  if (raw === 'ar' || raw === 'en') {
    return raw;
  }
  return DEFAULT_LANGUAGE;
}

/**
 * Safely reads the saved language preference from LocalStorage with fallback to DEFAULT_LANGUAGE ('ar').
 */
export function readLanguageFromStorage(
  storageKey: string = STORAGE_KEYS.LANGUAGE,
): SupportedLanguage {
  try {
    if (typeof window !== 'undefined' && 'localStorage' in window) {
      const stored = window.localStorage.getItem(storageKey);
      return parseStoredLanguage(stored);
    }
  } catch {
    // Ignore storage access errors (e.g. private browsing / SecurityError)
  }
  return DEFAULT_LANGUAGE;
}

/**
 * Safely persists the chosen language to LocalStorage.
 * Returns true if persisted, or false if LocalStorage is unavailable or throws.
 */
export function writeLanguageToStorage(
  lang: SupportedLanguage,
  storageKey: string = STORAGE_KEYS.LANGUAGE,
): boolean {
  try {
    if (typeof window !== 'undefined' && 'localStorage' in window) {
      window.localStorage.setItem(storageKey, lang);
      return true;
    }
  } catch {
    // Ignore QuotaExceededError / SecurityError
  }
  return false;
}

/**
 * Maps a SupportedLanguage to its corresponding document text direction.
 */
export function getDirectionForLanguage(lang: SupportedLanguage): TextDirection {
  return lang === 'ar' ? 'rtl' : 'ltr';
}

export interface ExtendedLanguageContextValue extends LanguageContextValue {
  t: Translations;
  formatRemainingDays: typeof formatRemainingDays;
}

const LanguageContext = createContext<ExtendedLanguageContextValue | undefined>(
  undefined,
);

export interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<SupportedLanguage>(() =>
    readLanguageFromStorage(),
  );

  const direction = getDirectionForLanguage(language);
  const isRTL = direction === 'rtl';

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      document.documentElement.dir = direction;
      document.title =
        language === 'ar'
          ? 'بوّابة الفرص | Opportunity Gate'
          : 'Opportunity Gate | بوّابة الفرص';
    }
  }, [language, direction]);

  const setLanguage = useCallback((nextLang: SupportedLanguage) => {
    const validLang = parseStoredLanguage(nextLang);
    setLanguageState(validLang);
    writeLanguageToStorage(validLang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => {
      const next: SupportedLanguage = prev === 'ar' ? 'en' : 'ar';
      writeLanguageToStorage(next);
      return next;
    });
  }, []);

  const localize = useCallback(
    (text: LocalizedText): string => {
      return text[language] || text.ar || text.en || '';
    },
    [language],
  );

  const localizeList = useCallback(
    (list?: LocalizedStringList): string[] => {
      if (!list) return [];
      const localized = list[language];
      if (Array.isArray(localized) && localized.length > 0) {
        return localized;
      }
      return list.ar ?? list.en ?? [];
    },
    [language],
  );

  const value = useMemo<ExtendedLanguageContextValue>(
    () => ({
      language,
      direction,
      isRTL,
      setLanguage,
      toggleLanguage,
      localize,
      localizeList,
      t: TRANSLATIONS[language],
      formatRemainingDays,
    }),
    [language, direction, isRTL, setLanguage, toggleLanguage, localize, localizeList],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): ExtendedLanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
