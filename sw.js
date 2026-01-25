const CACHE_NAME = 'novastarpro-v12';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json'
];

// Instalación
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// Activación
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
});

// Peticiones (Estrategia: Primero Red, luego Caché)
self.addEventListener('fetch', (e) => {
    // Ignorar peticiones de API externas para evitar problemas de CORS/Network
    if (e.request.url.includes('api.counterapi.dev') || e.request.url.includes('countapi')) {
        return;
    }

    e.respondWith(
        fetch(e.request).catch(() => {
            return caches.match(e.request);
        })
    );
});
