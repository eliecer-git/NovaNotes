const CACHE_NAME = 'novastarpro-v14';
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

// El SW ahora solo maneja la instalación y activación para caché de archivos estáticos.
