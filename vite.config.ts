import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

export const PRODUCTION_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

/**
 * Injects the production Content-Security-Policy meta tag during `vite build`
 * without affecting local development, HMR, or React Fast Refresh.
 */
export function productionCspPlugin(): Plugin {
  return {
    name: 'opportunity-gate-production-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const cspMetaTag = `<meta http-equiv="Content-Security-Policy" content="${PRODUCTION_CSP}" />`;
        if (/<meta\s+charset=[^>]*>/i.test(html)) {
          return html.replace(/(<meta\s+charset=[^>]*>)/i, `$1\n    ${cspMetaTag}`);
        }
        return html.replace(/(<head[^>]*>)/i, `$1\n    ${cspMetaTag}`);
      },
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), productionCspPlugin()],
});

