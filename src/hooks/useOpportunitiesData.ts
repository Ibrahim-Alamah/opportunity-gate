import { useState, useEffect, useCallback, useRef } from 'react';
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

export const DATASET_FETCH_TIMEOUT_MS = 15_000;

const EMPTY_AVAILABLE_OPTIONS: AvailableFilterOptions = {
  countries: [],
  countryScopes: [],
  fieldsOfStudy: [],
};

export interface FetchDatasetOptions {
  url?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

/**
 * Fetches, parses, and validates the opportunities dataset with a bounded timeout
 * and safe external cancellation support.
 */
export async function fetchOpportunitiesDataset(
  options: FetchDatasetOptions = {}
): Promise<{
  items: EnrichedOpportunity[];
  lastUpdated: string;
  availableOptions: AvailableFilterOptions;
}> {
  const url = options.url ?? getOpportunitiesDataUrl();
  const timeoutMs = options.timeoutMs ?? DATASET_FETCH_TIMEOUT_MS;
  const fetchImpl = options.fetchImpl ?? fetch;
  const externalSignal = options.signal;

  if (externalSignal?.aborted) {
    throw new DOMException('Dataset request was cancelled.', 'AbortError');
  }

  const controller = new AbortController();
  let timedOut = false;

  const onExternalAbort = (): void => {
    controller.abort();
  };

  if (externalSignal) {
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetchImpl(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(
        `Failed to load opportunities data (HTTP ${response.status})`
      );
    }

    const rawJson: unknown = await response.json();
    return transformAndValidateDataset(rawJson);
  } catch (err) {
    if (timedOut) {
      throw new Error(
        `Request timed out after ${timeoutMs}ms while loading opportunities data.`
      );
    }
    if (externalSignal?.aborted) {
      throw new DOMException('Dataset request was cancelled.', 'AbortError');
    }
    throw err;
  } finally {
    clearTimeout(timer);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

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

  const isMountedRef = useRef<boolean>(true);
  const activeControllerRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async () => {
    activeControllerRef.current?.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;

    if (isMountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const result = await fetchOpportunitiesDataset({
        signal: controller.signal,
      });

      if (!isMountedRef.current || controller.signal.aborted) {
        return;
      }

      setItems(result.items);
      setLastUpdated(result.lastUpdated);
      setAvailableOptions(result.availableOptions);
    } catch (err) {
      if (!isMountedRef.current || controller.signal.aborted) {
        return;
      }

      const message =
        err instanceof Error
          ? err.message
          : 'Unexpected error while loading opportunities data.';
      setError(message);
      setItems([]);
      setLastUpdated(null);
      setAvailableOptions(EMPTY_AVAILABLE_OPTIONS);
    } finally {
      if (activeControllerRef.current === controller) {
        activeControllerRef.current = null;
      }
      if (isMountedRef.current && !controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void loadData();

    return () => {
      isMountedRef.current = false;
      activeControllerRef.current?.abort();
      activeControllerRef.current = null;
    };
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
