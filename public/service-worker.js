const CACHE_NAME = 'flowmind-cache-v1';
const urlsToCache = [
  '/', // Caches index.html at the root
  '/index.html',
  '/icon.svg',
  '/maskable-icon.svg',
  '/apple-touch-icon.svg',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching app shell');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Try to get the response from the cache
      const cachedResponse = await cache.match(event.request);
      
      // Return the cached response if found
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // If not in cache, fetch from the network
      try {
        const networkResponse = await fetch(event.request);
        
        // If the fetch is successful,s clone it and store it in the cache
        if (networkResponse.ok) {
          await cache.put(event.request, networkResponse.clone());
        }
        
        // Return the network response
        return networkResponse;
      } catch (error) {
        // If the network fails and it's a navigation request, return the offline fallback page
        if (event.request.mode === 'navigate') {
          const fallbackResponse = await cache.match('/index.html');
          return fallbackResponse;
        }
        // For other failed requests, let the error propagate
        throw error;
      }
    })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
