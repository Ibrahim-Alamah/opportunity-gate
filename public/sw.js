const CACHE_PREFIX = 'opportunity-gate-';
const SHELL_CACHE = `${CACHE_PREFIX}shell-v1`;
const DATA_CACHE = `${CACHE_PREFIX}data-v1`;
const ACTIVE_CACHES = new Set([SHELL_CACHE, DATA_CACHE]);

function resolveScopeUrl(relativePath) {
  return new URL(relativePath, self.registration.scope).href;
}

function getScopeInfo() {
  const scopeUrl = new URL(self.registration.scope);
  return {
    origin: scopeUrl.origin,
    pathname: scopeUrl.pathname.endsWith('/')
      ? scopeUrl.pathname
      : `${scopeUrl.pathname}/`,
    rootUrl: resolveScopeUrl('./'),
    indexUrl: resolveScopeUrl('./index.html'),
    dataUrl: resolveScopeUrl('./data/opportunities.json'),
  };
}

function isWithinScope(url, scopeInfo) {
  return (
    (url.protocol === 'https:' || url.protocol === 'http:') &&
    url.origin === scopeInfo.origin &&
    url.pathname.startsWith(scopeInfo.pathname)
  );
}

function extractShellAssetUrls(htmlText, scopeInfo) {
  const assetUrls = new Set([scopeInfo.rootUrl, scopeInfo.indexUrl]);
  const attrRegex = /\b(?:src|href)=["']([^"']+)["']/gi;
  let match;

  while ((match = attrRegex.exec(htmlText)) !== null) {
    const rawRef = match[1];
    if (!rawRef || rawRef.startsWith('data:') || rawRef.startsWith('mailto:')) {
      continue;
    }

    try {
      const resolved = new URL(rawRef, scopeInfo.indexUrl);
      if (
        isWithinScope(resolved, scopeInfo) &&
        resolved.pathname !== new URL(scopeInfo.dataUrl).pathname
      ) {
        assetUrls.add(resolved.href);
      }
    } catch {
      // Ignore malformed asset URLs in HTML
    }
  }

  return Array.from(assetUrls);
}

async function isValidJsonResponse(response) {
  if (!response || !response.ok) {
    return false;
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('text/html')) {
    return false;
  }

  try {
    const text = await response.clone().text();
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

async function safeCachePut(cacheName, request, response) {
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
  } catch {
    // Degrade gracefully on CacheStorage errors or quota limits
  }
}

async function safeCacheMatch(cacheName, request) {
  try {
    const cache = await caches.open(cacheName);
    return await cache.match(request);
  } catch {
    return undefined;
  }
}

async function precacheShellAndData() {
  const scopeInfo = getScopeInfo();

  try {
    const indexResponse = await fetch(scopeInfo.indexUrl, { cache: 'no-cache' });
    if (indexResponse.ok) {
      const htmlText = await indexResponse.clone().text();
      const shellUrls = extractShellAssetUrls(htmlText, scopeInfo);
      const shellCache = await caches.open(SHELL_CACHE);

      await Promise.all(
        shellUrls.map(async (assetUrl) => {
          if (assetUrl === scopeInfo.indexUrl) {
            await shellCache.put(scopeInfo.indexUrl, indexResponse.clone());
            return;
          }
          const assetResponse = await fetch(assetUrl, { cache: 'no-cache' });
          if (assetResponse.ok) {
            await shellCache.put(assetUrl, assetResponse);
          }
        })
      );
    }
  } catch {
    // Allow install to complete; runtime caching will still populate assets when online
  }

  // Caching the dataset during install is best-effort and must not block SW installation
  try {
    const dataResponse = await fetch(scopeInfo.dataUrl, { cache: 'no-cache' });
    if (await isValidJsonResponse(dataResponse)) {
      await safeCachePut(DATA_CACHE, scopeInfo.dataUrl, dataResponse.clone());
    }
  } catch {
    // Ignore dataset fetch/cache failure during install
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    precacheShellAndData().then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter(
              (name) => name.startsWith(CACHE_PREFIX) && !ACTIVE_CACHES.has(name)
            )
            .map((name) => caches.delete(name))
        );
      } catch {
        // Ignore CacheStorage enumeration errors
      }
      await self.clients.claim();
    })()
  );
});

async function handleDatasetRequest(request, scopeInfo) {
  try {
    const networkResponse = await fetch(request);
    if (await isValidJsonResponse(networkResponse)) {
      await safeCachePut(DATA_CACHE, request, networkResponse.clone());
      return networkResponse;
    }

    const cached =
      (await safeCacheMatch(DATA_CACHE, request)) ||
      (await safeCacheMatch(DATA_CACHE, scopeInfo.dataUrl));
    if (cached) {
      return cached;
    }

    return networkResponse;
  } catch {
    const cached =
      (await safeCacheMatch(DATA_CACHE, request)) ||
      (await safeCacheMatch(DATA_CACHE, scopeInfo.dataUrl));
    if (cached) {
      return cached;
    }

    return new Response(
      JSON.stringify({ error: 'Offline and no cached dataset available.' }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

async function handleNavigationRequest(request, scopeInfo) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok && networkResponse.type === 'basic') {
      await safeCachePut(SHELL_CACHE, scopeInfo.indexUrl, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached =
      (await safeCacheMatch(SHELL_CACHE, request)) ||
      (await safeCacheMatch(SHELL_CACHE, scopeInfo.indexUrl)) ||
      (await safeCacheMatch(SHELL_CACHE, scopeInfo.rootUrl));
    if (cached) {
      return cached;
    }

    return Response.error();
  }
}

async function handleStaticAssetRequest(request) {
  const cached = await safeCacheMatch(SHELL_CACHE, request);
  if (cached) {
    return cached;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok && networkResponse.type === 'basic') {
      await safeCachePut(SHELL_CACHE, request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  let requestUrl;
  try {
    requestUrl = new URL(request.url);
  } catch {
    return;
  }

  const scopeInfo = getScopeInfo();
  if (!isWithinScope(requestUrl, scopeInfo)) {
    return;
  }

  if (requestUrl.pathname === new URL(scopeInfo.dataUrl).pathname) {
    event.respondWith(handleDatasetRequest(request, scopeInfo));
    return;
  }

  const acceptHeader = request.headers.get('accept') || '';
  if (request.mode === 'navigate' || acceptHeader.includes('text/html')) {
    event.respondWith(handleNavigationRequest(request, scopeInfo));
    return;
  }

  event.respondWith(handleStaticAssetRequest(request));
});
