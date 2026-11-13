import { resolvePublicAssetUrl } from './dataUrl.ts';

/**
 * Determines whether Service Worker registration should run in the current environment.
 * Disabled in Vite development mode so HMR and dev server behavior are never affected.
 */
export function shouldRegisterServiceWorker(
  isProd: boolean,
  hasServiceWorkerSupport: boolean
): boolean {
  return isProd && hasServiceWorkerSupport;
}

/**
 * Resolves the relative Service Worker script URL against the configured Vite base URL.
 */
export function getServiceWorkerUrl(baseUrl?: string): string {
  return resolvePublicAssetUrl('sw.js', baseUrl);
}

/**
 * Registers the application Service Worker in production builds without blocking app startup.
 */
export function registerServiceWorker(): void {
  const isProd = Boolean(
    (import.meta as { env?: { PROD?: boolean } }).env?.PROD
  );
  const hasSupport =
    typeof navigator !== 'undefined' && 'serviceWorker' in navigator;

  if (!shouldRegisterServiceWorker(isProd, hasSupport)) {
    return;
  }

  const performRegistration = (): void => {
    try {
      const swUrl = getServiceWorkerUrl();
      void navigator.serviceWorker.register(swUrl).catch(() => {
        // Keep registration failures silent so online app usage is never disrupted
      });
    } catch {
      // Ignore unexpected synchronous registration errors
    }
  };

  if (typeof document !== 'undefined' && document.readyState === 'complete') {
    performRegistration();
    return;
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('load', performRegistration, { once: true });
  }
}
