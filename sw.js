const CACHE_VERSION = "jp-quiz-pwa-v3";
const STATIC_CACHE = CACHE_VERSION + "-static";
const RUNTIME_CACHE = CACHE_VERSION + "-runtime";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./quiz.html",
  "./note.html",
  "./quiz-app.js",
  "./Note.md",
  "./manifest.webmanifest",
  "./CNAME",
  "./pwa/icon-192.svg",
  "./pwa/icon-512.svg",
  "./vendor/vue.global.prod.js",
  "./vendor/marked.min.js",
  "./quiz-data/verbClass.json",
  "./quiz-data/basicForms.json",
  "./quiz-data/teAux.json",
  "./quiz-data/stemPlus.json",
  "./quiz-data/posTransform.json",
  "./quiz-data/grammar-giving-receiving.json",
  "./quiz-data/grammar-auxiliary-verbs.json",
  "./quiz-data/grammar-aspect-and-change.json",
  "./quiz-data/grammar-potential-and-conditional.json"
];

function toAbsoluteUrl(relativeUrl) {
  return new URL(relativeUrl, self.registration.scope).toString();
}

function normalizeRequestKey(request) {
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return request;
  }

  // Ignore query params for mutable app/data files to avoid stale-cache misses after version bumps.
  if (
    url.pathname.startsWith("/quiz-data/") ||
    url.pathname.endsWith("/quiz-app.js") ||
    url.pathname.endsWith("/sw.js") ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/quiz.html") ||
    url.pathname.endsWith("/note.html") ||
    url.pathname.endsWith("/manifest.webmanifest")
  ) {
    url.search = "";
    return new Request(url.toString(), { method: "GET" });
  }

  return request;
}

function shouldUseNetworkFirst(request) {
  const url = new URL(request.url);
  if (request.mode === "navigate") {
    return true;
  }
  if (url.origin !== self.location.origin) {
    return false;
  }

  return (
    url.pathname.startsWith("/quiz-data/") ||
    url.pathname.endsWith("/quiz-app.js") ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/quiz.html") ||
    url.pathname.endsWith("/note.html") ||
    url.pathname.endsWith("/manifest.webmanifest")
  );
}

async function networkFirst(request) {
  const key = normalizeRequestKey(request);
  const runtime = await caches.open(RUNTIME_CACHE);

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      runtime.put(key, response.clone());
    }
    return response;
  } catch (_err) {
    const cached = await caches.match(key);
    if (cached) {
      return cached;
    }

    if (request.mode === "navigate") {
      const appShell = await caches.match(toAbsoluteUrl("./index.html"));
      if (appShell) {
        return appShell;
      }
    }

    throw _err;
  }
}

async function cacheFirst(request) {
  const key = normalizeRequestKey(request);
  const cached = await caches.match(key);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response && response.ok && request.url.startsWith(self.location.origin)) {
    const runtime = await caches.open(RUNTIME_CACHE);
    runtime.put(key, response.clone());
  }
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    const requests = PRECACHE_URLS.map((url) => new Request(toAbsoluteUrl(url), { cache: "reload" }));
    await cache.addAll(requests);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const strategy = shouldUseNetworkFirst(request) ? networkFirst : cacheFirst;
  event.respondWith(strategy(request));
});
