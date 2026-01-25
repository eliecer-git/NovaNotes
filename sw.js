const CACHE_NAME = 'novastarpro-v13';
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

// El SW ahora solo maneja la instalación y activación para caché de archivos estáticos.
// Las peticiones de red para votos se delegan al navegador para evitar conflictos de CORS en el SW.
