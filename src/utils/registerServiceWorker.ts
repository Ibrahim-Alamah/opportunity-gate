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

function warnRegistrationFailure(error: unknown): void {
  const reason = error instanceof Error ? error.message : String(error);
  console.warn('Opportunity Gate: Service Worker registration failed.', reason);
}

/**
 * Registers the application Service Worker in production builds without blocking app startup.
 */
export function registerServiceWorker(
  isProd: boolean = Boolean(
    (import.meta as { env?: { PROD?: boolean } }).env?.PROD
  )
): void {
  const hasSupport =
    typeof navigator !== 'undefined' && 'serviceWorker' in navigator;

  if (!shouldRegisterServiceWorker(isProd, hasSupport)) {
    return;
  }

  const performRegistration = (): void => {
    try {
      const swUrl = getServiceWorkerUrl();
      void navigator.serviceWorker.register(swUrl).catch((error: unknown) => {
        warnRegistrationFailure(error);
      });
    } catch (error: unknown) {
      warnRegistrationFailure(error);
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
