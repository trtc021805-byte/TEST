const CACHE_NAME = 'station-asset-reminder-v1';
const FILES = ['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', event => { event.respondWith(caches.match(event.request).then(resp => resp || fetch(event.request))); });
self.addEventListener('push', event => { const body = event.data ? event.data.text() : '有資產保養項目需要注意'; event.waitUntil(self.registration.showNotification('車站資產提醒', { body, icon:'./icon-192.png' })); });
