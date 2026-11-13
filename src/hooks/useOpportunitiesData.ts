import { useState, useEffect, useCallback } from 'react';
import type {
  AvailableFilterOptions,
  EnrichedOpportunity,
  OpportunitiesDataState,
} from '../types/contracts.ts';
import type { OpportunitiesDataset } from '../types/opportunity.ts';
import {
  evaluateOpportunityDeadline,
  validateOpportunitiesDataset,
} from '../utils/validateOpportunities.ts';
import { getOpportunitiesDataUrl } from '../utils/dataUrl.ts';
import { extractAvailableFilterOptions } from '../utils/filterOpportunities.ts';

const EMPTY_AVAILABLE_OPTIONS: AvailableFilterOptions = {
  countries: [],
  countryScopes: [],
  fieldsOfStudy: [],
};

/**
 * Pure helper that validates raw dataset JSON against schema & integrity rules,
 * computes runtime deadline evaluations, and extracts available filter options.
 */
export function transformAndValidateDataset(
  rawData: unknown,
  referenceDate: Date | string = new Date()
): {
  items: EnrichedOpportunity[];
  lastUpdated: string;
  availableOptions: AvailableFilterOptions;
} {
  const summary = validateOpportunitiesDataset(rawData, referenceDate);

  if (!summary.valid) {
    const details = summary.errors
      .slice(0, 5)
      .map((issue) => {
        const prefix = issue.opportunityId
          ? `[${issue.opportunityId}] `
          : issue.recordIndex !== undefined
            ? `[#${issue.recordIndex}] `
            : '';
        return `${prefix}${issue.field}: ${issue.message}`;
      })
      .join('; ');
    throw new Error(
      `Invalid opportunities dataset (${summary.errors.length} error(s)): ${details}`
    );
  }

  const dataset = rawData as OpportunitiesDataset;
  const items: EnrichedOpportunity[] = dataset.opportunities.map(
    (opportunity) => ({
      opportunity,
      evaluation: evaluateOpportunityDeadline(opportunity, referenceDate),
    })
  );

  const availableOptions = extractAvailableFilterOptions(items);

  return {
    items,
    lastUpdated: dataset.lastUpdated,
    availableOptions,
  };
}

/**
 * Hook that loads, validates, and enriches the static opportunities dataset.
 */
export function useOpportunitiesData(): OpportunitiesDataState {
  const [items, setItems] = useState<EnrichedOpportunity[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [availableOptions, setAvailableOptions] =
    useState<AvailableFilterOptions>(EMPTY_AVAILABLE_OPTIONS);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = getOpportunitiesDataUrl();
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Failed to load opportunities data (HTTP ${response.status})`
        );
      }

      const rawJson: unknown = await response.json();
      const result = transformAndValidateDataset(rawJson);

      setItems(result.items);
      setLastUpdated(result.lastUpdated);
      setAvailableOptions(result.availableOptions);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unexpected error while loading opportunities data.';
      setError(message);
      setItems([]);
      setLastUpdated(null);
      setAvailableOptions(EMPTY_AVAILABLE_OPTIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return {
    items,
    lastUpdated,
    loading,
    error,
    availableOptions,
    reload: loadData,
  };
}
