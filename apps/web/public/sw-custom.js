// Custom Service Worker for Gossip Club PWA
// This provides offline support, caching strategies, and background sync

const CACHE_VERSION = 'v1';
const CACHE_NAME = `gossip-club-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

// Assets to precache on install
const PRECACHE_URLS = [
  '/',
  '/offline',
  '/favicon.ico',
];

// Install event - precache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
          })
          .map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests with appropriate strategies
  if (url.pathname.startsWith('/api/')) {
    // Network-first for API calls
    event.respondWith(networkFirst(request));
  } else if (
    url.pathname.match(/\.(jpg|jpeg|png|gif|svg|webp|ico)$/i) ||
    url.pathname.startsWith('/_next/image')
  ) {
    // Stale-while-revalidate for images
    event.respondWith(staleWhileRevalidate(request));
  } else if (
    url.pathname.match(/\.(js|css|woff|woff2|ttf|eot)$/i) ||
    url.pathname.startsWith('/_next/static')
  ) {
    // Cache-first for static assets
    event.respondWith(cacheFirst(request));
  } else if (url.pathname.match(/\.(mp4|webm)$/i)) {
    // Cache-first for videos with range request support
    event.respondWith(cacheFirst(request, true));
  } else {
    // Network-first for pages
    event.respondWith(networkFirst(request));
  }
});

// Network-first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline');
    }
    throw error;
  }
}

// Cache-first strategy
async function cacheFirst(request, supportRangeRequests = false) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline');
    }
    throw error;
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      const cache = caches.open(RUNTIME_CACHE);
      cache.then((c) => c.put(request, networkResponse.clone()));
    }
    return networkResponse;
  }).catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag.startsWith('sync-')) {
    event.waitUntil(syncData(event.tag));
  }
});

async function syncData(tag) {
  try {
    // Get pending sync tasks from IndexedDB or message the client
    // This is a placeholder - actual implementation would depend on your data structure
    console.log('Processing background sync:', tag);
    
    // Notify all clients that sync is complete
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        tag: tag,
      });
    });
  } catch (error) {
    console.error('Background sync failed:', error);
    throw error;
  }
}

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push notification support (for future use)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: '/favicon_google-2.svg',
    badge: '/favicon_web.svg',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
    },
  };

  event.waitUntil(
    self.registration.showNotification('Gossip Club', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
