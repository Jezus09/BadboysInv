const CACHE_NAME = "badboys-inventory-v1";
const urlsToCache = [
  "/",
  "/shop",
  "/api/shop"
  // Static assets will be cached automatically
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", (event) => {
  // Cache images and static assets
  if (
    event.request.destination === "image" ||
    event.request.url.includes("/images/") ||
    event.request.url.includes("cs2economy.com")
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request).then((fetchResponse) => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      })
    );
  }
});
