import { useState, useMemo, useCallback } from 'react';
import {
  INITIAL_FILTER_STATE,
  type ActiveTab,
  type CategoryFilter,
  type DeadlineStatusFilter,
  type DeliveryModeFilter,
  type EnrichedOpportunity,
  type FilterState,
  type SortOption,
  type StudyLevelFilter,
} from './types/contracts.ts';
import { useLanguage } from './context/LanguageContext.tsx';
import { useOpportunitiesData } from './hooks/useOpportunitiesData.ts';
import { useFavorites } from './hooks/useFavorites.ts';
import { filterOpportunities } from './utils/filterOpportunities.ts';
import { Header } from './components/layout/Header.tsx';
import { Footer } from './components/layout/Footer.tsx';

export function App() {
  const { language, localize, localizeList, t, formatRemainingDays } =
    useLanguage();
  const { items, lastUpdated, loading, error, availableOptions, reload } =
    useOpportunitiesData();
  const {
    favoriteIds,
    favoritesCount,
    isFavorite,
    toggleFavorite,
    clearFavorites,
  } = useFavorites();

  // NavigationState implementation aligned with src/types/contracts.ts
  const [activeTab, setActiveTabState] = useState<ActiveTab>('all');
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<
    string | null
  >(null);

  // FilterState implementation aligned with src/types/contracts.ts
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTER_STATE);

  const setActiveTab = useCallback((tab: ActiveTab) => {
    setActiveTabState(tab);
    setSelectedOpportunityId(null);
  }, []);

  const openOpportunityDetails = useCallback((opportunityId: string) => {
    setSelectedOpportunityId(opportunityId);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const closeOpportunityDetails = useCallback(() => {
    setSelectedOpportunityId(null);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(INITIAL_FILTER_STATE);
  }, []);

  // Apply favorites tab constraint without mutating or corrupting the user's filter state
  const effectiveFilters = useMemo<FilterState>(
    () => ({
      ...filters,
      onlyFavorites: activeTab === 'favorites' ? true : filters.onlyFavorites,
    }),
    [filters, activeTab]
  );

  const filteredItems = useMemo(
    () => filterOpportunities(items, effectiveFilters, favoriteIds, language),
    [items, effectiveFilters, favoriteIds, language]
  );

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.searchQuery.trim() !== '') count++;
    if (filters.category !== 'all') count++;
    if (filters.fieldOfStudyId !== 'all') count++;
    if (filters.countryCode !== 'all') count++;
    if (filters.studyLevel !== 'all') count++;
    if (filters.deadlineStatus !== 'all') count++;
    if (filters.mode !== 'all') count++;
    if (filters.onlyFavorites) count++;
    return count;
  }, [filters]);

  const selectedEnriched = useMemo<EnrichedOpportunity | null>(() => {
    if (!selectedOpportunityId) return null;
    return (
      items.find((item) => item.opportunity.id === selectedOpportunityId) ??
      null
    );
  }, [items, selectedOpportunityId]);

  const listSeparator = language === 'ar' ? '، ' : ', ';

  return (
    <div className="app-shell">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        favoritesCount={favoritesCount}
        totalCount={items.length}
      />

      <main className="app-main">
        {loading ? (
          <section
            className="state-panel"
            role="status"
            aria-live="polite"
            data-testid="loading-state"
          >
            <h2 className="state-panel__title">{t.states.loading}</h2>
          </section>
        ) : error ? (
          <section
            className="state-panel state-panel--error"
            role="alert"
            data-testid="error-state"
          >
            <h2 className="state-panel__title">{t.states.errorTitle}</h2>
            <p className="state-panel__hint">
              <bdi>{error}</bdi>
            </p>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void reload()}
            >
              {t.states.errorRetryButton}
            </button>
          </section>
        ) : selectedEnriched ? (
          <article className="detail-view" data-testid="opportunity-detail-view">
            <div className="detail-view__topbar">
              <button
                type="button"
                className="btn btn--outline"
                onClick={closeOpportunityDetails}
                data-testid="back-to-list-btn"
              >
                <span>{language === 'ar' ? '→' : '←'}</span>
                <span>{t.details.backToListButton}</span>
              </button>

              <button
                type="button"
                className={`favorite-btn${
                  isFavorite(selectedEnriched.opportunity.id)
                    ? ' favorite-btn--active'
                    : ''
                }`}
                aria-pressed={isFavorite(selectedEnriched.opportunity.id)}
                aria-label={
                  isFavorite(selectedEnriched.opportunity.id)
                    ? t.card.removeFromFavoritesAria
                    : t.card.addToFavoritesAria
                }
                onClick={() => toggleFavorite(selectedEnriched.opportunity.id)}
                data-testid="detail-favorite-btn"
              >
                <span className="favorite-btn__icon" aria-hidden="true">
                  {isFavorite(selectedEnriched.opportunity.id) ? '★' : '☆'}
                </span>
                <span>{t.card.favoriteSavedBadge}</span>
              </button>
            </div>

            <div className="detail-view__badges">
              <span
                className={`badge badge--category-${selectedEnriched.opportunity.category}`}
              >
                {t.categories[selectedEnriched.opportunity.category]}
              </span>

              <span
                className={`badge badge--status-${selectedEnriched.evaluation.status}`}
              >
                {formatRemainingDays(
                  selectedEnriched.evaluation.remainingDays,
                  selectedEnriched.evaluation.status,
                  language
                )}
              </span>

              {selectedEnriched.opportunity.fundingType ? (
                <span className="badge badge--funding">
                  {t.fundingTypes[selectedEnriched.opportunity.fundingType]}
                </span>
              ) : null}
            </div>

            <h2 className="detail-view__title">
              {localize(selectedEnriched.opportunity.title)}
            </h2>
            <p className="detail-view__provider">
              {localize(selectedEnriched.opportunity.provider)}
            </p>

            <section
              className="detail-view__meta-grid"
              aria-label={t.details.metadataHeading}
            >
              <div className="detail-view__meta-card">
                <span className="detail-view__meta-label">
                  {t.card.countryLabel}
                </span>
                <span className="detail-view__meta-value">
                  {localize(selectedEnriched.opportunity.country)}
                </span>
              </div>

              <div className="detail-view__meta-card">
                <span className="detail-view__meta-label">
                  {t.card.modeLabel}
                </span>
                <span className="detail-view__meta-value">
                  {t.modes[selectedEnriched.opportunity.mode]}
                </span>
              </div>

              <div className="detail-view__meta-card">
                <span className="detail-view__meta-label">
                  {t.card.studyLevelLabel}
                </span>
                <span className="detail-view__meta-value">
                  {selectedEnriched.opportunity.studyLevels
                    .map((lvl) => t.studyLevels[lvl])
                    .join(listSeparator)}
                </span>
              </div>

              {selectedEnriched.opportunity.fundingType ? (
                <div className="detail-view__meta-card">
                  <span className="detail-view__meta-label">
                    {t.card.fundingLabel}
                  </span>
                  <span className="detail-view__meta-value">
                    {t.fundingTypes[selectedEnriched.opportunity.fundingType]}
                  </span>
                </div>
              ) : null}

              <div className="detail-view__meta-card">
                <span className="detail-view__meta-label">
                  {t.card.deadlineLabel}
                </span>
                <span className="detail-view__meta-value">
                  {selectedEnriched.opportunity.deadline ? (
                    <bdi className="ltr-inline" dir="ltr">
                      {selectedEnriched.opportunity.deadline}
                    </bdi>
                  ) : (
                    t.deadlineTypes[selectedEnriched.opportunity.deadlineType]
                  )}
                </span>
              </div>

              <div className="detail-view__meta-card">
                <span className="detail-view__meta-label">
                  {t.details.verifiedDateLabel}
                </span>
                <span className="detail-view__meta-value">
                  <bdi className="ltr-inline" dir="ltr">
                    {selectedEnriched.opportunity.verifiedAt}
                  </bdi>
                </span>
              </div>
            </section>

            {selectedEnriched.opportunity.availableCountries &&
            selectedEnriched.opportunity.availableCountries.length > 0 ? (
              <section className="detail-view__section">
                <h3 className="detail-view__section-title">
                  {t.details.countryScopeLabel}
                </h3>
                <div className="opportunity-card__tags">
                  {selectedEnriched.opportunity.availableCountries.map(
                    (isoCode) => (
                      <span key={isoCode} className="field-tag">
                        <bdi className="ltr-inline" dir="ltr">
                          {isoCode}
                        </bdi>
                      </span>
                    )
                  )}
                </div>
              </section>
            ) : null}

            {selectedEnriched.opportunity.description ? (
              <section className="detail-view__section">
                <h3 className="detail-view__section-title">
                  {t.details.overviewHeading}
                </h3>
                <p className="detail-view__description">
                  {localize(selectedEnriched.opportunity.description)}
                </p>
              </section>
            ) : null}

            <section className="detail-view__section">
              <h3 className="detail-view__section-title">
                {t.details.fieldsOfStudyHeading}
              </h3>
              <div className="opportunity-card__tags">
                {selectedEnriched.opportunity.fieldsOfStudy.map((field) => (
                  <span key={field.id} className="field-tag">
                    {localize(field)}
                  </span>
                ))}
              </div>
            </section>

            {selectedEnriched.opportunity.eligibility &&
            localizeList(selectedEnriched.opportunity.eligibility).length > 0 ? (
              <section className="detail-view__section">
                <h3 className="detail-view__section-title">
                  {t.details.eligibilityHeading}
                </h3>
                <ul className="detail-view__list">
                  {localizeList(selectedEnriched.opportunity.eligibility).map(
                    (criterion, idx) => (
                      <li key={idx}>{criterion}</li>
                    )
                  )}
                </ul>
              </section>
            ) : null}

            {selectedEnriched.opportunity.benefits &&
            localizeList(selectedEnriched.opportunity.benefits).length > 0 ? (
              <section className="detail-view__section">
                <h3 className="detail-view__section-title">
                  {t.details.benefitsHeading}
                </h3>
                <ul className="detail-view__list">
                  {localizeList(selectedEnriched.opportunity.benefits).map(
                    (benefit, idx) => (
                      <li key={idx}>{benefit}</li>
                    )
                  )}
                </ul>
              </section>
            ) : null}

            <section className="detail-view__cta-box">
              <p className="detail-view__notice">
                {t.details.officialUrlNotice}
              </p>
              <div className="detail-view__url-preview">
                <bdi className="ltr-inline" dir="ltr">
                  {selectedEnriched.opportunity.officialUrl}
                </bdi>
              </div>
              <div>
                <a
                  href={selectedEnriched.opportunity.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--primary"
                  data-testid="detail-official-url-link"
                >
                  <span>{t.details.officialUrlButton}</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            </section>
          </article>
        ) : (
          <>
            <section
              className="filter-panel"
              role="search"
              aria-label={t.searchAndFilters.searchAriaLabel}
            >
              <div className="filter-panel__search-row">
                <div className="filter-panel__search-wrapper">
                  <label htmlFor="search-input" className="sr-only">
                    {t.searchAndFilters.searchAriaLabel}
                  </label>
                  <input
                    id="search-input"
                    type="search"
                    className="filter-panel__search-input"
                    placeholder={t.searchAndFilters.searchPlaceholder}
                    value={filters.searchQuery}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        searchQuery: e.target.value,
                      }))
                    }
                    data-testid="search-input"
                  />
                </div>
              </div>

              <div className="filter-panel__grid">
                {/* 1. Category Filter */}
                <div className="filter-field">
                  <label
                    htmlFor="filter-category"
                    className="filter-field__label"
                  >
                    {t.searchAndFilters.categoryLabel}
                  </label>
                  <select
                    id="filter-category"
                    className="filter-field__select"
                    value={filters.category}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        category: e.target.value as CategoryFilter,
                      }))
                    }
                    data-testid="filter-category"
                  >
                    <option value="all">{t.categories.all}</option>
                    <option value="scholarship">
                      {t.categories.scholarship}
                    </option>
                    <option value="course">{t.categories.course}</option>
                    <option value="internship">
                      {t.categories.internship}
                    </option>
                  </select>
                </div>

                {/* 2. Field of Study Filter */}
                <div className="filter-field">
                  <label htmlFor="filter-field" className="filter-field__label">
                    {t.searchAndFilters.fieldOfStudyLabel}
                  </label>
                  <select
                    id="filter-field"
                    className="filter-field__select"
                    value={filters.fieldOfStudyId}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        fieldOfStudyId: e.target.value,
                      }))
                    }
                    data-testid="filter-field"
                  >
                    <option value="all">{t.studyLevels.all}</option>
                    {availableOptions.fieldsOfStudy.map((field) => (
                      <option key={field.id} value={field.id}>
                        {localize(field)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Country / Scope Filter */}
                <div className="filter-field">
                  <label
                    htmlFor="filter-country"
                    className="filter-field__label"
                  >
                    {t.searchAndFilters.countryLabel}
                  </label>
                  <select
                    id="filter-country"
                    className="filter-field__select"
                    value={filters.countryCode}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        countryCode: e.target.value,
                      }))
                    }
                    data-testid="filter-country"
                  >
                    <option value="all">{t.categories.all}</option>
                    {availableOptions.countryScopes.length > 0 ? (
                      <optgroup
                        label={t.searchAndFilters.countryGroups.scopesHeading}
                      >
                        {availableOptions.countryScopes.map((scope) => (
                          <option key={scope.code} value={scope.code}>
                            {localize(scope)}
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                    {availableOptions.countries.length > 0 ? (
                      <optgroup
                        label={
                          t.searchAndFilters.countryGroups.countriesHeading
                        }
                      >
                        {availableOptions.countries.map((country) => (
                          <option key={country.code} value={country.code}>
                            {localize(country)}
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                  </select>
                </div>

                {/* 4. Study Level Filter */}
                <div className="filter-field">
                  <label
                    htmlFor="filter-study-level"
                    className="filter-field__label"
                  >
                    {t.searchAndFilters.studyLevelLabel}
                  </label>
                  <select
                    id="filter-study-level"
                    className="filter-field__select"
                    value={filters.studyLevel}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        studyLevel: e.target.value as StudyLevelFilter,
                      }))
                    }
                    data-testid="filter-study-level"
                  >
                    <option value="all">{t.studyLevels.allFilterOption}</option>
                    <option value="high_school">
                      {t.studyLevels.high_school}
                    </option>
                    <option value="undergraduate">
                      {t.studyLevels.undergraduate}
                    </option>
                    <option value="graduate">{t.studyLevels.graduate}</option>
                    <option value="recent_graduate">
                      {t.studyLevels.recent_graduate}
                    </option>
                  </select>
                </div>

                {/* 5. Deadline Status Filter */}
                <div className="filter-field">
                  <label
                    htmlFor="filter-deadline-status"
                    className="filter-field__label"
                  >
                    {t.searchAndFilters.deadlineStatusLabel}
                  </label>
                  <select
                    id="filter-deadline-status"
                    className="filter-field__select"
                    value={filters.deadlineStatus}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        deadlineStatus: e.target.value as DeadlineStatusFilter,
                      }))
                    }
                    data-testid="filter-deadline-status"
                  >
                    <option value="all">{t.deadlineStatuses.all}</option>
                    <option value="closing_soon">
                      {t.deadlineStatuses.closing_soon}
                    </option>
                    <option value="open">{t.deadlineStatuses.open}</option>
                    <option value="unspecified">
                      {t.deadlineStatuses.unspecified}
                    </option>
                    <option value="expired">
                      {t.deadlineStatuses.expired}
                    </option>
                  </select>
                </div>

                {/* 6. Delivery Mode Filter */}
                <div className="filter-field">
                  <label htmlFor="filter-mode" className="filter-field__label">
                    {t.searchAndFilters.modeLabel}
                  </label>
                  <select
                    id="filter-mode"
                    className="filter-field__select"
                    value={filters.mode}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        mode: e.target.value as DeliveryModeFilter,
                      }))
                    }
                    data-testid="filter-mode"
                  >
                    <option value="all">{t.modes.all}</option>
                    <option value="onsite">{t.modes.onsite}</option>
                    <option value="online">{t.modes.online}</option>
                    <option value="hybrid">{t.modes.hybrid}</option>
                  </select>
                </div>

                {/* 7. Sort Option */}
                <div className="filter-field">
                  <label htmlFor="filter-sort" className="filter-field__label">
                    {t.searchAndFilters.sortByLabel}
                  </label>
                  <select
                    id="filter-sort"
                    className="filter-field__select"
                    value={filters.sortBy}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        sortBy: e.target.value as SortOption,
                      }))
                    }
                    data-testid="filter-sort"
                  >
                    <option value="deadline_asc">
                      {t.sortOptions.deadline_asc}
                    </option>
                    <option value="verified_desc">
                      {t.sortOptions.verified_desc}
                    </option>
                    <option value="title_asc">{t.sortOptions.title_asc}</option>
                  </select>
                </div>
              </div>

              <div className="filter-panel__footer">
                <div
                  className="filter-panel__summary"
                  aria-live="polite"
                  data-testid="results-summary"
                >
                  <span>{t.searchAndFilters.resultsCountLabel}:</span>
                  <bdi className="filter-panel__count-badge" data-testid="results-count">
                    {filteredItems.length}
                  </bdi>
                  {activeFiltersCount > 0 ? (
                    <span>
                      ({t.searchAndFilters.activeFiltersCountLabel}:{' '}
                      <bdi>{activeFiltersCount}</bdi>)
                    </span>
                  ) : null}
                </div>

                <div className="filter-panel__actions">
                  {activeFiltersCount > 0 || filters.sortBy !== 'deadline_asc' ? (
                    <button
                      type="button"
                      className="btn btn--outline"
                      onClick={resetFilters}
                      data-testid="reset-filters-btn"
                    >
                      {t.searchAndFilters.resetFiltersButton}
                    </button>
                  ) : null}

                  {activeTab === 'favorites' && favoritesCount > 0 ? (
                    <button
                      type="button"
                      className="btn btn--danger"
                      onClick={clearFavorites}
                      data-testid="clear-favorites-btn"
                    >
                      {t.states.clearFavoritesButton}
                    </button>
                  ) : null}
                </div>
              </div>
            </section>

            {filteredItems.length === 0 ? (
              activeTab === 'favorites' && favoritesCount === 0 ? (
                <section
                  className="state-panel"
                  data-testid="empty-favorites-state"
                >
                  <h2 className="state-panel__title">
                    {t.states.emptyFavoritesTitle}
                  </h2>
                  <p className="state-panel__hint">
                    {t.states.emptyFavoritesHint}
                  </p>
                </section>
              ) : (
                <section
                  className="state-panel"
                  data-testid="empty-filtered-state"
                >
                  <h2 className="state-panel__title">
                    {t.states.emptyFilteredTitle}
                  </h2>
                  <p className="state-panel__hint">
                    {t.states.emptyFilteredHint}
                  </p>
                  {activeFiltersCount > 0 ? (
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={resetFilters}
                      data-testid="empty-reset-filters-btn"
                    >
                      {t.searchAndFilters.resetFiltersButton}
                    </button>
                  ) : null}
                </section>
              )
            ) : (
              <section
                className="opportunities-grid"
                data-testid="opportunities-grid"
              >
                {filteredItems.map(({ opportunity, evaluation }) => {
                  const favorited = isFavorite(opportunity.id);

                  return (
                    <article
                      key={opportunity.id}
                      className="opportunity-card"
                      data-testid={`opportunity-card-${opportunity.id}`}
                    >
                      <div>
                        <div className="opportunity-card__top">
                          <div className="opportunity-card__badges">
                            <span
                              className={`badge badge--category-${opportunity.category}`}
                            >
                              {t.categories[opportunity.category]}
                            </span>

                            <span
                              className={`badge badge--status-${evaluation.status}`}
                            >
                              {formatRemainingDays(
                                evaluation.remainingDays,
                                evaluation.status,
                                language
                              )}
                            </span>

                            {opportunity.fundingType ? (
                              <span className="badge badge--funding">
                                {t.fundingTypes[opportunity.fundingType]}
                              </span>
                            ) : null}
                          </div>

                          <button
                            type="button"
                            className={`favorite-btn${
                              favorited ? ' favorite-btn--active' : ''
                            }`}
                            aria-pressed={favorited}
                            aria-label={
                              favorited
                                ? t.card.removeFromFavoritesAria
                                : t.card.addToFavoritesAria
                            }
                            onClick={() => toggleFavorite(opportunity.id)}
                            data-testid={`favorite-btn-${opportunity.id}`}
                          >
                            <span
                              className="favorite-btn__icon"
                              aria-hidden="true"
                            >
                              {favorited ? '★' : '☆'}
                            </span>
                          </button>
                        </div>

                        <h2 className="opportunity-card__title">
                          <button
                            type="button"
                            className="opportunity-card__title-btn"
                            onClick={() =>
                              openOpportunityDetails(opportunity.id)
                            }
                          >
                            {localize(opportunity.title)}
                          </button>
                        </h2>

                        <p className="opportunity-card__provider">
                          {localize(opportunity.provider)}
                        </p>

                        <div className="opportunity-card__meta">
                          <div className="opportunity-card__meta-item">
                            <span className="opportunity-card__meta-label">
                              {t.card.countryLabel}
                            </span>
                            <span className="opportunity-card__meta-value">
                              {localize(opportunity.country)}
                            </span>
                          </div>

                          <div className="opportunity-card__meta-item">
                            <span className="opportunity-card__meta-label">
                              {t.card.modeLabel}
                            </span>
                            <span className="opportunity-card__meta-value">
                              {t.modes[opportunity.mode]}
                            </span>
                          </div>

                          <div className="opportunity-card__meta-item">
                            <span className="opportunity-card__meta-label">
                              {t.card.studyLevelLabel}
                            </span>
                            <span className="opportunity-card__meta-value">
                              {opportunity.studyLevels
                                .map((lvl) => t.studyLevels[lvl])
                                .join(listSeparator)}
                            </span>
                          </div>

                          <div className="opportunity-card__meta-item">
                            <span className="opportunity-card__meta-label">
                              {t.card.deadlineLabel}
                            </span>
                            <span className="opportunity-card__meta-value">
                              {opportunity.deadline ? (
                                <bdi className="ltr-inline" dir="ltr">
                                  {opportunity.deadline}
                                </bdi>
                              ) : (
                                t.deadlineTypes[opportunity.deadlineType]
                              )}
                            </span>
                          </div>

                          <div className="opportunity-card__meta-item">
                            <span className="opportunity-card__meta-label">
                              {t.card.verifiedAtLabel}
                            </span>
                            <span className="opportunity-card__meta-value">
                              <bdi className="ltr-inline" dir="ltr">
                                {opportunity.verifiedAt}
                              </bdi>
                            </span>
                          </div>
                        </div>

                        <div className="opportunity-card__tags">
                          {opportunity.fieldsOfStudy.map((field) => (
                            <span key={field.id} className="field-tag">
                              {localize(field)}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="opportunity-card__footer">
                        <button
                          type="button"
                          className="btn btn--secondary"
                          onClick={() => openOpportunityDetails(opportunity.id)}
                          data-testid={`view-details-btn-${opportunity.id}`}
                        >
                          {t.card.viewDetailsButton}
                        </button>

                        <a
                          href={opportunity.officialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn--primary"
                          data-testid={`official-source-link-${opportunity.id}`}
                        >
                          <span>{t.card.officialSourceButton}</span>
                          <span aria-hidden="true">↗</span>
                        </a>
                      </div>
                    </article>
                  );
                })}
              </section>
            )}
          </>
        )}
      </main>

      <Footer lastUpdated={lastUpdated} />
    </div>
  );
}

export default App;
