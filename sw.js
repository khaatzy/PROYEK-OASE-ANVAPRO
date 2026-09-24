// Service Worker untuk Push Notifikasi OASE Cerita (Mendukung Desktop & Handphone / Mobile PWA)
const CACHE_NAME = 'oase-sw-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listener saat notifikasi diklik pengguna di desktop atau layar notifikasi HP
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/dashboard-user.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Jika tab sudah terbuka, bawa ke fokus
      for (let client of windowClients) {
        if (client.url.includes('ruang-chat.html') || client.url.includes('dashboard-user.html')) {
          return client.focus();
        }
      }
      // Jika belum terbuka, buka window baru
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Listener untuk background push event jika terhubung dengan Web Push Server
self.addEventListener('push', (event) => {
  let data = { title: 'OASE Cerita', body: 'Ada pesan atau pembaruan baru untuk Anda.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'OASE Cerita', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=192&h=192&q=80',
    badge: data.badge || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=96&h=96&q=80',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/dashboard-user.html'
    }
  };

  event.waitUntil(self.registration.showNotification(data.title || 'Notifikasi OASE', options));
});
