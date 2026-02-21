const CACHE_NAME = 'novastarpro-v35';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json'
];

// External resources to cache (fonts, libraries)
const EXTERNAL_ASSETS = [
    'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&family=Inter:wght@300;400;600&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Fira+Code:wght@400;500&family=Montserrat:wght@400;700&family=Lora:ital,wght@0,400;1,400;1,700&family=Poppins:wght@300;400;600&family=Merriweather:wght@400;700&family=Ubuntu:wght@400;500&family=Dancing+Script:wght@400;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Cache local assets first (critical)
            return cache.addAll(ASSETS).then(() => {
                // Try to cache external assets (non-blocking)
                return Promise.allSettled(
                    EXTERNAL_ASSETS.map(url =>
                        fetch(url).then(response => {
                            if (response.ok) {
                                return cache.put(url, response);
                            }
                        }).catch(() => {
                            console.log('Could not cache:', url);
                        })
                    )
                );
            });
        })
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then((keys) => {
                return Promise.all(
                    keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
                );
            })
        ])
    );
});

self.addEventListener('fetch', (e) => {
    // Ignore non-GET or non-HTTP requests
    if (e.request.method !== 'GET' || !e.request.url.startsWith('http')) return;

    // Never cache Firebase/API requests - always go to network
    if (e.request.url.includes('googleapis.com/v1') ||
        e.request.url.includes('firestore.googleapis.com') ||
        e.request.url.includes('identitytoolkit') ||
        e.request.url.includes('securetoken') ||
        e.request.url.includes('generativelanguage.googleapis.com')) {
        return;
    }

    // Navigation requests (HTML): Network First
    if (e.request.mode === 'navigate') {
        e.respondWith(
            fetch(e.request)
                .then((response) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(e.request, response.clone());
                        return response;
                    });
                })
                .catch(() => {
                    return caches.match(e.request).then((cachedResponse) => {
                        if (cachedResponse) return cachedResponse;
                        return caches.match('./index.html');
                    });
                })
        );
        return;
    }

    // Google Fonts: Cache First (they rarely change)
    if (e.request.url.includes('fonts.googleapis.com') ||
        e.request.url.includes('fonts.gstatic.com')) {
        e.respondWith(
            caches.match(e.request).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;
                return fetch(e.request).then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
                    }
                    return response;
                }).catch(() => {
                    // If font fails, return nothing (browser will use fallback)
                    return new Response('', { status: 204 });
                });
            })
        );
        return;
    }

    // Static assets: Stale-While-Revalidate
    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            const fetchPromise = fetch(e.request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200) {
                    return networkResponse;
                }
                // Only cache same-origin or CORS responses
                if (networkResponse.type === 'basic' || networkResponse.type === 'cors') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(e.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Network failed, return cache if available
                return cachedResponse;
            });

            return cachedResponse || fetchPromise;
        })
    );
});
