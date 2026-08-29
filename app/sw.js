/* 琴琴课表 Service Worker：缓存应用外壳，离线也能开 */
const CACHE = 'qinqin-v6';
const ASSETS = [
  './',
  './index.html',
  './css/app.css',
  './js/app.js',
  './manifest.json',
  './assets/zcool.woff2',
  './assets/icon-180.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/wall_melody.jpg',
  './assets/wall_melody_face.jpg',
  './assets/wall_kitty_tall.jpg',
  './assets/wall_kitty_flower.jpg',
  './assets/wall_kuromi_star.jpg',
  './assets/wall_kuromi_stripe.jpg',
  './assets/wall_kuromi_pixel.jpg',
  './assets/wall_cinnamo.jpg'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).pathname.startsWith('/api/')) return; // 同步 API 永远走网络，绝不缓存
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const cp = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, cp));
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
