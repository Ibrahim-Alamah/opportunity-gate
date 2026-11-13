import { DATA_PATHS } from '../types/contracts.ts';

/**
 * Resolves a public static asset path against Vite's configured base URL.
 * Safe to execute in both browser (Vite) and Node.js test environments where import.meta.env may be undefined.
 */
export function resolvePublicAssetUrl(relativePath: string, baseUrl?: string): string {
  const viteBaseUrl = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL;
  const rawBase = baseUrl !== undefined ? baseUrl : (viteBaseUrl || './');

  const trimmedBase = rawBase.trim() || './';
  const normalizedBase = trimmedBase.endsWith('/')
    ? trimmedBase.replace(/\/+$/, '/')
    : `${trimmedBase}/`;

  const cleanPath = relativePath.trim().replace(/^(?:\.\/|\/)+/, '');

  return `${normalizedBase}${cleanPath}`;
}

/**
 * Returns the resolved URL for the verified opportunities dataset (`data/opportunities.json`).
 */
export function getOpportunitiesDataUrl(baseUrl?: string): string {
  return resolvePublicAssetUrl(DATA_PATHS.OPPORTUNITIES_JSON, baseUrl);
}
