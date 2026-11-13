import { useState, useCallback, useMemo } from 'react';
import { STORAGE_KEYS, type FavoritesState } from '../types/contracts.ts';

/**
 * Safely parses a JSON string of stored favorite opportunity IDs.
 * Returns a deduplicated array of non-empty trimmed string IDs, or [] if invalid/corrupted.
 */
export function parseStoredFavorites(raw: string | null): string[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const uniqueIds = new Set<string>();
    for (const item of parsed) {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (trimmed.length > 0) {
          uniqueIds.add(trimmed);
        }
      }
    }

    return Array.from(uniqueIds);
  } catch {
    return [];
  }
}

/**
 * Safely reads favorite opportunity IDs from LocalStorage.
 * Never throws even when LocalStorage is unavailable or blocked.
 */
export function readFavoritesFromStorage(
  storageKey: string = STORAGE_KEYS.FAVORITES
): string[] {
  try {
    if (typeof window !== 'undefined' && 'localStorage' in window) {
      const raw = window.localStorage.getItem(storageKey);
      return parseStoredFavorites(raw);
    }
  } catch {
    // Fallback to empty array if LocalStorage access is denied
  }
  return [];
}

/**
 * Safely writes favorite opportunity IDs to LocalStorage.
 * Returns true on success or false if LocalStorage is unavailable or throws.
 */
export function writeFavoritesToStorage(
  ids: Iterable<string>,
  storageKey: string = STORAGE_KEYS.FAVORITES
): boolean {
  try {
    if (typeof window !== 'undefined' && 'localStorage' in window) {
      const uniqueIds: string[] = [];
      const seen = new Set<string>();

      for (const id of ids) {
        if (typeof id === 'string') {
          const trimmed = id.trim();
          if (trimmed.length > 0 && !seen.has(trimmed)) {
            seen.add(trimmed);
            uniqueIds.push(trimmed);
          }
        }
      }

      const serialized = JSON.stringify(uniqueIds);
      window.localStorage.setItem(storageKey, serialized);
      return true;
    }
  } catch {
    // Gracefully handle QuotaExceededError or SecurityError
  }
  return false;
}

/**
 * Manages user favorite opportunity IDs with automatic LocalStorage persistence
 * and safe in-memory fallback.
 */
export function useFavorites(): FavoritesState {
  const [favoriteIds, setFavoriteIds] = useState<ReadonlySet<string>>(
    () => new Set(readFavoritesFromStorage())
  );

  const isFavorite = useCallback(
    (opportunityId: string): boolean => favoriteIds.has(opportunityId),
    [favoriteIds]
  );

  const toggleFavorite = useCallback((opportunityId: string): void => {
    const cleanId = opportunityId.trim();
    if (!cleanId) {
      return;
    }

    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(cleanId)) {
        next.delete(cleanId);
      } else {
        next.add(cleanId);
      }
      writeFavoritesToStorage(next);
      return next;
    });
  }, []);

  const clearFavorites = useCallback((): void => {
    setFavoriteIds((prev) => {
      if (prev.size === 0) {
        writeFavoritesToStorage([]);
        return prev;
      }
      const next = new Set<string>();
      writeFavoritesToStorage(next);
      return next;
    });
  }, []);

  const favoritesCount = favoriteIds.size;

  return useMemo(
    () => ({
      favoriteIds,
      favoritesCount,
      isFavorite,
      toggleFavorite,
      clearFavorites,
    }),
    [favoriteIds, favoritesCount, isFavorite, toggleFavorite, clearFavorites]
  );
}
