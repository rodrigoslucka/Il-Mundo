const CACHE_NAME = "il-mundo-app-v17";
const APP_SHELL = [
  "./",
  "./index.html",
  "./src/styles.css?v=16",
  "./src/diagnostics.js?v=13",
  "./src/data.js?v=6",
  "./src/app.js?v=14",
  "./src/features/cash/export.js",
  "./src/features/cash/totals.js",
  "./src/features/cash/page.js",
  "./manifest.webmanifest",
  "./assets/pizza.svg",
  "./assets/pizza-watermark.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith("il-mundo-") && key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME)
          .then((cache) => cache.put(event.request, copy))
          .catch((error) => console.error("No se pudo guardar un recurso para uso sin conexión.", error));
      }
      return response;
    }).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      throw new Error("El archivo no está guardado para uso sin conexión.");
    }),
  );
});
