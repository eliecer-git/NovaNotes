const CACHE_NAME = 'novastarpro-v23';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json'
];

self.addEventListener('install', (e) => {
    self.skipWaiting(); // Forzar a que el nuevo SW tome el control
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        Promise.all([
            self.clients.claim(), // Tomar control de las pestañas inmediatamente
            caches.keys().then((keys) => {
                return Promise.all(
                    keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
                );
            })
        ])
    );
});

// Estrategia: Cache First, falling back to network (para assets)
// Estrategia: Network First, falling back to cache (para HTML / navegación)
self.addEventListener('fetch', (e) => {
    // Ignorar peticiones que no sean GET o que sean a esquemas no soportados
    if (e.request.method !== 'GET' || !e.request.url.startsWith('http')) return;

    // Estrategia específica para navegación (HTML): Network First
    // Intentamos red primero para tener siempre la última versión, si falla, caché.
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
                        // Si no hay caché y no hay red, mostrar página offline (si existiera)
                        return caches.match('./index.html');
                    });
                })
        );
        return;
    }

    // Estrategia para recursos estáticos (CSS, JS, Imágenes): Stale-While-Revalidate
    // Sirve del caché inmediatamente, pero actualiza en segundo plano
    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            const fetchPromise = fetch(e.request).then((networkResponse) => {
                // Verificar respuesta válida
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                // Actualizar caché
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(e.request, responseToCache);
                });
                return networkResponse;
            });

            // Devolver caché si existe, sino esperar a la red
            return cachedResponse || fetchPromise;
        })
    );
});
