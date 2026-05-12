const CACHE_VERSION = "jp-quiz-pwa-v1";
const STATIC_CACHE = CACHE_VERSION + "-static";
const RUNTIME_CACHE = CACHE_VERSION + "-runtime";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./quiz.html",
  "./quiz-app.js",
  "./Note.md",
  "./manifest.webmanifest",
  "./pwa/icon-192.svg",
  "./pwa/icon-512.svg",
  "./vendor/vue.global.prod.js",
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

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(request);
      if (request.url.startsWith(self.location.origin)) {
        const runtime = await caches.open(RUNTIME_CACHE);
        runtime.put(request, response.clone());
      }
      return response;
    } catch (err) {
      if (request.mode === "navigate") {
        const fallback = await caches.match(toAbsoluteUrl("./quiz.html"));
        if (fallback) {
          return fallback;
        }
      }
      throw err;
    }
  })());
});
