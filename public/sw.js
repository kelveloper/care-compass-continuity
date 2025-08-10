/**
 * Service Worker for Healthcare Continuity MVP
 * Implements caching strategies for sub-3-second load times
 */

const CACHE_NAME = 'healthcare-continuity-v1';
const STATIC_CACHE_NAME = 'static-v1';
const DYNAMIC_CACHE_NAME = 'dynamic-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/robots.txt',
  // Add other static assets as needed
];

// API endpoints to cache with different strategies
const API_CACHE_PATTERNS = [
  /\/api\/patients/,
  /\/api\/providers/,
  /\/api\/referrals/,
];

// Supabase endpoints to cache
const SUPABASE_PATTERNS = [
  /supabase\.co.*\/rest\/v1\/patients/,
  /supabase\.co.*\/rest\/v1\/providers/,
  /supabase\.co.*\/rest\/v1\/referrals/,
];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME && 
                cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // Handle different types of requests with appropriate caching strategies
  if (isStaticAsset(request)) {
    // Static assets: Cache First strategy
    event.respondWith(cacheFirst(request, STATIC_CACHE_NAME));
  } else if (isAPIRequest(request)) {
    // API requests: Network First with fallback to cache
    event.respondWith(networkFirstWithCache(request, DYNAMIC_CACHE_NAME));
  } else if (isSupabaseRequest(request)) {
    // Supabase requests: Stale While Revalidate for better performance
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE_NAME));
  } else {
    // Other requests: Network First
    event.respondWith(networkFirst(request, DYNAMIC_CACHE_NAME));
  }
});

// Cache strategies
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('Service Worker: Serving from cache:', request.url);
      return cachedResponse;
    }
    
    console.log('Service Worker: Fetching and caching:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Cache first failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirstWithCache(request, cacheName) {
  try {
    console.log('Service Worker: Network first for:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      console.log('Service Worker: Cached API response:', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache:', request.url);
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('Service Worker: Serving stale API data from cache:', request.url);
      return cachedResponse;
    }
    
    console.error('Service Worker: No cache available for:', request.url);
    return new Response(JSON.stringify({ 
      error: 'Network unavailable and no cached data',
      offline: true 
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Fetch in background to update cache
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      console.log('Service Worker: Updated cache in background:', request.url);
    }
    return networkResponse;
  }).catch((error) => {
    console.log('Service Worker: Background fetch failed:', error);
  });
  
  if (cachedResponse) {
    console.log('Service Worker: Serving stale data while revalidating:', request.url);
    return cachedResponse;
  }
  
  // If no cache, wait for network
  console.log('Service Worker: No cache, waiting for network:', request.url);
  return fetchPromise;
}

async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Offline', { status: 503 });
  }
}

// Helper functions to identify request types
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/) ||
         url.pathname === '/' ||
         url.pathname === '/index.html' ||
         url.pathname.startsWith('/assets/');
}

function isAPIRequest(request) {
  const url = new URL(request.url);
  return API_CACHE_PATTERNS.some(pattern => pattern.test(request.url)) ||
         url.pathname.startsWith('/api/');
}

function isSupabaseRequest(request) {
  return SUPABASE_PATTERNS.some(pattern => pattern.test(request.url));
}

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered:', event.tag);
  
  if (event.tag === 'patient-updates') {
    event.waitUntil(syncPatientUpdates());
  } else if (event.tag === 'referral-updates') {
    event.waitUntil(syncReferralUpdates());
  }
});

async function syncPatientUpdates() {
  try {
    console.log('Service Worker: Syncing patient updates...');
    // Implementation would sync offline patient updates
    // This is a placeholder for the actual sync logic
  } catch (error) {
    console.error('Service Worker: Failed to sync patient updates:', error);
  }
}

async function syncReferralUpdates() {
  try {
    console.log('Service Worker: Syncing referral updates...');
    // Implementation would sync offline referral updates
    // This is a placeholder for the actual sync logic
  } catch (error) {
    console.error('Service Worker: Failed to sync referral updates:', error);
  }
}

// Handle push notifications (if needed in the future)
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: 'New patient update available',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'patient-update',
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'View Dashboard'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Healthcare Continuity', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('Service Worker: Script loaded');