import type { NavigationState } from '../../types/contracts.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';

export interface HeaderProps
  extends Pick<NavigationState, 'activeTab' | 'setActiveTab'> {
  /** مصدر القيمة هو FavoritesState.count */
  favoritesCount: number;
  /** إجمالي عدد الفرص المحمّلة (من OpportunitiesDataState.items.length) */
  totalCount: number;
}

export function Header({
  activeTab,
  setActiveTab,
  favoritesCount,
  totalCount,
}: HeaderProps) {
  const { language, toggleLanguage, t } = useLanguage();

  const isAllActive = activeTab === 'all';
  const isFavoritesActive = activeTab === 'favorites';

  const targetLang = language === 'ar' ? 'en' : 'ar';
  const targetDir = language === 'ar' ? 'ltr' : 'rtl';

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div className="app-header__brand">
          <h1 className="app-header__title">{t.appTitle}</h1>
          <p className="app-header__subtitle">{t.appSubtitle}</p>
        </div>

        <div className="app-header__controls">
          <nav
            className="app-header__nav"
            aria-label={
              language === 'ar' ? 'التنقل الرئيسي' : 'Primary navigation'
            }
          >
            <button
              type="button"
              className={`app-header__tab-btn${
                isAllActive ? ' app-header__tab-btn--active' : ''
              }`}
              aria-current={isAllActive ? 'page' : undefined}
              aria-pressed={isAllActive}
              onClick={() => setActiveTab('all')}
            >
              <span>{t.nav.allOpportunities}</span>
              <bdi className="app-header__badge">{totalCount}</bdi>
            </button>

            <button
              type="button"
              className={`app-header__tab-btn${
                isFavoritesActive ? ' app-header__tab-btn--active' : ''
              }`}
              aria-current={isFavoritesActive ? 'page' : undefined}
              aria-pressed={isFavoritesActive}
              onClick={() => setActiveTab('favorites')}
            >
              <span>{t.nav.favorites}</span>
              <bdi className="app-header__badge">{favoritesCount}</bdi>
            </button>
          </nav>

          <button
            type="button"
            className="app-header__lang-btn"
            lang={targetLang}
            dir={targetDir}
            aria-label={t.nav.languageToggleAriaLabel}
            onClick={toggleLanguage}
          >
            <bdi>{t.nav.languageToggleLabel}</bdi>
          </button>
        </div>
      </div>
    </header>
  );
}
